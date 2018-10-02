'use strict'

/**
 * @namespace yodaRT
 */

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var Url = require('url')

var logger = require('logger')('yoda')

var _ = require('@yoda/util')._
var safeParse = require('@yoda/util').json.safeParse
var ota = require('@yoda/ota')
var CloudGW = require('@yoda/cloudgw')
var wifi = require('@yoda/wifi')
var property = require('@yoda/property')
var system = require('@yoda/system')

var CloudApi = require('./cloudapi')
var env = require('./env')()
var perf = require('./performance')
var DbusAppExecutor = require('./app/dbus-app-executor')
var Permission = require('./component/permission')
var DBusRegistry = require('./component/dbus-registry')
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
  this.cloudApi = CloudApi // support cloud api. etc.. login
  this.shouldWelcome = true
  this.forceUpdateAvailable = false

  this.dbusRegistry = new DBusRegistry(this)
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

  this.dbusRegistry.init()

  this.keyboard.init()
  this.life.on('stack-reset', () => {
    this.resetCloudStack()
  })
  // initializing the whole process...
  this.resetServices()

  var future = Promise.resolve()

  if (property.get('sys.firstboot.init', 'persist') !== '1') {
    // initializing play tts status
    property.set('sys.firstboot.init', '1', 'persist')
    future = future.then(() => {
      return this.lightMethod('appSound', ['@Yoda', '/opt/media/firstboot.ogg'])
    })
  }

  return future.then(() => {
    return this.loadApps(paths)
  }).then(() => {
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
 * Set device awaken state and appearance.
 */
AppRuntime.prototype.setAwaken = function setAwaken () {
  var promises = []
  if (this.__awaken) {
    promises.push(
      this.resetAwaken({ recover: false })
    )
  }
  this.__awaken = true

  var currAppId = this.life.getCurrentAppId()

  /**
   * pause lifetime to prevent incoming app preemption;
   * doesn't care when pauseLifetime ends.
   */
  this.life.pauseLifetime()

  logger.info('awaking, pausing tts/media of app', currAppId)

  /**
   * no need to determine if tts is previously been paused.
   */
  this.__pausedTtsAppIdOnAwaken = currAppId
  /**
   * if media has been paused already, shall not be resumed on end of awaken
   */
  this.__pausedMediaAppIdOnAwaken = null
  return Promise.all(promises.concat([
    this.ttsMethod('pause', [ currAppId ]),
    this.multimediaMethod('pause', [ currAppId ])
      .then(val => {
        if (_.get(val, '0', false)) {
          this.__pausedMediaAppIdOnAwaken = currAppId
        }
      })
  ])).then(() => this.lightMethod('setAwake', ['']))
}

/**
 * Set device end of awaken and remove awaken effects.
 *
 * @private
 * @param {object} [options] -
 * @param {boolean} [options.recover] - if recover previous paused app
 */
AppRuntime.prototype.resetAwaken = function resetAwaken (options) {
  var recover = _.get(options, 'recover', true)
  if (!this.__awaken) {
    logger.warn('runtime was not awaken, skipping reset awaken')
    return Promise.resolve()
  }
  this.__awaken = false
  logger.info('reset awaken, recovering?', recover)

  var promises = [
    this.lightMethod('stop', ['', '/opt/light/awake.js']),
    this.life.resumeLifetime({ recover: recover })
  ]

  var pausedTtsAppIdOnAwaken = this.__pausedTtsAppIdOnAwaken
  this.__pausedTtsAppIdOnAwaken = null

  if (!recover) {
    if (pausedTtsAppIdOnAwaken) {
      /**
       * tts no need to be kept if recovering is discarded, stop it.
       */
      logger.info('stop previously awaken paused tts of app', pausedTtsAppIdOnAwaken)
      promises.push(
        this.ttsMethod('stop', [ pausedTtsAppIdOnAwaken ])
      )
    }
    return Promise.all(promises)
  }

  var currentAppId = this.life.getCurrentAppId()
  if (pausedTtsAppIdOnAwaken && pausedTtsAppIdOnAwaken === currentAppId) {
    logger.info('resume previously awaken paused tts of app', pausedTtsAppIdOnAwaken)
    promises.push(
      this.ttsMethod('resume', [ pausedTtsAppIdOnAwaken ])
    )
  } else {
    logger.info('skip resuming paused awaken tts of app', pausedTtsAppIdOnAwaken, 'current app', currentAppId)
  }

  var pausedMediaAppIdOnAwaken = this.__pausedMediaAppIdOnAwaken
  this.__pausedMediaAppIdOnAwaken = null
  if (pausedMediaAppIdOnAwaken && pausedMediaAppIdOnAwaken === currentAppId) {
    logger.info('resume previously awaken paused media of app', pausedMediaAppIdOnAwaken)
    promises.push(
      this.multimediaMethod('resume', [ pausedMediaAppIdOnAwaken ])
    )
  } else {
    logger.info('skip resuming paused awaken media of app', pausedTtsAppIdOnAwaken, 'current app', currentAppId)
  }

  return Promise.all(promises)
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

  var future = this.setAwaken()
  this.fakeVoiceComingTimer = setTimeout(() => {
    logger.warn('detected a fake voice coming, resetting awaken')
    this.resetAwaken()
  }, process.env.APP_KEEPALIVE_TIMEOUT || 6000)

  if (this.forceUpdateAvailable) {
    var deferred = () => {
      /**
       * Skip upcoming voice, announce available force update and start ota.
       */
      logger.info('pending force update, delegates activity to @ota.')
      this.forceUpdateAvailable = false
      return ota.getInfoOfPendingUpgrade((err, info) => {
        if (err || info == null) {
          logger.error('failed to fetch pending update info, skip force updates', err && err.stack)
          return
        }
        logger.info('got pending update info', info)
        Promise.all([
          this.setMicMute(true, { silent: true }),
          this.setPickup(false)
        ]).then(() =>
          this.openUrl(`yoda-skill://ota/force_upgrade?changelog=${encodeURIComponent(info.changelog)}`)
        ).then(() => this.startMonologue('@yoda/ota'))
      })
    }
    future.then(deferred, err => {
      logger.error('unexpected error on set awaken', err.stack)
      deferred()
    })
  }

  return future
}

/**
 * Handle the "voice local awake" event.
 * @private
 */
AppRuntime.prototype.handleVoiceLocalAwake = function handleVoiceLocalAwake (data) {
  if (this.life.getCurrentAppId() === '@yoda/network') {
    this.openUrl('yoda-skill://network/renew')
    return
  }
  if (wifi.getNumOfHistory() === 0) {
    this.openUrl('yoda-skill://network/setup', {
      preemptive: true
    })
    return
  }
  if (wifi.getWifiState() !== wifi.WIFI_CONNECTED) {
    wifi.enableScanPassively()
    return this.lightMethod('appSound', ['@Yoda', '/opt/media/wifi/network_disconnected.ogg'])
  }
  return this.lightMethod('setDegree', ['', '' + (data.sl || 0)])
}

/**
 * Handle the "asr pending" event.
 * @private
 */
AppRuntime.prototype.handleAsrPending = function handleAsrPending () {
  this.__asrState = 'pending'
  clearTimeout(this.fakeVoiceComingTimer)
}

/**
 * Handle the "asr end" event.
 * @private
 */
AppRuntime.prototype.handleAsrEnd = function handleAsrEnd () {
  this.__asrState = 'end'
  this.lightMethod('setLoading', [''])
  this.resetAwaken({
    recover: /** no recovery shall be made on nlp coming */ false
  })
}

/**
 * Handle the "asr fake" event.
 * @private
 */
AppRuntime.prototype.handleAsrFake = function handleAsrFake () {
  this.__asrState = 'fake'
  this.resetAwaken()
}

/**
 * Handle the "start voice" event.
 * @private
 */
AppRuntime.prototype.handleStartVoice = function handleStartVoice () {
  this.__pickingUp = true
}

/**
 * Handle the "end voice" event.
 * @private
 */
AppRuntime.prototype.handleEndVoice = function handleEndVoice () {
  this.__pickingUp = false
  logger.info('on end of voice, asr:', this.__asrState)
  if (this.__asrState === 'end') {
    return
  }
  this.resetAwaken()
}

/**
 * Handle the "nlp" event.
 * @private
 */
AppRuntime.prototype.handleNlpResult = function handleNlpResult (data) {
  this.onVoiceCommand(data.asr, data.nlp, data.action)
}

/**
 * Handle cloud events.
 * @private
 */
AppRuntime.prototype.handleCloudEvent = function handleCloudEvent (data) {
  logger.log('cloud event', data)
  if (this.custodian.isRegistering() &&
    this.life.getCurrentAppId() === '@yoda/network') {
    this.openUrl(`yoda-skill://network/cloud_status?code=${data.code}&msg=${data.msg}`, {
      preemptive: false
    })
  }
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
    return this.openUrl('yoda-skill://network/setup', { preemptive: false })
  }

  var currentAppId = this.life.getCurrentAppId()
  /**
   * Stop apps and reset services whenever possible
   */
  var future = Promise.all([
    this.life.deactivateAppsInStack(),
    this.resetServices()
  ])

  if (currentAppId) {
    /**
     * if there is any app actively running, do not pick up.
     */
    return future
  }
  return future.then(() => this.setPickup(true))
}

/**
 * Reset network and start procedure of configuring network.
 */
AppRuntime.prototype.resetNetwork = function resetNetwork () {
  /**
   * reset should welcome so that welcome effect could be played on re-login
   */
  this.shouldWelcome = true
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
    case 'asr pending':
      handler = this.handleAsrPending
      break
    case 'asr end':
      handler = this.handleAsrEnd
      break
    case 'asr fake':
      handler = this.handleAsrFake
      break
    case 'start voice':
      handler = this.handleStartVoice
      break
    case 'end voice':
      handler = this.handleEndVoice
      break
    case 'nlp':
      handler = this.handleNlpResult
      break
  }
  if (typeof handler !== 'function') {
    logger.info(`skip turen event "${name}" for no handler existing`)
  } else {
    logger.debug(`handling turen event "${name}"`)
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

  return this.life.createApp(appId)
    .then(() => {
      if (!preemptive) {
        logger.info(`app is not preemptive, skip activating app ${appId}`)
        return
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

  var urlObj = Url.parse(url, true)
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
      logger.error(`open url(${url}) error with appId: ${appId}`, error)
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
AppRuntime.prototype.setMicMute = function setMicMute (mute, options) {
  var silent = _.get(options, 'silent', false)
  if (mute === this.micMuted) {
    return Promise.resolve()
  }
  /** mute */
  var muted = !this.micMuted
  this.micMuted = muted
  this.flora.turenMute(muted)

  if (silent) {
    return Promise.resolve()
  }

  var future
  if (muted) {
    future = this.openUrl('yoda-skill://volume/mic_mute_effect', { preemptive: false })
  } else {
    future = this.openUrl('yoda-skill://volume/mic_unmute_effect', { preemptive: false })
  }

  if (this.__asrState === 'pending' && muted) {
    future = future.then(() => this.resetAwaken())
  }

  return future
    .then(() => muted)
}

/**
 * Send 'destroy' event to all apps, also clears app contexts.
 *
 * @private
 * @param {object} [options]
 * @param {object} [options.force=true] - Force quit all apps.
 * @param {boolean} [options.resetServices=true]
 * @returns {Promise<void>}
 */
AppRuntime.prototype.destroyAll = function (options) {
  var force = _.get(options, 'force', true)
  var resetServices = _.get(options, 'resetServices', true)

  this.resetCloudStack()

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

  promises.concat(this.resetServices())

  return Promise.all(promises)
}

AppRuntime.prototype.resetServices = function resetServices () {
  logger.info('resetting services')

  return Promise.all([
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

AppRuntime.prototype.appGC = function appGC (appId) {
  logger.info('Collecting resources of app', appId)
  return Promise.all([
    this.lightMethod('stop', [ appId, '' ]),
    this.multimediaMethod('stop', [ appId ]),
    this.ttsMethod('stop', [ appId ])
  ]).catch(err => logger.error('Unexpected error on collecting resources of app', appId, err.stack))
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
  if (isPickup) {
    return this.lightMethod('setPickup', ['@yoda', '' + (duration || 6000)])
  }
  return this.lightMethod('stop', ['@yoda', ''])
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
  if (appId != null && curAppId === appId) {
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
    logger.log(`send NLP to App failed, AppId ${appId} not in active, active app: ${curAppId}`, nlp)
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
  if (typeof data.content === 'string') {
    /**
     * FIXME: compatibility with message format of android Rokid app
     * see more at: https://bug.rokid-inc.com/zentaopms/www/index.php?m=bug&f=view&bugID=15033
     */
    try {
      data.content = JSON.parse(data.content)
    } catch (err) {}
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
  return this.cloudApi.unBindDevice()
    .then(() => {
      logger.info('unbind device success')
      return this.resetNetwork()
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
    preemptive: false,
    form: 'cut'
  }
  if (msg.nightMode) {
    this.openUrl(appendUrl('nightMode', msg.nightMode), option)
  } else if (msg.vt_words) {
    this.openUrl(appendUrl('vt_words', msg.vt_words[0]), option)
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
  return this.dbusRegistry.callMethod(
    'com.service.light',
    '/rokid/light',
    'com.rokid.light.key',
    name, args)
}

/**
 * @private
 */
AppRuntime.prototype.ttsMethod = function (name, args) {
  return this.dbusRegistry.callMethod(
    'com.service.tts',
    '/tts/service',
    'tts.service',
    name, args)
}

AppRuntime.prototype.multimediaMethod = function (name, args) {
  return this.dbusRegistry.callMethod(
    'com.service.multimedia',
    '/multimedia/service',
    'multimedia.service',
    name, args)
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
  var onNotify = (code, msg) => {
    this.handleCloudEvent({ code: code, msg: msg })
  }
  this.cloudApi.connect(onNotify).then((mqtt) => {
    // load the system configuration
    var config = mqtt.config
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

    // overwrite `onGetPropAll`.
    this.onGetPropAll = function onGetPropAll () {
      return Object.assign({}, config)
    }
    this.onLoggedIn()
    this.wormhole.init(mqtt)
    this.onLoadCustomConfig(_.get(config, 'extraInfo.custom_config', ''))
  }).catch((err) => {
    if (err && err.code === 'BIND_MASTER_REQUIRED') {
      logger.error('bind master is required, just clear the local and enter network')
      this.custodian.resetNetwork()
    } else {
      logger.error('initializing occurs error', err && err.stack)
    }
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
      logger.info('announcing welcome')
      this.lightMethod('setWelcome', [])
    }
    this.shouldWelcome = false

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

AppRuntime.prototype.destruct = function destruct () {
  this.keyboard.destruct()
  this.flora.destruct()
  this.dbusRegistry.destruct()
}
