'use strict'

/**
 * @namespace yodaRT
 */

var dbus = require('dbus')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var Url = require('url')

var logger = require('logger')('yoda')

var _ = require('@yoda/util')._
var safeParse = require('@yoda/util').json.safeParse
var AudioManager = require('@yoda/audio').AudioManager
var ota = require('@yoda/ota')
var CloudGW = require('@yoda/cloudgw')
var wifi = require('@yoda/wifi')
var property = require('@yoda/property')
var system = require('@yoda/system')

var dbusConfig = require('../dbus-config.json')

var CloudApi = require('./cloudapi')
var env = require('./env')()
var perf = require('./performance')
var DbusRemoteCall = require('./dbus-remote-call')
var DbusAppExecutor = require('./app/dbus-app-executor')
var Permission = require('./component/permission')
var Custodian = require('./component/custodian')
var AppLoader = require('./component/app-loader')
var Flora = require('./component/flora')
var Keyboard = require('./component/keyboard')
var Lifetime = require('./component/lifetime')
var Wormhole = require('./component/wormhole')

module.exports = AppRuntime
perf.stub('init')

/**
 * @memberof yodaRT
 * @class
 */
function AppRuntime () {
  EventEmitter.call(this)
  this.config = {
    host: env.cloudgw.wss,
    port: 443,
    deviceId: null,
    deviceTypeId: null,
    key: null,
    secret: null
  }

  this.cloudSkillIdStack = []
  this.domain = {
    cut: '',
    scene: '',
    active: ''
  }
  this.prevVolume = -1
  this.micMuted = false // microphone was reset on runtime start up
  this.handle = {}
  this.cloudApi = CloudApi // support cloud api. etc.. login
  this.shouldWelcome = true
  this.forceUpdateAvailable = false

  this.dbusSignalRegistry = new EventEmitter()

  this.custodian = new Custodian(this)
  this.flora = new Flora(this)
  // manager app's permission
  this.permission = new Permission(this)
  // handle keyboard/button events
  this.keyboard = new Keyboard(this)
  // identify load app complete
  this.loadAppComplete = false
  this.loader = new AppLoader(this)
  this.life = new Lifetime(this.loader)
  this.wormhole = new Wormhole(this)
}
inherits(AppRuntime, EventEmitter)

/**
 * Start AppRuntime
 *
 * @param {string[]} paths -
 * @returns {Promise<void>}
 */
AppRuntime.prototype.init = function init (paths) {
  if (this.inited) {
    return Promise.resolve()
  }
  this.flora.init()
  this.flora.turenMute(false)

  this.startDbusAppService()
  this.listenDbusSignals()

  this.keyboard.init()
  this.life.on('stack-reset', () => {
    this.resetCloudStack()
  })
  // initializing the whole process...
  return this.loadApps(paths).then(() => {
    this.custodian.prepareNetwork()
    this.inited = true
  })
}

/**
 * Load applications from the given paths
 * @param {Array} paths - the loaded paths.
 */
AppRuntime.prototype.loadApps = function loadApps (paths) {
  logger.info('start loading applications')
  return this.loader.loadPaths(paths)
    .then(() => {
      this.loadAppComplete = true
      logger.log('load app complete')
      return this.initiate()
    })
}

/**
 * Initiate/Re-initiate runtime configs
 */
AppRuntime.prototype.initiate = function initiate () {
  if (!this.loadAppComplete) {
    return Promise.reject(new Error('Apps not loaded yet, try again later.'))
  }
  return this.openUrl('yoda-skill://volume/init', { preemptive: false })
}

/**
 * Start the daemon apps.
 */
AppRuntime.prototype.startDaemonApps = function startDaemonApps () {
  var self = this
  var daemons = Object.keys(self.loader.executors).map(appId => {
    var executor = self.loader.executors[appId]
    if (!executor.daemon) {
      return
    }
    return appId
  }).filter(it => it)

  return start(0)
  function start (idx) {
    if (idx > daemons.length - 1) {
      return Promise.resolve()
    }
    var appId = daemons[idx]
    logger.info('Starting daemon app', appId)
    return self.life.createApp(appId)
      .then(() => {
        return start(idx + 1)
      }, () => {
        /** ignore error and continue populating */
        return start(idx + 1)
      })
  }
}

/**
 * Reset the appearance includes light and volume.
 * @private
 */
AppRuntime.prototype.resetAppearance = function resetAppearance (options) {
  var unmute = _.get(options, 'unmute')

  clearTimeout(this.handle.setVolume)
  if (this.prevVolume > 0) {
    if (this.prevVolume === AudioManager.getVolume()) {
      AudioManager.setUserLandVolume(this.prevVolume)
    } else {
      /**
       * if volume is changed in picking up voice,
       * delta is applied afterwards to all volume channel.
       */
      var delta = 10 /** current volume */ - AudioManager.getVolume()
      AudioManager.setVolume(this.prevVolume - delta)
    }
    this.prevVolume = -1
  }

  if (unmute && AudioManager.isMuted()) {
    this.openUrl('yoda-skill://volume/unmute', { preemptive: false })
  }

  this.lightMethod('setHide', [''])
}

/**
 * Handle the "voice coming" event.
 * @private
 */
