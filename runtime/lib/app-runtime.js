'use strict'

/**
 * @namespace yodaRT
 */

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var Url = require('url')
var fs = require('fs')
var childProcess = require('child_process')
var path = require('path')

var logger = require('logger')('yoda')

var ComponentConfig = require('./helper/config').getConfig('component-config.json')

var _ = require('@yoda/util')._
var property = require('@yoda/property')
var system = require('@yoda/system')
var Loader = require('@yoda/bolero').Loader

var perf = require('./performance')

module.exports = AppRuntime
perf.stub('init')

/**
 * @memberof yodaRT
 * @class
 */
function AppRuntime () {
  EventEmitter.call(this)
  this.credential = {
    masterId: null,
    deviceId: null,
    deviceTypeId: null,
    key: null,
    secret: null
  }

  this.shouldWelcome = true

  this.inited = false
  this.hibernated = false
  this.__temporaryDisablingReasons = [ 'initiating' ]

  this.componentLoader = new Loader(this, 'component')
  this.descriptorLoader = new Loader(this, 'descriptor')
}
inherits(AppRuntime, EventEmitter)

/**
 * Start AppRuntime
 *
 * @returns {Promise<void>}
 */
AppRuntime.prototype.init = function init () {
  if (this.inited) {
    return Promise.resolve()
  }

  ComponentConfig.paths.forEach(it => {
    this.componentLoader.load(it)
  })
  this.descriptorLoader.load(path.join(__dirname, 'descriptor'))

  /** 1. init components. */
  this.componentsInvoke('init')
  /** 2. init device properties, such as volume and cloud stack. */
  this.initiate()
  /** 3. init services */
  // TODO: OPEN WAKEUP ENGINE
  this.resetServices()

  /** 4. listen on lifetime events */
  this.component.lifetime.on('preemption', appId => {
    this.appPause(appId)
  })

  /** 5. determines if welcome announcements are needed */
  this.shouldWelcome = !this.isStartupFlagExists()
  var isFirstBoot = property.get('sys.firstboot.init', 'persist') !== '1'
  property.set('sys.firstboot.init', '1', 'persist')

  var shouldBreakInit = () => {
    if (this.hasBeenDisabled()) {
      if (this.__temporaryDisablingReasons.length > 1) {
        return true
      }
      if (this.__temporaryDisablingReasons[0] !== 'welcoming') {
        return true
      }
    }
    return false
  }

  /** 6. load app manifests */
  return this.loadApps().then(() => {
    this.inited = true
    this.enableRuntimeFor('initiating')

    /** 7. questioning if any interests of delegation */
    return this.component.dispatcher.delegate('runtimeDidInit')
  }).then(delegation => {
    if (delegation) {
      return
    }
    this.disableRuntimeFor('welcoming')

    /** 8. announce welcoming */
    var future = Promise.resolve()
    if (isFirstBoot) {
      /** 8.1. announce first time welcoming */
      future = future.then(() => {
        if (shouldBreakInit()) {
          return
        }
        return this.component.light.ttsSound('@yoda', 'system://firstboot.ogg')
      })
    }
    if (this.shouldWelcome) {
      /** 8.2. announce system loading */
      future = future.then(() => {
        if (shouldBreakInit()) {
          return
        }
        this.component.light.play('@yoda', 'system://boot.js', { fps: 200 })
        return this.component.light.appSound('@yoda', 'system://boot.ogg')
      })
    }
    return future.then(() => {
      this.enableRuntimeFor('welcoming')
      if (shouldBreakInit()) {
        return
      }
      /** 9. force-enable and check network states */
      this.dispatchNotification('on-system-booted', [])
    }).catch(err => {
      logger.error('unexpected error on boot welcoming', err.stack)
      this.enableRuntimeFor('welcoming')
    })
  })
}

/**
 * Deinit runtime.
 */
AppRuntime.prototype.deinit = function deinit () {
  this.componentsInvoke('deinit')
}

/**
 * Invokes method on each component if exists with args.
 *
 * @param {string} method - method name to be invoked.
 * @param {any[]} args - arguments on invocation.
 */
AppRuntime.prototype.componentsInvoke = function componentsInvoke (method, args) {
  if (args == null) {
    args = []
  }
  Object.keys(this.componentLoader.registry).forEach(it => {
    var comp = this.component[it]
    var fn = comp[method]
    if (typeof fn === 'function') {
      fn.apply(comp, args)
    }
  })
}

/**
 * Load applications.
 */
AppRuntime.prototype.loadApps = function loadApps () {
  logger.info('start loading applications')
  return this.component.appLoader.reload()
    .then(() => {
      this.loadAppComplete = true
      logger.log('load app complete')
    })
}

