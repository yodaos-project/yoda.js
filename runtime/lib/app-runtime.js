'use strict'

/**
 * @namespace yodaRT
 */

var dbus = require('dbus')
var EventEmitter = require('events').EventEmitter
var AudioManager = require('@yoda/audio').AudioManager
var inherits = require('util').inherits
var Url = require('url')

var _ = require('@yoda/util')._
var logger = require('logger')('yoda')
var ota = require('@yoda/ota')
var wifi = require('@yoda/wifi')
var floraFactory = require('@yoda/flora')

var env = require('./env')()
var perf = require('./performance')
var dbusConfig = require('../dbus-config.json')
var floraConfig = require('../flora-config.json')
var DbusRemoteCall = require('./dbus-remote-call')
var DbusAppExecutor = require('./app/dbus-app-executor')
var Permission = require('./component/permission')
var AppLoader = require('./component/app-loader')
var Keyboard = require('./component/keyboard')
var Lifetime = require('./component/lifetime')

var floraClient
var asr2nlpId = 'js-AppRuntime'
var floraCallbacks = []
var asr2nlpSeq = 0

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
  this.volume = null
  this.prevVolume = -1
  this.micMuted = false // microphone was reset on runtime start up
  this.handle = {}
  this.cloudApi = null // support cloud api. etc.. login
  this.online = undefined // to identify the first start
  this.login = undefined // to identify is login or not
  this.waitingForAwake = undefined // to identify network switch from connected to disconnected
  this.micMuted = false
  this.forceUpdateAvailable = false
  this.voiceCtx = {
    lastFaked: false
  }

  this.dbusSignalRegistry = new EventEmitter()

  // manager app's permission
  this.permission = new Permission(this)
  // handle keyboard/button events
  this.keyboard = new Keyboard(this)
  // identify load app complete
  this.loadAppComplete = false
  this.loader = new AppLoader(this)
  this.life = new Lifetime(this.loader)
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

  this.startDbusAppService()
  this.handleMqttMessage()
  this.listenDbusSignals()

  this.keyboard.init()
  this.life.on('stack-reset', () => {
    this.resetCloudStack()
  })
  // initializing the whole process...
  return this.loadApps(paths).then(() => {
    if (wifi.getNetworkState() === wifi.NETSERVER_CONNECTED) {
      this.handleNetworkConnected()
    }

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
AppRuntime.prototype.resetAppearance = function resetAppearance () {
  clearTimeout(this.handle.setVolume)
  if (this.prevVolume > 0) {
    AudioManager.setVolume(this.prevVolume)
    this.prevVolume = -1
  }
  this.lightMethod('setHide', [''])
}

/**
 * Handle the "voice coming" event.
 * @private
 */
AppRuntime.prototype.handleVoiceComing = function handleVoiceComing (data) {
  var min = 30
  var vol = AudioManager.getVolume()
  if (this.online === false) {
    // Do noting when there is no network
    return
  }
  if (vol > min) {
    this.prevVolume = vol
    AudioManager.setVolume(min)
    this.handle.setVolume = setTimeout(() => {
      AudioManager.setVolume(vol)
      this.prevVolume = -1
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
  // guide the user to double-click the button
  if (this.waitingForAwake === true) {
    this.lightMethod('appSound', ['@Yoda', '/opt/media/wifi/network_disconnected.ogg'])
    return
  }
  if (this.online !== true) {
    // start @network app
    this.startApp('@network', {
      intent: 'user_says'
    }, {})
    // Do noting when there is no network
    return
  }
  this.lightMethod('setDegree', ['', '' + (data.sl || 0)])
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
  this.resetAppearance()
  this.onVoiceCommand(data.asr, data.nlp, data.action)
}

/**
 * Fires when the network is connected.
 * @private
 */
AppRuntime.prototype.handleNetworkConnected = function handleNetworkConnected () {
  if (this.loadAppComplete === false) {
    return
  }
  if (this.online === false || this.online === undefined) {
    if (this.online === undefined) {
      logger.log('first login')
    } else {
      logger.log('relogin')
    }
    this.reconnect()

    /** Announce last installed ota changelog and clean up ota files */
    ota.getInfoIfFirstUpgradedBoot((err, info) => {
      if (err || info == null) {
        logger.error('failed to fetch upgraded info, skipping', err && err.stack)
        return
      }
      this.startApp('@ota', { intent: 'on_first_boot_after_upgrade', _info: info }, {})
    })
  }
  this.online = true
}

/**
 * Fires when the network is disconnected.
 * @private
 */
AppRuntime.prototype.handleNetworkDisconnected = function handleNetworkDisconnected () {
  // waiting for the app load complete
  if (this.loadAppComplete === false) {
    return
  }
  // trigger disconnected event when network state is switched or when it is first activated.
  if (this.online === true || this.online === undefined) {
    // start network app here
    this.disconnect()
  }
  this.online = false
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

  return this.life.createApp(appId)
    .then(() => {
      if (!preemptive) {
        logger.info(`app is not preemptive, skip activating app ${appId}`)
        return Promise.resolve()
      }

      logger.info(`app is preemptive, activating app ${appId}`)
      this.updateCloudStack(nlp.appId, form)
      return this.life.activateAppById(appId, form, carrierId)
    })
    .then(() => this.life.onLifeCycle(appId, 'request', [ nlp, action ]))
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
 * @param {boolean} [mute] - set mic to mute, switch mute if not given.
 */
AppRuntime.prototype.setMicMute = function setMicMute (mute) {
  if (mute === this.micMuted) {
    return Promise.resolve()
  }
  /** mute */
  var muted = !this.micMuted
  this.micMuted = muted
  this.emit('micMute', muted)
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
  // 清空正在运行的所有App
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
  this.emit('setStack', ids.join(':'))
}

AppRuntime.prototype.resetCloudStack = function () {
  this.domain.cut = ''
  this.domain.scene = ''
  this.domain.active = ''
  this.emit('setStack', this.domain.scene + ':' + this.domain.cut)
}

/**
 * 调用speech的pickup
 * @param {boolean} isPickup
 * @private
 */
AppRuntime.prototype.setPickup = function (isPickup, duration) {
  this.emit('setPickup', isPickup)
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
  if (this.cloudApi == null) {
    return Promise.reject(new Error('CloudApi not ready.'))
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

AppRuntime.prototype.preventKeyDefaults = function preventKeyDefaults (appId, keyCode) {
  var key = String(keyCode)
  this.keyboard.listeners[key] = appId
  return Promise.resolve()
}

AppRuntime.prototype.restoreKeyDefaults = function restoreKeyDefaults (appId, keyCode) {
  var key = String(keyCode)
  if (this.keyboard.listeners[key] === appId) {
    this.keyboard.listeners[key] = null
  }
  return Promise.resolve()
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
  return this.life.deactivateAppById(this._appId)
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
  this.loader.setExecutorForAppId(appId, executor, {
    skills: [ appId ],
    permission: ['ACCESS_TTS', 'ACCESS_MULTIMEDIA']
  })
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
  this.onVoiceCommand('', nlp, action, options)
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
 * handle MQTT messages.
 * @private
 */
AppRuntime.prototype.handleMqttMessage = function () {
  this.on('cloud_forward', this.onCloudForward.bind(this))
  this.on('reset_settings', this.onResetSettings.bind(this))
  this.on('custom_config', this.onCustomConfig.bind(this))
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
 * 处理App发送的恢复出厂设置
 * @param {string} message
 * @private
 */
AppRuntime.prototype.onResetSettings = function (message) {
  if (message === '1') {
    logger.log('当前不支持恢复出厂设置')
  }
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
  var customConfig = JSON.parse(config)
  if (customConfig.vt_words) {
    // TODO(suchenglong) should inset vt word for first load from server
  }
  if (customConfig.continuousDialog) {
    var continuousDialogObj = customConfig.continuousDialog
    var continueObj = JSON.parse(continuousDialogObj)
    continueObj.isFirstLoad = true
    var continuousDialog = {
      continuousDialog: continueObj
    }
    this.onCustomConfig(continuousDialog)
  }
  if (customConfig.standbyLight) {
    var standbyLightText = customConfig.standbyLight
    var standbyLightObj = JSON.parse(standbyLightText)
    standbyLightObj.isFirstLoad = true
    var standbyLight = {
      standbyLight: standbyLightObj
    }
    this.onCustomConfig(standbyLight)
  }

  if (customConfig.wakeupSoundEffects) {
    var wakeupSoundEffectsText = customConfig.wakeupSoundEffects
    var wakeupSoundEffectsObj = JSON.parse(wakeupSoundEffectsText)
    wakeupSoundEffectsObj.isFirstLoad = true
    var wakeupSoundEffects = {
      wakeupSoundEffects: wakeupSoundEffectsObj
    }
    this.onCustomConfig(wakeupSoundEffects)
  }

  if (customConfig.nightMode) {
    var nightModeText = customConfig.nightMode
    var nightModeObj = JSON.parse(nightModeText)
    nightModeObj.isFirstLoad = true
    var nightMode = {
      nightMode: nightModeObj
    }
    this.onCustomConfig(nightMode)
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
  // only if switch network
  if (this.waitingForAwake === true) {
    this.waitingForAwake = false
  }
  this.lightMethod('setConfigFree', ['system'])
  this.emit('reconnected')
}

/**
 * @private
 */
AppRuntime.prototype.disconnect = function () {
  if (this.login === true) {
    // waiting for user awake or button event in order to switch to network config
    this.waitingForAwake = true
    logger.log('network switch, try to relogin, waiting for user awake or button event')
  } else {
    logger.log('network disconnected, please connect to wifi first')
    this.startApp('@network', {
      intent: 'system_setup'
    }, {})
  }
  this.login = false
  this.emit('disconnected')
}

/**
 * @private
 */
AppRuntime.prototype.doLogin = function () {
  this.destroyAll()
    .then(() => this.initiate())

  this.login = true
  perf.stub('started')
  // not need to play startup music after relogin
  if (this.waitingForAwake === undefined) {
    this.lightMethod('setWelcome', [])
  }
  this.waitingForAwake = undefined

  var config = JSON.stringify(this.onGetPropAll())
  this.ttsMethod('connect', [config])
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

/**
 *
 * @param {string} text -
 * @returns {Promise<object[]>}
 */
AppRuntime.prototype.mockAsr = function mockAsr (text) {
  logger.info('Mocking asr', text)
  return new Promise((resolve, reject) => {
    this.getNlpResult(text, (err, nlp, action) => {
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
    if (self.login === true) {
      self.registerDbusApp(appId, objectPath, ifaceName)
      cb(null, true)
    } else {
      cb(null, false)
    }
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
    try {
      var data = JSON.parse(status)
      if (data.upgrade === true) {
        self.startApp('@upgrade', {}, {})
      } else if (data['Wifi'] === false || data['Network'] === false) {
        self.handleNetworkDisconnected()
      } else if (data['Network'] === true && !self.online) {
        self.handleNetworkConnected()
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
}

function handleErrorCallbacks (cbs, msg) {
  var cb
  var err = new Error(msg)

  for (cb in cbs) {
    cb(err)
  }
}

function getFloraClient () {
  if (floraClient) { return floraClient }
  floraClient = floraFactory.connect(floraConfig.uri, floraConfig.bufsize)
  if (!floraClient) {
    logger.log('connect flora service failed')
    return undefined
  }
  var subNames = [
    'rokid.speech.nlp.' + asr2nlpId,
    'rokid.speech.error.' + asr2nlpId
  ]
  floraClient.on('recv_post', function (name, type, msg) {
    var nlp
    var action
    var err
    var idx
    if (name === subNames[0]) {
      try {
        nlp = JSON.parse(msg.get(0))
        action = JSON.parse(msg.get(1))
        idx = msg.get(2)
      } catch (ex) {
        logger.log('nlp/action parse failed, discarded')
        err = ex
      }
    } else {
      err = new Error('speech put_text return error: ' + msg.get(0))
      idx = msg.get(2)
    }
    if (typeof floraCallbacks[idx] === 'function') {
      floraCallbacks[idx](err, nlp, action)
      delete floraCallbacks[idx]
    }
  })
  floraClient.subscribe(subNames[0], floraFactory.MSGTYPE_INSTANT)
  floraClient.subscribe(subNames[1], floraFactory.MSGTYPE_INSTANT)
  floraClient.on('disconnected', function () {
    logger.log('flora disconnected')
    floraClient.close()
    floraClient = undefined
    var cbs = floraCallbacks
    // clear pending callback functions
    floraCallbacks = []
    process.nextTick(() => handleErrorCallbacks(cbs, 'flora client disconnected'))
  })
  return floraClient
}

AppRuntime.prototype.getNlpResult = function (asr, cb) {
  if (typeof asr !== 'string' || typeof cb !== 'function') { return }
  var cli = getFloraClient()
  if (cli) {
    var caps = new floraFactory.Caps()
    caps.write(asr)
    caps.write(asr2nlpId)
    caps.writeInt32(asr2nlpSeq)
    floraCallbacks[asr2nlpSeq++] = cb
    cli.post('rokid.speech.put_text', caps, floraFactory.MSGTYPE_INSTANT)
  } else {
    process.nextTick(() => cb(new Error('flora service connect failed')))
  }
}