AppRuntime.prototype.handleVoiceComing = function handleVoiceComing (data) {
  if (!this.custodian.isPrepared()) {
    // Do noting when network is not ready
    logger.warn('Network not connected, skip incoming voice')
    return
  }

  var min = 10
  var vol = AudioManager.getVolume()
  if (vol > min) {
    this.prevVolume = vol
    AudioManager.setUserLandVolume(min)
    this.handle.setVolume = setTimeout(() => {
      this.resetAppearance()
    }, process.env.APP_KEEPALIVE_TIMEOUT || 6000)
  }
  this.lightMethod('setAwake', [''])
  if (this.forceUpdateAvailable) {
    logger.info('pending force update, delegates activity to @ota.')
    this.forceUpdateAvailable = false
    ota.getInfoOfPendingUpgrade((err, info) => {
      if (err || info == null) {
        logger.error('failed to fetch pending update info, skip force updates', err && err.stack)
        return
      }
      logger.info('got pending update info', info)
      this.startApp('@ota', { intent: 'force_upgrade', _info: info }, {})
    })
  }
}

/**
 * Handle the "voice local awake" event.
 * @private
 */
AppRuntime.prototype.handleVoiceLocalAwake = function handleVoiceLocalAwake (data) {
  if (this.custodian.isConfiguringNetwork()) {
    // start @network app if not logged in yet
    return this.startApp('@network', {
      intent: 'user_says'
    }, {})
  }
  if (this.custodian.isNetworkUnavailable()) {
    // guide the user to double-click the button
    logger.warn('Device is initiated, yet disconnected from network. Network may be re-configured.')
    return this.lightMethod('appSound', ['@Yoda', '/opt/media/wifi/network_disconnected.ogg'])
  }
  return this.lightMethod('setDegree', ['', '' + (data.sl || 0)])
}

/**
 * Handle the "asr end" event.
 * @private
 */
AppRuntime.prototype.handleAsrEnd = function handleAsrEnd () {
  this.lightMethod('setLoading', [''])
}

/**
 * Handle the "asr fake" event.
 * @private
 */
AppRuntime.prototype.handleAsrFake = function handleAsrFake () {
  logger.info('asr fake')
  this.resetAppearance()
}

/**
 * Handle the "nlp" event.
 * @private
 */
AppRuntime.prototype.handleNlpResult = function handleNlpResult (data) {
  clearTimeout(this.handle.setVolume)
  this.onVoiceCommand(data.asr, data.nlp, data.action)
}

/**
 * Handle cloud events.
 * @private
 */
AppRuntime.prototype.handleCloudEvent = function handleCloudEvent (data) {
  logger.log('cloud event', data)
  this.sendNLPToApp('@network', {
    intent: 'cloud_status'
  }, {
    code: data.code,
    msg: data.msg
  })
}

/**
 * Handle power button activation.
 * - if not connected to network yet, disable bluetooth broadcast.
 * - if there are apps actively running, terminates all apps.
 * - otherwise set device actively pickup.
 */
AppRuntime.prototype.handlePowerActivation = function handlePowerActivation () {
  if (this.custodian.isConfiguringNetwork()) {
    // start @network app if network is not connected
    return this.sendNLPToApp('@network', {
      intent: 'into_sleep'
    }, {})
  }

  if (this.life.getCurrentAppId()) {
    /** exit all app if there is apps actively running */
    return this.destroyAll({ force: false })
  }

  return this.setPickup(true)
}

/**
 * Reset network and start procedure of configuring network.
 */
AppRuntime.prototype.resetNetwork = function resetNetwork () {
  return this.custodian.resetNetwork()
}

/**
 * 接收turen的speech事件
 * @param {string} name
 * @param {object} data
 * @private
 */
AppRuntime.prototype.onTurenEvent = function (name, data) {
  if (this.micMuted) {
    logger.error('Mic muted, unexpected event from Turen:', name)
    return
  }
  var handler = null
  switch (name) {
    case 'voice coming':
      handler = this.handleVoiceComing
      break
    case 'voice local awake':
      handler = this.handleVoiceLocalAwake
      break
    case 'asr end':
      handler = this.handleAsrEnd
      break
    case 'asr fake':
      handler = this.handleAsrFake
      break
    case 'nlp':
      handler = this.handleNlpResult
      break
  }
  if (typeof handler !== 'function') {
    logger.info(`skip event "${name}", because no handler`)
  } else {
    handler.call(this, data)
  }
}

/**
 * Start a session of monologue. In session of monologue, no other apps could preempt top of stack.
 *
 * Note that monologues automatically ends on unexpected exit of apps.
 *
 * @param {string} appId
 */
AppRuntime.prototype.startMonologue = function (appId) {
  if (appId !== this.life.getCurrentAppId()) {
    return Promise.reject(new Error(`App ${appId} is not currently on top of stack.`))
  }
  this.life.monopolist = appId
  return Promise.resolve()
}

/**
 * Stop a session of monologue started previously.
 *
 * @param {string} appId
 */
AppRuntime.prototype.stopMonologue = function (appId) {
  if (this.life.monopolist === appId) {
    this.life.monopolist = null
  }
  return Promise.resolve()
}

/**
 * 解析服务端返回的NLP，并执行App生命周期
 * @private
 * @param {string} asr 语音识别后的文字
 * @param {object} nlp 服务端返回的NLP
 * @param {object} action 服务端返回的action
 * @param {object} [options]
 * @param {boolean} [options.preemptive]
 * @param {boolean} [options.carrierId]
 */