/**
 * Initiate/Re-initiate runtime configs
 */
AppRuntime.prototype.initiate = function initiate () {
  this.component.sound.initVolume()
  return Promise.resolve()
}

/**
 * Start the daemon apps.
 */
AppRuntime.prototype.startDaemonApps = function startDaemonApps () {
  var self = this
  var daemons = Object.keys(self.component.appLoader.appManifests).map(appId => {
    var manifest = self.component.appLoader.appManifests[appId]
    if (!manifest.daemon) {
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
    return self.component.lifetime.createApp(appId)
      .then(() => {
        return start(idx + 1)
      }, () => {
        /** ignore error and continue populating */
        return start(idx + 1)
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
  var currentAppId = this.component.lifetime.getCurrentAppId()
  logger.info('handling power activation, current app is', currentAppId)

  /**
   * reset services whenever possible
   */
  var future = this.resetServices({ lightd: false })

  if (currentAppId == null && !this.component.custodian.isPrepared()) {
    // guide user to configure network but not start network app directly
    return future.then(() => this.component.light.ttsSound('@yoda', 'system://guide_config_network.ogg'))
  }

  future = Promise.all([ future, this.idle() ])

  if (currentAppId) {
    /**
     * if there is any app actively running, do not pick up.
     */
    return future
  }

  return future.then(() => {
    if (this.component.turen.pickingUp) {
      /**
       * already picking up, discard current pick session.
       */
      return this.setPickup(false)
    }
    return this.setPickup(true, 6000, true)
  })
}

/**
 * Determines if runtime has been disabled for specific reason or just has been disabled.
 *
 * @param {string} [reason]
 * @returns {boolean}
 */
AppRuntime.prototype.hasBeenDisabled = function hasBeenDisabled (reason) {
  if (reason) {
    return this.__temporaryDisablingReasons.indexOf(reason) >= 0
  }
  return this.__temporaryDisablingReasons.length > 0
}

/**
 * Get all reasons for disabling runtime.
 *
 * @returns {string[]}
 */
AppRuntime.prototype.getDisabledReasons = function getDisabledReasons () {
  return this.__temporaryDisablingReasons
}

/**
 * Disable runtime for reason.
 *
 * Effects:
 * - Turen wake up engine would be disabled.
 * - Network events would be ignored.
 * - Battery events would be ignored.
 * - Application could not be opened through dispatching.
 *
 * @param {string} reason
 * @returns {boolean} if reason was successfully added to memo.
 */
AppRuntime.prototype.disableRuntimeFor = function disableRuntimeFor (reason) {
  if (typeof reason !== 'string') {
    throw new TypeError('Expect a string as reason for AppRuntime.prototype.disableRuntimeFor')
  }
  if (this.__temporaryDisablingReasons.indexOf(reason) >= 0) {
    logger.warn(`runtime has already been disabled for reason(${reason}), possible duplicated operation.`)
    return false
  }
  this.__temporaryDisablingReasons.push(reason)
  logger.warn(`disabling runtime for reason: ${reason}, current reasons: ${this.__temporaryDisablingReasons}`)
  // TODO: OPEN WAKEUP ENGINE
  return true
}

/**
 * Remove previously disabling runtime reason. Would enable runtime if there is no reason remaining.
 *
 * @param {string} reason
 * @returns {boolean} if reason was successfully removed from memo.
 */
AppRuntime.prototype.enableRuntimeFor = function enableRuntimeFor (reason) {
  if (typeof reason !== 'string') {
    throw new TypeError('Expect a string as reason for AppRuntime.prototype.enableRuntimeFor')
  }
  var idx = this.__temporaryDisablingReasons.indexOf(reason)
  if (idx < 0) {
    return false
  }
  this.__temporaryDisablingReasons.splice(idx, 1)
  logger.warn(`enabling runtime for reason: ${reason}, current reasons: ${this.__temporaryDisablingReasons}`)
  if (this.__temporaryDisablingReasons.length === 0) {
    // TODO: DISABLE WAKEUP ENGINE
  }
  return true
}

/**
 * Put device into idle state. Terminates apps in stack (i.e. apps in active and paused).
 *
 * Also clears apps' contexts.
 */
AppRuntime.prototype.idle = function idle () {
  logger.info('set runtime to idling')
  return this.component.lifetime.deactivateAppsInStack()
}

/**
 * Put device into hibernation state.
 */
AppRuntime.prototype.hibernate = function hibernate () {
  if (this.hibernated === true) {
    logger.info('runtime already hibernated, skipping')
    return Promise.resolve()
  }
  logger.info('hibernating runtime')
  this.hibernated = true
  this.disableRuntimeFor('hibernated')
  // TODO: DISABLE WAKEUP ENGINE
  this.setMicMute(true, { silent: true })
  /**
   * Clear apps and its contexts
   */
  this.resetCloudStack()
  return this.component.lifetime.destroyAll({ force: true })
}

/**
 * Wake up device from hibernation.
 *
 * @param {object} [options]
 * @param {boolean} [options.shouldWelcome=false] - if welcoming is needed after re-logged in
 */
AppRuntime.prototype.wakeup = function wakeup (options) {
  var shouldWelcome = _.get(options, 'shouldWelcome', false)
  if (this.hibernated === false) {
    logger.info('runtime already woken up, skipping')
    return Promise.resolve()
  }
  logger.info('waking up runtime')
  this.hibernated = false
  this.enableRuntimeFor('hibernated')
  if (shouldWelcome) {
    this.shouldWelcome = true
  }
  /** set turen to not muted */
  // TODO: OPEN WAKEUP ENGINE

  this.component.dispatcher.delegate('runtimeDidResumeFromSleep')
  this.dispatchNotification('on-system-booted', [])
}

/**
 * Start a session of monologue. In session of monologue, no other apps could preempt top of stack.
 *
 * Note that monologues automatically ends on unexpected exit of apps.
 *
 * @param {string} appId
 */
AppRuntime.prototype.startMonologue = function (appId) {
  if (appId !== this.component.lifetime.getCurrentAppId()) {
    return Promise.reject(new Error(`App ${appId} is not currently on top of stack.`))
  }
  this.component.lifetime.monopolist = appId
  return Promise.resolve()
}

/**
 * Stop a session of monologue started previously.
 *
 * @param {string} appId
 */
AppRuntime.prototype.stopMonologue = function (appId) {
  if (this.component.lifetime.monopolist === appId) {
    this.component.lifetime.monopolist = null
  }
  return Promise.resolve()
}

/**
 *
 * > Note: currently only `yoda-app:` scheme is supported.
 *
 * @param {string} url -
 * @param {object} [options] -
 * @param {'cut' | 'scene'} [options.form='cut'] -
 * @param {boolean} [options.preemptive=true] -
 * @param {string} [options.carrierId] -
 * @returns {Promise<boolean>}
 */
AppRuntime.prototype.openUrl = function (url, options) {
  var urlObj = Url.parse(url, true)
  if (urlObj.protocol !== 'yoda-app:') {
    logger.info('Url protocol other than yoda-app is not supported now.')
    return Promise.resolve(false)
  }
  var appId = this.component.appLoader.getAppIdByHost(urlObj.hostname)
  if (appId == null) {
    logger.info(`No app registered for app host '${urlObj.hostname}'.`)
    return Promise.resolve(false)
  }

  return this.component.dispatcher.dispatchAppEvent(
    appId,
    'url', [ urlObj ],
    Object.assign({}, options)
  )
}

/**
 * Dispatches a notification request to apps registered for the channel.
 *
 * @param {string} channel
 * @param {any[]} params
 * @param {object} [options]
 * @param {'active' | 'running' | 'all'} [options.filterOption='all']
 */
AppRuntime.prototype.dispatchNotification = function dispatchNotification (channel, params, options) {
  var filterOption = _.get(options, 'filterOption', 'all')
  var appIds = this.component.appLoader.notifications[channel]
  if (!Array.isArray(appIds)) {
    return Promise.reject(new Error(`Unknown notification channel '${channel}'`))
  }
  switch (filterOption) {
    case 'active':
      appIds = this.component.lifetime.activeSlots.toArray()
        .filter(it => appIds.indexOf(it) >= 0)
      break
    case 'running':
      appIds = appIds.filter(it => this.component.appScheduler.isAppRunning(it))
      break
  }

  if (params == null) {
    params = []
  }
  logger.info(`on system notification(${channel}): ${appIds} with filter option '${filterOption}'`)

  var self = this
  return step(0)

  function step (idx) {
    if (idx >= appIds.length) {
      return Promise.resolve()
    }
    var appId = appIds[idx]
    var future = Promise.resolve()
    if (filterOption === 'all') {
      future = self.component.lifetime.createApp(appId)
        /** force quit app on create error */
        .catch(err => {
          logger.error(`create app ${appId} failed`, err.stack)
          return self.component.lifetime.destroyAppById(appId, { force: true })
            .then(() => { /** rethrow error to break following procedures */throw err })
        })
    }
    return future
      .then(() => self.descriptor.activity.emitToApp(appId, 'notification', [ channel ].concat(params)))
      .catch(err => {
        logger.error(`send notification(${channel}) failed with appId: ${appId}`, err.stack)
      })
      .then(() => step(++idx))
  }
}

/**
 *
 * @param {boolean} mute - set mic to mute, switch mute if not given.
 * @param {object} [options]
 * @param {boolean} [options.silent]
 */
AppRuntime.prototype.setMicMute = function setMicMute (mute, options) {
  var silent = _.get(options, 'silent', false)

  var future = Promise.resolve()
  if (silent) {
    future = this.component.light.stop('@yoda', 'system://setMuted.js')
  }

  /** mute */
  var muted = this.component.turen.toggleMute(mute)

  if (silent) {
    return future
  }

  return future
    .then(() => {
      var noTts = !!this.component.lifetime.getCurrentAppId()
      this.component.light.play(
        '@yoda',
        'system://setMuted.js',
        { muted: muted, noTts: noTts },
        { shouldResume: muted })
    })
}

/**
 *
 * @param {object} [options] -
 * @param {boolean} [options.lightd=true] -
 * @param {boolean} [options.ttsd=true] -
 * @param {boolean} [options.multimediad=true] -
 */
AppRuntime.prototype.resetServices = function resetServices (options) {
  var lightd = _.get(options, 'lightd', true)
  var ttsd = _.get(options, 'ttsd', true)
  var multimediad = _.get(options, 'multimediad', true)
  logger.info('resetting services')

  var promises = []
  if (lightd) {
    promises.push(
      this.component.light.reset()
        .then((res) => {
          if (res && res[0] === true) {
            logger.log('reset lightd success')
          } else {
            logger.log('reset lightd failed')
          }
        })
        .catch((error) => {
          logger.log('reset lightd error', error)
        })
    )
  }
  if (ttsd) {
    promises.push(
      this.ttsMethod('reset', [])
        .then((res) => {
          if (res.msg[0] !== true) {
            return logger.log('reset ttsd failed')
          }
          logger.log('reset ttsd success')
        })
        .catch((error) => {
          logger.log('reset ttsd error', error)
        })
    )
  }
  if (multimediad) {
    promises.push(
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
        })
    )
  }

  return Promise.all(promises)
}

AppRuntime.prototype.appPause = function appPause (appId) {
  logger.info('Pausing resources of app', appId)
  var promises = [
    this.component.light.stopSoundByAppId(appId),
    this.multimediaMethod('pause', [ appId ])
  ]
  return Promise.all(promises)
    .catch(err => logger.error('Unexpected error on pausing resources of app', appId, err.stack))
}

AppRuntime.prototype.appGC = function appGC (appId) {
  logger.info('Collecting resources of app', appId)
  var promises = [
    this.component.light.stopByAppId(appId),
    this.component.light.stopSoundByAppId(appId),
    this.multimediaMethod('stop', [ appId ]),
    this.ttsMethod('stop', [ appId ])
  ]
  if (this.component.lifetime.isAppInStack(appId)) {
    /**
     * clear app registrations and recover paused app if possible
     */
    promises.push(
      this.component.lifetime.deactivateAppById(appId)
    )
  } else if (this.component.lifetime.isBackgroundApp(appId)) {
    /**
     * clears background app registrations
     */
    promises.push(
      this.component.lifetime.destroyAppById(appId)
    )
  }
  return Promise.all(promises).catch(err => logger.error('Unexpected error on collecting resources of app', appId, err.stack))
}

/**
 * @param {boolean} isPickup
 * @private
 */
AppRuntime.prototype.setPickup = function (isPickup, duration, withAwaken) {
  if (this.component.turen.pickingUp === isPickup) {
    /** already at expected state */
    logger.info('turen already at picking up?', this.component.turen.pickingUp)
    return Promise.resolve()
  }

  if (this.component.turen.muted && isPickup) {
    logger.info('Turen has been muted, skip picking up.')
    return Promise.resolve()
  }

  logger.info('set turen picking up', isPickup)
  this.component.turen.pickup(isPickup)

  if (isPickup) {
    /** stop all other announcements on picking up */
    this.component.light.stopSoundByAppId('@yoda')
    this.component.light.stopByAppId('@yoda')
    return this.component.light.setPickup('@yoda', duration, withAwaken)
  }
  return this.component.light.stop('@yoda', 'system://setPickup.js')
}

AppRuntime.prototype.setConfirm = function (appId, intent, slot, options, attrs) {
  var currAppId = this.component.lifetime.getCurrentAppId()
  if (currAppId !== appId) {
    return Promise.reject(new Error(`App is not currently active app, active app: ${currAppId}.`))
  }
  return new Promise((resolve, reject) => {
    this.cloudApi.sendNlpConform(this.domain.active, intent, slot, options, attrs, (error) => {
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
 * @param {boolean} [options.ignoreKeptAlive] - ignore contextOptions.keepAlive
 */
AppRuntime.prototype.exitAppById = function exitAppById (appId, options) {
  var ignoreKeptAlive = _.get(options, 'ignoreKeptAlive', false)
  return this.component.lifetime.deactivateAppById(appId, { force: ignoreKeptAlive })
}

/**
 * Register the dbus app.
 *
 * @param {string} appId extapp的AppID
 * @param {object} profile extapp的profile
 * @private
 */
AppRuntime.prototype.registerDbusApp = function (appId, objectPath, ifaceName) {
  logger.log('register dbus app with id: ', appId)
  try {
    this.component.appLoader.setManifest(appId, {
      objectPath: objectPath,
      ifaceName: ifaceName,
      permission: []
    }, {
      dbusApp: true
    })
  } catch (err) {
    if (_.startsWith(err.message, 'AppId exists')) {
      return
    }
    throw err
  }
  /** dbus apps are already running, creating a daemon app proxy for then */
  return this.component.lifetime.createApp(appId)
}

/**
 * recover the default settings, it reboots when the request is done.
 */
AppRuntime.prototype.onResetSettings = function () {
  this.cloudApi.resetSettings().then(() => {
    logger.info('system is already reset')
    system.setRecoveryMode()
    process.nextTick(system.reboot)
  })
}

AppRuntime.prototype.shutdown = function shutdown () {
  logger.info('shuting down')
  this.component.light.play('@yoda', 'system://shutdown.js')
    .then(() => {
      if (this.component.battery.isCharging()) {
        return system.rebootCharging()
      }
      return system.powerOff('power-key')
    })
}

/**
 * @private
 */
AppRuntime.prototype.ttsMethod = function (name, args) {
  return this.component.flora.call(`yodart.ttsd.${name}`, args, 'ttsd', 1000)
}

AppRuntime.prototype.multimediaMethod = function (name, args) {
  return this.component.dbusRegistry.callMethod(
    'com.service.multimedia',
    '/multimedia/service',
    'multimedia.service',
    name, args)
}

AppRuntime.prototype.getCopyOfCredential = function () {
  return Object.assign({}, this.credential)
}

/**
 * @private
 */
AppRuntime.prototype.phaseToReady = function phaseToReady () {
  var sendReady = () => {
    var ids = Object.keys(this.component.appScheduler.appMap)
    return Promise.all(ids.map(it => this.descriptor.activity.emitToApp(it, 'ready')))
  }

  var deferred = () => {
    perf.stub('started')
    if (this.shouldWelcome) {
      this.component.dispatcher.delegate('runtimeDidLogin')
        .then((delegation) => {
          if (delegation) {
            return
            /** delegation should break all actions below */
          }
          this.disableRuntimeFor('welcoming')
          logger.info('announcing welcome')
          return this.setMicMute(false, { silent: true })
            .then(() => {
              this.component.light.play('@yoda', 'system://setWelcome.js')
                .then(() => this.component.light.stop('@yoda', 'system://boot.js'))
              return this.component.light.appSound('@yoda', 'system://startup0.ogg')
            })
            .then(() => {
              this.enableRuntimeFor('welcoming')
            })
            .catch(err => {
              this.enableRuntimeFor('welcoming')
              logger.error('unexpected error on welcoming', err.stack)
            })
        })
    }
    this.shouldWelcome = false
  }

  var onDone = () => {
    this.dispatchNotification('on-ready', [])
  }

  return Promise.all([
    sendReady() /** only send ready to currently alive apps */,
    this.startDaemonApps(),
    this.setStartupFlag(),
    this.initiate().then(deferred, err => {
      logger.error('Unexpected error on bootstrap', err.stack)
      return deferred()
    })
  ]).then(onDone, err => {
    logger.error('Unexpected error on logged in', err.stack)
    return onDone()
  })
}

/**
 * Set a flag which informs startup service that it is time to boot other services.
 */
AppRuntime.prototype.setStartupFlag = function setStartupFlag () {
  return new Promise((resolve, reject) => {
    /**
     * intended typo: bootts
     */
    childProcess.exec('touch /tmp/.com.rokid.activation.bootts', err => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

/**
 * Determines if startup flag has been set.
 * WARNING: This is a synchronous function.
 *
 * @returns {boolean}
 */
AppRuntime.prototype.isStartupFlagExists = function isStartupFlagExists () {
  return fs.existsSync('/tmp/.com.rokid.activation.bootts')
}