AppRuntime.prototype.onVoiceCommand = function (asr, nlp, action, options) {
  var preemptive = _.get(options, 'preemptive', true)
  var carrierId = _.get(options, 'carrierId')

  if (_.get(nlp, 'appId') == null) {
    logger.log('invalid nlp/action, ignore')
    return Promise.resolve()
  }
  var form = _.get(action, 'response.action.form')

  var appId
  if (nlp.cloud) {
    appId = '@yoda/cloudappclient'
  } else {
    appId = this.loader.getAppIdBySkillId(nlp.appId)
  }
  if (appId == null) {
    logger.log(`Local app '${nlp.appId}' not found.`)
    return Promise.resolve()
  }

  var future = Promise.resolve()
  var prevId = this.life.getCurrentAppId()
  if (prevId) {
    future = Promise.all([
      this.ttsMethod('stop', [ prevId ]),
      this.multimediaMethod('pause', [ prevId ])
    ])
  }

  return future
    .then(() => {
      this.resetAppearance({ unmute: true })
      return this.life.createApp(appId)
    })
    .then(() => {
      if (!preemptive) {
        logger.info(`app is not preemptive, skip activating app ${appId}`)
        return
      }

      logger.info(`app is preemptive, activating app ${appId}`)
      this.updateCloudStack(nlp.appId, form)
      return this.life.activateAppById(appId, form, carrierId)
    })
    .then(() => {
      return this.life.onLifeCycle(appId, 'request', [ nlp, action ])
    })
    .catch((error) => {
      logger.error(`create app error with appId: ${appId}`, error)
      return this.life.destroyAppById(appId, { force: true })
    })
}

/**
 *
 * > Note: currently only `yoda-skill:` scheme is supported.
 *
 * @param {string} url -
 * @param {object} [options] -
 * @param {'cut' | 'scene'} [options.form='cut'] -
 * @param {boolean} [options.preemptive=true] -
 * @param {string} [options.carrierId] -
 * @returns {Promise<boolean>}
 */
AppRuntime.prototype.openUrl = function (url, options) {
  var form = _.get(options, 'form', 'cut')
  var preemptive = _.get(options, 'preemptive', true)
  var carrierId = _.get(options, 'carrierId')

  var urlObj = Url.parse(url)
  if (urlObj.protocol !== 'yoda-skill:') {
    logger.info('Url protocol other than yoda-skill is not supported now.')
    return Promise.resolve(false)
  }
  var skillId = this.loader.getSkillIdByHost(urlObj.hostname)
  if (skillId == null) {
    logger.info(`No app registered for skill host '${urlObj.hostname}'.`)
    return Promise.resolve(false)
  }
  var appId = this.loader.getAppIdBySkillId(skillId)

  return this.life.createApp(appId)
    .then(() => {
      if (!preemptive) {
        logger.info(`app is not preemptive, skip activating app ${appId}`)
        return Promise.resolve()
      }

      logger.info(`app is preemptive, activating app ${appId}`)
      this.updateCloudStack(skillId, form)
      return this.life.activateAppById(appId, form, carrierId)
    })
    .then(() => this.life.onLifeCycle(appId, 'url', [ urlObj ]))
    .then(() => true)
    .catch((error) => {
      logger.error(`open url error with appId: ${appId}`, error)
      return this.life.destroyAppById(appId, { force: true })
    })
}

/**
 *
 * @param {string} appId -
 * @param {object} [options]
 * @param {'cut' | 'scene'} [options.form='cut'] - running form of the activity.
 * @param {string} [options.skillId] - update cloud skill stack if specified.
 */
AppRuntime.prototype.setForegroundById = function setForegroundById (appId, options) {
  var skillId = _.get(options, 'skillId')
  var form = _.get(options, 'form', 'cut')
  if (skillId) {
    if (this.loader.getAppIdBySkillId(skillId) !== appId) {
      return Promise.reject(new Error(`skill id '${skillId}' not owned by app ${appId}.`))
    }
    this.updateCloudStack(skillId, form)
  }
  return this.life.setForegroundById(appId, form)
}

/**
 *
 * @param {boolean} [mute] - set mic to mute, switch mute if not given.
 */
AppRuntime.prototype.setMicMute = function setMicMute (mute) {
  if (mute === this.micMuted) {
    return Promise.resolve()
  }
  /** mute */
  var muted = !this.micMuted
  this.micMuted = muted
  this.flora.turenMute(muted)
  if (muted) {
    return this.openUrl('yoda-skill://volume/mic_mute_effect', { preemptive: false })
      .then(() => muted)
  }
  return this.openUrl('yoda-skill://volume/mic_unmute_effect', { preemptive: false })
    .then(() => muted)
}

/**
 * 给所有App发送destroy事件，销毁所有App
 * @private
 * @param {object} [options]
 * @param {object} [options.force=true]
 * @param {boolean} [options.resetServices=true]
 * @returns {Promise<void>}
 */
AppRuntime.prototype.destroyAll = function (options) {
  var force = _.get(options, 'force', true)
  var resetServices = _.get(options, 'resetServices', true)

  var promises = []

  /**
   * Destroy all apps, then restart daemon apps
   */
  promises.push(this.life.destroyAll({ force: force })
    .then(() => this.startDaemonApps()))
  // deleting the running app
  this.cloudSkillIdStack = []
  // this.resetCloudStack()

  if (!resetServices) {
    return Promise.all(promises)
  }

  // reset service
  promises = promises.concat([
    this.lightMethod('reset', [])
      .then((res) => {
        if (res && res[0] === true) {
          logger.log('reset lightd success')
        } else {
          logger.log('reset lightd failed')
        }
      })
      .catch((error) => {
        logger.log('reset lightd error', error)
      }),
    this.multimediaMethod('reset', [])
      .then((res) => {
        if (res && res[0] === true) {
          logger.log('reset multimediad success')
        } else {
          logger.log('reset multimediad failed')
        }
      })
      .catch((error) => {
        logger.log('reset multimediad error', error)
      }),
    this.ttsMethod('reset', [])
      .then((res) => {
        if (res && res[0] === true) {
          logger.log('reset ttsd success')
        } else {
          logger.log('reset ttsd failed')
        }
      })
      .catch((error) => {
        logger.log('reset ttsd error', error)
      })
  ])

  return Promise.all(promises)
}

/**
 *
 * 更新App stack
 * @private
 * @param {string} skillId -
 * @param {'cut' | 'scene'} form -
 * @param {object} [options] -
 * @param {boolean} [options.isActive] - if update currently active skillId
 */
AppRuntime.prototype.updateCloudStack = function (skillId, form, options) {
  var isActive = _.get(options, 'isActive', true)
  if (isActive) {
    this.domain.active = skillId
  }

  if (form === 'cut') {
    this.domain.cut = skillId
  } else if (form === 'scene') {
    this.domain.scene = skillId
  }
  var ids = [this.domain.scene, this.domain.cut].map(it => {
    /**
     * Exclude local convenience app from cloud skill stack
     */
    if (_.startsWith(it, '@')) {
      return ''
    }
    /**
     * Exclude apps from cloud skill stack
     * - composition-de-voix
     */
    if (['RB0BF7E9D7F84B2BB4A1C2990A1EF8F5'].indexOf(it) >= 0) {
      return ''
    }
    return it
  })
  var stack = ids.join(':')
  this.flora.updateStack(stack)
}

AppRuntime.prototype.resetCloudStack = function () {
  this.domain.cut = ''
  this.domain.scene = ''
  this.domain.active = ''
  this.flora.updateStack(this.domain.scene + ':' + this.domain.cut)
}

/**
 * 调用speech的pickup
 * @param {boolean} isPickup
 * @private
 */
AppRuntime.prototype.setPickup = function (isPickup, duration) {
  this.flora.turenPickup(isPickup)
  if (isPickup !== true) {
    return Promise.resolve()
  }
  return this.lightMethod('setPickup', ['' + (duration || 6000)])
}

AppRuntime.prototype.setConfirm = function (appId, intent, slot, options, attrs) {
  var currAppId = this.life.getCurrentAppId()
  if (currAppId !== appId) {
    return Promise.reject(new Error(`App is not currently active app, active app: ${currAppId}.`))
  }
  return new Promise((resolve, reject) => {
    this.cloudApi.sendConfirm(this.domain.active, intent, slot, options, attrs, (error) => {
      if (error) {
        return reject(error)
      }
      resolve()
    })
  }).then(() => this.setPickup(true))
}

/**
 *
 * @param {string} appId -
 * @param {object} [options] -
 * @param {boolean} [options.clearContext] - also clears contexts
 */
AppRuntime.prototype.exitAppById = function exitAppById (appId, options) {
  var clearContext = _.get(options, 'clearContext', false)
  if (clearContext) {
    if (appId === this.loader.getAppIdBySkillId(this.domain.scene)) {
      this.updateCloudStack('', 'scene', { isActive: false })
    }
    if (appId === this.loader.getAppIdBySkillId(this.domain.cut)) {
      this.updateCloudStack('', 'cut', { isActive: false })
    }
  }
  return this.life.deactivateAppById(appId)
}

/**
 * 通过dbus注册extapp
 * @param {string} appId extapp的AppID
 * @param {object} profile extapp的profile
 * @private
 */
AppRuntime.prototype.registerDbusApp = function (appId, objectPath, ifaceName) {
  logger.log('register dbus app with id: ', appId)
  var executor = new DbusAppExecutor(objectPath, ifaceName, appId, this)
  try {
    this.loader.setExecutorForAppId(appId, executor, {
      skills: [ appId ],
      permission: ['ACCESS_TTS', 'ACCESS_MULTIMEDIA']
    })
  } catch (err) {
    if (_.startsWith(err.message, 'AppId exists')) {
      return
    }
    throw err
  }
}

/**
 * 删除extapp
 * @param {string} appId
 * @private
 */
AppRuntime.prototype.deleteDbusApp = function (appId) {

}

/**
 * mock nlp response
 * @param {object} nlp
 * @param {object} action
 * @private
 */
AppRuntime.prototype.mockNLPResponse = function (nlp, action) {
  var appId = nlp.cloud ? '@yoda/cloudappclient' : nlp.appId
  if (appId === this.life.getCurrentAppId()) {
    this.life.onLifeCycle(appId, 'request', [ nlp, action ])
  }
}

/**
 * sync cloudappclient appid stack
 * @param {Array} stack appid stack
 * @private
 */

AppRuntime.prototype.syncCloudAppIdStack = function (stack) {
  this.cloudSkillIdStack = stack || []
  logger.log('cloudStack', this.cloudSkillIdStack)
  return Promise.resolve()
}

/**
 *
 * @param {string} skillId
 * @param {object} nlp
 * @param {object} action
 * @param {object} [options]
 * @param {boolean} [options.preemptive]
 */
AppRuntime.prototype.startApp = function (skillId, nlp, action, options) {
  nlp.cloud = false
  nlp.appId = skillId
  action = {
    appId: skillId,
    startWithActiveWord: false,
    response: {
      action: action || {}
    }
  }
  action.response.action.appId = skillId
  action.response.action.form = 'cut'
  return this.onVoiceCommand('', nlp, action, options)
}

/**
 * @private
 */
AppRuntime.prototype.sendNLPToApp = function (skillId, nlp, action) {
  var curAppId = this.life.getCurrentAppId()
  var appId = this.loader.getAppIdBySkillId(skillId)
  if (curAppId === appId) {
    nlp.cloud = false
    nlp.appId = skillId
    action = {
      appId: skillId,
      startWithActiveWord: false,
      response: {
        action: action || {}
      }
    }
    action.response.action.appId = skillId
    action.response.action.form = 'cut'
    this.life.onLifeCycle(appId, 'request', [nlp, action])
  } else {
    logger.log(`send NLP to App failed, AppId ${appId} not in active, active app: ${curAppId}`)
  }
}

/**
 * 处理App发送过来的模拟NLP
 * @param {string} message
 * @private
 */
AppRuntime.prototype.onCloudForward = function (message) {
  try {
    var msg = JSON.parse(message)
    var params = JSON.parse(msg.content.params)
    // 模拟nlp
    this.onVoiceCommand('', params.nlp, params.action)
  } catch (err) {
    logger.error(err && err.stack)
  }
}

/**
 * handle mqtt forward message
 * @param {string} message string receive from mqtt
 */
AppRuntime.prototype.onForward = function (message) {
  var data = {}
  try {
    data = JSON.parse(message)
  } catch (error) {
    data = {}
    logger.debug('parse mqtt forward message error: message -> ', message)
    return
  }

  var mockNlp = {
    cloud: false,
    intent: 'RokidAppChannelForward',
    forwardContent: data.content,
    getInfos: data.getInfos,
    appId: data.appId || data.domain
  }
  var mockAction = {
    appId: data.appId || data.domain,
    version: '2.0.0',
    startWithActiveWord: false,
    response: {
      action: {
        appId: data.appId || data.domain,
        form: 'cut'
      }
    }
  }
  this.onVoiceCommand('', mockNlp, mockAction)
}

/**
 * handle mqtt unbind topic
 * @param {string} message string receive from mqtt
 */
AppRuntime.prototype.unBindDevice = function (message) {
  this.cloudApi.unBindDevice()
    .then(() => {
      property.set('persist.system.user.userId', '')
      /**
       * reset should welcome so that welcome effect could be played on re-login
       */
      this.shouldWelcome = true
      logger.info('unbind device success')
      return this.custodian.resetNetwork()
    })
    .catch((err) => {
      logger.error('unbind device error', err)
    })
}

/**
 * 处理App发送的恢复出厂设置
 * @param {string} message
 * @private
 */
AppRuntime.prototype.onResetSettings = function (message) {
  if (this.cloudApi == null) {
    return Promise.reject(new Error('CloudApi not ready.'))
  }

  var CloudGw = require('@yoda/cloudgw')
  var opts = this.onGetPropAll()
  var cloudgw = new CloudGw(opts)
  this.cloudApi.resetSettings(cloudgw).then(() => {
    logger.info('system is already reset')
    system.setRecoveryMode()
    process.nextTick(system.reboot)
  })
}

/**
 *  处理App发送的自定义配置，包括自定义激活词、夜间模式、唤醒音效开关、待机灯光开关、连续对话开关
 * @param {string} message
 * @private
 */
AppRuntime.prototype.onCustomConfig = function (message) {
  var appendUrl = (pathname, params) => {
    var url = `yoda-skill://custom-config/${pathname}?`
    var queryString = (params) => {
      var query = ''
      for (var key in params) {
        var value = params[key]
        query += `&${key}=${value}`
      }
      url += query
      return url
    }
    return queryString(params)
  }
  var msg = null
  try {
    if (typeof message === 'object') {
      msg = message
    } else if (typeof message === 'string') {
      msg = JSON.parse(message)
    }
  } catch (err) {
    logger.error(err)
    return
  }
  var option = {
    preemptive: true,
    form: 'cut'
  }
  if (msg.nightMode) {
    option.preemptive = false
    this.openUrl(appendUrl('nightMode', msg.nightMode), option)
  } else if (msg.vt_words) {
    option.preemptive = false
    this.openUrl(appendUrl('vt_words', msg.vt_words), option)
  } else if (msg.continuousDialog) {
    this.openUrl(appendUrl('continuousDialog', msg.continuousDialog), option)
  } else if (msg.wakeupSoundEffects) {
    this.openUrl(appendUrl('wakeupSoundEffects', msg.wakeupSoundEffects), option)
  } else if (msg.standbyLight) {
    this.openUrl(appendUrl('standbyLight', msg.standbyLight), option)
  }
}

/**
 * @private
 */
AppRuntime.prototype.onLoadCustomConfig = function (config) {
  if (config === undefined) {
    return
  }
  var customConfig = safeParse(config)
  if (_.get(customConfig, 'vt_words')) {
    // TODO(suchenglong) should inset vt word for first load from server
  }
  if (_.get(customConfig, 'continuousDialog')) {
    var continuousDialogObj = customConfig.continuousDialog
    var continueObj = safeParse(continuousDialogObj)
    if (continueObj) {
      continueObj.isFirstLoad = true
      var continuousDialog = {
        continuousDialog: continueObj
      }
      this.onCustomConfig(continuousDialog)
    }
  }
  if (_.get(customConfig, 'standbyLight')) {
    var standbyLightText = customConfig.standbyLight
    var standbyLightObj = safeParse(standbyLightText)
    if (standbyLightObj) {
      standbyLightObj.isFirstLoad = true
      var standbyLight = {
        standbyLight: standbyLightObj
      }
      this.onCustomConfig(standbyLight)
    }
  }

  if (_.get(customConfig, 'wakeupSoundEffects')) {
    var wakeupSoundEffectsText = customConfig.wakeupSoundEffects
    var wakeupSoundEffectsObj = safeParse(wakeupSoundEffectsText)
    if (wakeupSoundEffectsObj) {
      wakeupSoundEffectsObj.isFirstLoad = true
      var wakeupSoundEffects = {
        wakeupSoundEffects: wakeupSoundEffectsObj
      }
      this.onCustomConfig(wakeupSoundEffects)
    }
  }

  if (_.get(customConfig, 'nightMode')) {
    var nightModeText = customConfig.nightMode
    var nightModeObj = safeParse(nightModeText)
    if (nightModeObj) {
      nightModeObj.isFirstLoad = true
      var nightMode = {
        nightMode: nightModeObj
      }
      this.onCustomConfig(nightMode)
    }
  }
}

/**
 * @private
 */
AppRuntime.prototype.lightMethod = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('')
    this.service._dbus.callMethod(
      'com.service.light',
      '/rokid/light',
      'com.rokid.light.key',
      name, sig, args, resolve)
  })
}

/**
 * @private
 */
AppRuntime.prototype.ttsMethod = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('')
    this.service._dbus.callMethod(
      'com.service.tts',
      '/tts/service',
      'tts.service',
      name, sig, args, resolve)
  })
}

AppRuntime.prototype.multimediaMethod = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('')
    this.service._dbus.callMethod(
      'com.service.multimedia',
      '/multimedia/service',
      'multimedia.service',
      name, sig, args, resolve)
  })
}

AppRuntime.prototype.listenDbusSignals = function () {
  var self = this
  var proxy = new DbusRemoteCall(this.service._bus)
  var ttsEvents = {
    'ttsdevent': function onTtsEvent (msg) {
      var channel = `callback:tts:${_.get(msg, 'args.0')}`
      EventEmitter.prototype.emit.apply(
        self.dbusSignalRegistry,
        [ channel ].concat(msg.args.slice(1))
      )
    }
  }
  proxy.listen(
    'com.service.tts',
    '/tts/service',
    'tts.service',
    function onTtsEvent (msg) {
      var handler = ttsEvents[msg && msg.name]
      if (handler == null) {
        logger.warn(`Unknown ttsd event type '${msg && msg.name}'.`)
        return
      }
      handler(msg)
    }
  )

  var multimediaEvents = {
    'multimediadevent': function onMultimediaEvent (msg) {
      var channel = `callback:multimedia:${_.get(msg, 'args.0')}`
      EventEmitter.prototype.emit.apply(
        self.dbusSignalRegistry,
        [ channel ].concat(msg.args.slice(1))
      )
    }
  }
  proxy.listen(
    'com.service.multimedia',
    '/multimedia/service',
    'multimedia.service',
    function onMultimediaEvent (msg) {
      var handler = multimediaEvents[msg && msg.name]
      if (handler == null) {
        logger.warn(`Unknown multimediad event type '${msg && msg.name}'.`)
        return
      }
      handler(msg)
    }
  )
}

/**
 * @private
 */
AppRuntime.prototype.onGetPropAll = function () {
  return {}
}

/**
 * @private
 */
AppRuntime.prototype.reconnect = function () {
  wifi.resetDns()
  this.lightMethod('setConfigFree', ['system'])

  logger.log('yoda reconnecting')

  // login -> mqtt
  this.cloudApi.connect((code, msg) => {
    this.handleCloudEvent({
      code: code,
      msg: msg
    })
  }).then((mqttAgent) => {
    // load the system configuration
    var config = mqttAgent.config
    var options = {
      uri: env.speechUri,
      key: config.key,
      secret: config.secret,
      deviceTypeId: config.deviceTypeId,
      deviceId: config.deviceId
    }
    var cloudgw = new CloudGW(options)
    require('@yoda/ota/network').cloudgw = cloudgw
    this.cloudApi.updateBasicInfo(cloudgw)
      .catch(err => {
        logger.error('Unexpected error on updating basic info', err.stack)
      })
    this.flora.updateSpeechPrepareOptions(options)

    // implementation interface
    var props = Object.assign({}, config, {
      masterId: property.get('persist.system.user.userId')
    })
    this.onGetPropAll = () => props
    this.onLoggedIn()
    this.wormhole.init(mqttAgent)
    this.onLoadCustomConfig(_.get(config, 'extraInfo.custom_config', ''))
  }).catch((err) => {
    logger.error('initializing occurs error', err && err.stack)
  })
}

/**
 * @private
 */
AppRuntime.prototype.onLoggedIn = function () {
  this.custodian.onLoggedIn()

  var deferred = () => {
    perf.stub('started')
    // not need to play startup music after relogin
    if (this.shouldWelcome) {
      this.shouldWelcome = false
      logger.info('announce welcome')
      this.lightMethod('setWelcome', [])
    }

    var config = JSON.stringify(this.onGetPropAll())
    return this.ttsMethod('connect', [config])
      .then((res) => {
        if (!res) {
          logger.log('send CONFIG to ttsd ignore: ttsd service may not start')
        } else {
          logger.log(`send CONFIG to ttsd: ${res && res[0]}`)
        }
      })
      .catch((error) => {
        logger.log('send CONFIG to ttsd failed: call method failed', error)
      })
  }

  var sendReady = () => {
    var ids = this.loader.getAppIds()
      .filter(id => this.loader.getAppById(id) != null)
    return Promise.all(ids.map(it => this.life.onLifeCycle(it, 'ready')))
  }

  return Promise.all([
    this.startDaemonApps()
      .then(sendReady, err => {
        logger.error('Unexpected error on starting daemon apps', err.stack)
        return sendReady()
      }).catch(err => logger.error('Unexpected error on destroying all apps', err.stack)),
    this.initiate()
      .then(deferred, err => {
        logger.error('Unexpected error on runtime.initiate', err.stack)
        return deferred()
      })
  ])
}

/**
 *
 * @param {string} text -
 * @returns {Promise<object[]>}
 */
AppRuntime.prototype.mockAsr = function mockAsr (text) {
  logger.info('Mocking asr', text)
  return new Promise((resolve, reject) => {
    this.flora.getNlpResult(text, (err, nlp, action) => {
      if (err) {
        return reject(err)
      }
      resolve([nlp, action])
    })
  }).then(res => {
    logger.info('mocking asr got nlp result for', text, res[0], res[1])
    return this.onVoiceCommand(text, res[0], res[1])
      .then(() => res)
  })
}

/**
 * 启动extApp dbus接口
 * @private
 */
AppRuntime.prototype.startDbusAppService = function () {
  var self = this
  var service = dbus.registerService('session', dbusConfig.service)
  this.service = service

  function createInterface (name) {
    var object = service.createObject(dbusConfig[name].objectPath)
    return object.createInterface(dbusConfig[name].interface)
  }
  /**
   * Create extapp service
   */
  var extapp = createInterface('extapp')
  extapp.addMethod('register', {
    in: ['s', 's', 's'],
    out: ['b']
  }, function (appId, objectPath, ifaceName, cb) {
    logger.info('dbus registering app', appId, objectPath, ifaceName)
    if (!self.custodian.isPrepared()) {
      /** prevent app to invoke runtime methods if runtime is not logged in yet */
      return cb(null, false)
    }
    try {
      self.registerDbusApp(appId, objectPath, ifaceName)
    } catch (err) {
      logger.error('Unexpected error on registering dbus app', appId, err && err.stack)
      return cb(null, false)
    }
    cb(null, true)
  })
  extapp.addMethod('destroy', {
    in: ['s'],
    out: []
  }, function (appId, cb) {
    self.deleteDbusApp(appId)
    cb(null)
  })
  extapp.addMethod('start', {
    in: ['s'],
    out: []
  }, function (appId, cb) {
    cb(null)
  })
  extapp.addMethod('setPickup', {
    in: ['s', 's', 's'],
    out: []
  }, function (appId, isPickup, duration, cb) {
    if (appId !== self.life.getCurrentAppId()) {
      logger.log('set pickup permission deny')
      cb(null)
    } else {
      self.setPickup(isPickup === 'true', +duration)
      cb(null)
    }
  })
  extapp.addMethod('setConfirm', {
    in: ['s', 's', 's', 's', 's'],
    out: ['b']
  }, function (appId, intent, slot, options, attrs, cb) {
    try {
      options = JSON.parse(options)
      attrs = JSON.parse(attrs)
    } catch (error) {
      logger.log('setConfirm Error: ', error)
      cb(null, false)
      return
    }
    self.setConfirm(appId, intent, slot, options, attrs)
      .then(
        () => cb(null, true),
        (err) => {
          logger.log(err)
          cb(null, false)
        }
      )
  })
  extapp.addMethod('exit', {
    in: ['s'],
    out: []
  }, function (appId, cb) {
    if (appId !== self.life.getCurrentAppId()) {
      logger.log('exit app permission deny')
      cb(null)
    } else {
      self.life.deactivateAppById(appId, { force: true })
      cb(null)
    }
  })
  extapp.addMethod('destroyAll', {
    in: [],
    out: ['b']
  }, function (cb) {
    self.destroyAll()
    cb(null, true)
  })
  extapp.addMethod('mockNLPResponse', {
    in: ['s', 's', 's'],
    out: []
  }, function (appId, nlp, action, cb) {
    cb(null)
    try {
      nlp = JSON.parse(nlp)
      action = JSON.parse(action)
    } catch (error) {
      logger.log('mockNLPResponse, invalid nlp or action')
      return
    }
    self.mockNLPResponse(nlp, action)
  })
  extapp.addMethod('mockAsr', {
    in: ['s'],
    out: ['s']
  }, function mockAsr (text, cb) {
    self.mockAsr(text)
      .then(
        res => cb(null, JSON.stringify({ ok: true, nlp: res[0], action: res[1] })),
        err => cb(null, JSON.stringify({ ok: false, message: err.message, stack: err.stack }))
      )
  })
  extapp.addMethod('setBackground', {
    in: ['s'],
    out: ['b']
  }, function (appId, cb) {
    if (appId) {
      var result = self.life.setBackgroundById(appId)
      cb(null, result)
    } else {
      cb(null, false)
    }
  })
  extapp.addMethod('setForeground', {
    in: ['s'],
    out: ['b']
  }, function (appId, cb) {
    if (appId) {
      var result = self.life.setForegroundById(appId)
      cb(null, result)
    } else {
      cb(null, false)
    }
  })
  extapp.addMethod('syncCloudAppIdStack', {
    in: ['s'],
    out: ['b']
  }, function (stack, cb) {
    self.syncCloudAppIdStack(JSON.parse(stack || '[]'))
    cb(null, true)
  })
  extapp.addMethod('tts', {
    in: ['s', 's'],
    out: ['s']
  }, function (appId, text, cb) {
    if (self.loader.getExecutorByAppId(appId) == null) {
      return cb(null, '-1')
    }
    var permit = self.permission.check(appId, 'ACCESS_TTS')
    if (permit) {
      self.ttsMethod('speak', [appId, text])
        .then((res) => {
          var ttsId = res[0]
          cb(null, ttsId)
          var channel = `callback:tts:${ttsId}`
          var app = self.apps[appId]
          if (ttsId !== '-1') {
            self.dbusSignalRegistry.once(channel, function () {
              self.service._dbus.emitSignal(
                app.objectPath,
                app.ifaceName,
                'onTtsComplete',
                's',
                [ttsId]
              )
            })
          }
        })
    } else {
      cb(null, '-1')
    }
  })

  /**
   * Create prop service
   */
  var prop = createInterface('prop')
  prop.addMethod('all', {
    in: ['s'],
    out: ['s']
  }, function (appId, cb) {
    var config = self.onGetPropAll()
    cb(null, JSON.stringify(config))
  })

  /**
   * Create permission service
   */
  var permission = createInterface('permission')
  permission.addMethod('check', {
    in: ['s', 's'],
    out: ['s']
  }, function (appId, name, cb) {
    var permit = self.permission.check(appId, name)
    logger.log('vui.permit', permit, appId, name)
    if (permit) {
      cb(null, 'true')
    } else {
      cb(null, 'false')
    }
  })

  /**
   * Create amsexport service
   */
  var amsexport = createInterface('amsexport')
  amsexport.addMethod('ReportSysStatus', {
    in: ['s'],
    out: ['b']
  }, function (status, cb) {
    if (this.loadAppComplete === false) {
      // waiting for the app load complete
      return cb(null, false)
    }
    try {
      var data = JSON.parse(status)
      if (data.upgrade === true) {
        self.startApp('@upgrade', {}, {})
      } else if (data['Wifi'] === false || data['Network'] === false) {
        self.custodian.onNetworkDisconnect()
      } else if (data['Network'] === true) {
        self.custodian.onNetworkConnect()
      } else if (data['msg']) {
        self.sendNLPToApp('@network', {
          intent: 'wifi_status'
        }, {
          status: data['msg'],
          value: data['data']
        })
      }
      cb(null, true)
    } catch (err) {
      logger.error(err && err.stack)
      cb(null, false)
    }
  })
  amsexport.addMethod('SetTesting', {
    in: ['s'],
    out: ['b']
  }, function (testing, cb) {
    logger.log('set testing' + testing)
    cb(null, true)
  })
  amsexport.addMethod('SendIntentRequest', {
    in: ['s', 's', 's'],
    out: ['b']
  }, function (asr, nlp, action, cb) {
    console.log('sendintent', asr, nlp, action)
    self.onTurenEvent('nlp', {
      asr: asr,
      nlp: nlp,
      action: action
    })
    cb(null, true)
  })
  amsexport.addMethod('Reload', {
    in: [],
    out: ['b']
  }, function (cb) {
    cb(null, true)
  })
  amsexport.addMethod('Ping', {
    in: [],
    out: ['b']
  }, function (cb) {
    logger.log('YodaOS is alive')
    cb(null, true)
  })
  amsexport.addMethod('ForceUpdateAvailable', {
    in: [],
    out: []
  }, function (cb) {
    logger.info('force update available, waiting for incoming voice')
    self.forceUpdateAvailable = true
    cb(null)
  })
}

AppRuntime.prototype.destruct = function destruct () {
  this.keyboard.destruct()
  this.flora.destruct()
}
