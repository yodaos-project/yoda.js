'use strict'
var EventEmitter = require('events')
var inherits = require('util').inherits

var logger = require('logger')('la-vie')
var _ = require('@yoda/util')._

/**
 * Active app slots. Only two slots are currently supported: cut and scene.
 * And only two app could be able to be on slots simultaneously.
 */
function AppSlots () {
  this.cut = null
  this.scene = null
}

AppSlots.prototype.addApp = function addApp (appId, isScene) {
  if (isScene && this.cut === appId) {
    this.cut = null
  }
  if (isScene) {
    this.scene = appId
    return
  }
  this.cut = appId
}

/**
 * Remove app from app slots.
 * @param {string} appId
 * @returns {boolean} returns true if app is removed from slots, false otherwise.
 */
AppSlots.prototype.removeApp = function removeApp (appId) {
  if (appId == null) {
    return false
  }
  if (this.cut === appId) {
    this.cut = null
    return true
  }
  if (this.scene === appId) {
    this.scene = null
    return true
  }
  return false
}

/**
 * Get a copy of current slots in array form.
 *
 * @returns {string[]}
 */
AppSlots.prototype.copy = function copy () {
  return [ this.cut, this.scene ].filter(it => it != null)
}

/**
 * Reset app slots.
 */
AppSlots.prototype.reset = function reset () {
  this.cut = null
  this.scene = null
}

module.exports = LaVieEnPile
/**
 * App life time management
 *
 * 1. CreateApp -> app created, now inactive
 * 2. ActivateApp -> app activated, now on top of stack
 * 3. DeactivateApp -> app deactivated, now inactive
 * 4. SetBackground -> app running in background
 * 5. DestroyApp -> app suspended, waiting for eviction
 *
 * - OnLifeCycle -> send events to app
 *
 * @author Chengzhong Wu <chengzhong.wu@rokid.com>
 * @param {AppLoader} loader - AppLoader that loaded or loading apps.
 *
 */
function LaVieEnPile (loader) {
  EventEmitter.call(this)
  // App Executor
  this.loader = loader
  /**
   * @typedef AppPreemptionData
   * @property {'cut' | 'scene'} form
   */
  /**
   * App stack preemption priority data, keyed by app id.
   *
   * @see AppPreemptionData
   * @type {object}
   */
  this.appDataMap = {}
  /**
   * Apps' id running actively.
   * @type {AppSlots}
   */
  this.activeSlots = new AppSlots()
  /**
   * Apps' id running inactively and not background.
   * @type {string[]}
   */
  this.inactiveAppIds = []
  /**
   * Some app may have permissions to call up on other app,
   * in which case, the app which has the permission will be stored
   * on `this.carrier`, and the one called up preempts the top of stack.
   * Since there is only one app could be on top of stack, single carrier slot
   * might be sufficient.
   */
  this.carrierId = null
  this.lastSubordinate = null
  /**
   * Some app may have permissions to monopolize top of stack,
   * in which case, no other apps could interrupts it's monologue.
   */
  this.monopolist = null

  /**
   * Determines if lifetime is been paused globally by system.
   * Especially used in device activation to pause currently running app.
   */
  this.appIdOnPause = null
}
/**
 * On stack updated, might have be de-bounced
 * @event stack-update
 * @param {string[]} stack - new stack
 */
/**
 * On stack reset, might have be de-bounced
 * @event stack-reset
 */
inherits(LaVieEnPile, EventEmitter)

// MARK: - Getters

/**
 * Get app id of top app in stack.
 * @returns {string | null} appId, or undefined if no app was in stack.
 */
LaVieEnPile.prototype.getCurrentAppId = function getCurrentAppId () {
  var appId = this.activeSlots.cut
  if (appId != null) {
    return appId
  }
  appId = this.activeSlots.scene
  return appId
}

/**
 * Get app preemption priority data by app id.
 * @param {string} appId -
 * @returns {object | undefined} app preemption priority data, or undefined if data for the app doesn't exist.
 */
LaVieEnPile.prototype.getAppDataById = function getAppDataById (appId) {
  return this.appDataMap[appId]
}

/**
 * Get if app is running in background (neither inactive nor active in stack).
 * @param {string} appId -
 * @returns {boolean} true if in background, false otherwise.
 */
LaVieEnPile.prototype.isBackgroundApp = function isBackgroundApp (appId) {
  return this.isAppRunning(appId) && !(this.isAppActive(appId) || this.isAppInactive(appId))
}

/**
 * Get if app is active (neither inactive nor in background).
 * @param {string} appId -
 * @returns {boolean} true if active, false otherwise.
 */
LaVieEnPile.prototype.isAppActive = function isAppActive (appId) {
  return this.activeSlots.cut === appId || this.activeSlots.scene === appId
}

/**
 * Get if app is inactive (neither active in stack nor in background).
 * @param {string} appId -
 * @returns {boolean} true if inactive, false otherwise.
 */
LaVieEnPile.prototype.isAppInactive = function isAppInactive (appId) {
  return this.inactiveAppIds.indexOf(appId) >= 0
}

/**
 * Get if app is running (app is active, inactive, or in background).
 * @param {string} appId -
 * @returns {boolean} true if running, false otherwise.
 */
LaVieEnPile.prototype.isAppRunning = function isAppRunning (appId) {
  return this.loader.getAppById(appId) != null
}

/**
 * Get if app is a daemon app (shall be switched to background on deactivating).
 * @param {string} appId -
 * @returns {boolean} true if is a daemon app, false otherwise.
 */
LaVieEnPile.prototype.isDaemonApp = function isDaemonApp (appId) {
  return _.get(this.loader.getExecutorByAppId(appId), `daemon`) === true
}

/**
 * Determines if top of stack is monopolized.
 *
 * If LaVieEnPile#monopolist is set, yet following conditions not matched, monopolization would be revoked:
 * - is current app
 * - app is alive
 */
LaVieEnPile.prototype.isMonopolized = function isMonopolized () {
  if (typeof this.monopolist === 'string') {
    if (this.getCurrentAppId() === this.monopolist &&
      this.loader.getAppById(this.monopolist) != null) {
      return true
    }
    this.monopolist = null
  }
  return false
}

// MARK: - END Getters

// MARK: - Stack Manipulation

/**
 * Create app, yet does not activate it, and set it as inactive.
 *
 * Possible subsequent calls:
 *   - LaVieEnPile#activateAppById
 *   - LaVieEnPile#setBackgroundById
 *
 * @param {string} appId -
 * @returns {Promise<AppDescriptor>}
 */
LaVieEnPile.prototype.createApp = function createApp (appId) {
  var appCreated = this.isAppRunning(appId)
  if (appCreated) {
    /** No need to recreate app */
    logger.info('app is already running, skip creating', appId)
    return Promise.resolve(this.loader.getAppById(appId))
  }

  // Launch app
  logger.info('app is not running, creating', appId)
  var executor = this.loader.getExecutorByAppId(appId)
  if (executor == null) {
    return Promise.reject(new Error(`App ${appId} not registered`))
  }

  return executor.create()
    .then(() => {
      this.inactiveAppIds.push(appId)
      return this.onLifeCycle(appId, 'create')
    })
}

/**
 * Activate given app with form to preempting top of stack.
 *
 * 1. deactivate all apps in stack if a carrier app stands
 * 2. resolve if app is top of stack
 * 3. - promote app to top of stack if app is in background
 *    - set app to active if app is inactive
 * 4. - deactivate all apps in stack if app is a scene
 *    - demote last top app if app is a cut
 *      - deactivate last top app if it is a cut
 *      - pause last top app if it is a scene
 *
 * Possible subsequent calls:
 *   - LaVieEnPile#deactivateAppById
 *   - LaVieEnPile#setBackgroundById
 *
 * @param {string} appId -
 * @param {'cut' | 'scene'} [form] -
 * @param {string} [carrierId] - if app start activated by another app, that app shall be a carrier and be attached to the newly activated app.
 * @param {object} [options] -
 * @param {any[]} [options.resumeParams] -
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.activateAppById = function activateAppById (appId, form, carrierId, options) {
  var resumeParams = _.get(options, 'resumeParams', [])

  if (!this.isAppRunning(appId)) {
    return Promise.reject(new Error(`App ${appId} is not running, launch it first.`))
  }

  if (form == null) {
    form = 'cut'
  }

  if (this.isMonopolized() && appId !== this.monopolist) {
    return Promise.reject(new Error(`App ${this.monopolist} monopolized top of stack.`))
  }

  var wasScene = _.get(this.appDataMap, `${appId}.form`) === 'scene'
  this.appDataMap[appId] = Object.assign({}, this.appDataMap[appId], { form: wasScene ? 'scene' : form })

  var future = Promise.resolve()

  // temporary carrier id store
  var cid = this.carrierId
  var lastSubordinate = this.lastSubordinate
  this.carrierId = carrierId
  if (carrierId != null) {
    logger.info(`subordinate ${appId} brought to active by carrier`, carrierId)
    this.lastSubordinate = appId
  }
  if (cid != null) {
    /**
     * if previous app is started by a carrier,
     * exit the carrier before next steps.
     */
    logger.info(`previous app ${lastSubordinate} started by a carrier`, cid)
    if (cid !== appId && this.isAppRunning(cid)) {
      logger.info(`carrier ${cid} is alive and not the app to be activated, destroying`)
      future = future.then(() => this.destroyAppById(cid))
    }
  }

  if (appId === this.getCurrentAppId()) {
    /**
     * App is the currently running one
     */
    logger.info('app is top of stack, skipping resuming', appId)
    this.activeSlots.addApp(appId, wasScene || form === 'scene')
    return future
  }

  if (this.isBackgroundApp(appId)) {
    /**
     * Pull the app to foreground if running in background
     */
    logger.info('app is running in background, resuming', appId)
  } else {
    logger.info('app is running inactively, resuming', appId)
    var idx = this.inactiveAppIds.indexOf(appId)
    if (idx >= 0) {
      this.inactiveAppIds.splice(idx, 1)
    }
  }

  /** push app to top of stack */
  var lastAppId = this.getCurrentAppId()
  var stack = this.activeSlots.copy()
  this.activeSlots.addApp(appId, wasScene || form === 'scene')
  this.onStackUpdate()
  var deferred = () => {
    return this.onLifeCycle(appId, 'resume', resumeParams)
  }

  if (form === 'scene') {
    // Exit all apps in stack on incoming scene nlp
    logger.info(`on scene app '${appId}' preempting, deactivating all apps in stack.`)
    return future.then(() =>
      Promise.all(stack.filter(it => it !== appId)
        .map(it => this.deactivateAppById(it, { recover: false, force: true }))))
      .then(deferred)
  }

  var last = this.getAppDataById(lastAppId)
  if (!last) {
    /** no previously running app */
    logger.info('no previously running app, skip preempting')
    /** deferred shall be ran in current context to prevent possible simultaneous preemption */
    return Promise.all([ deferred(), future ])
  }

  if (last.form === 'scene') {
    /**
     * currently running app is a scene app, pause it
     */
    logger.info(`on cut app '${appId}' preempting, pausing previous scene app`)
    return future.then(() => this.onLifeCycle(lastAppId, 'pause'))
      .catch(err => logger.warn('Unexpected error on pausing previous app', err.stack))
      .then(deferred)
  }

  /**
   * currently running app is a normal app, deactivate it
   */
  logger.info(`on cut app '${appId}' preempting, deactivating previous cut app '${lastAppId}'`)
  /** no need to recover previously paused scene app if exists */
  return future.then(() => this.deactivateAppById(lastAppId, { recover: false, force: true }))
    .then(deferred)
}

/**
 * Deactivate app. Could be trigger by app itself, or it's active status was preempted by another app.
 * Once an app was deactivated, it's resources may be collected by app runtime.
 *
 * **Also resumes last non-top app in stack by default.**
 *
 * > Note: deactivating doesn't apply to apps that not in stack.
 *
 * On deactivating:
 * - non-daemon app: destroyed
 * - daemon app: switched to background
 *
 * Possible subsequent calls:
 *   - LaVieEnPile#setForegroundById
 *
 * @param {string} appId -
 * @param {object} [options] -
 * @param {boolean} [options.recover] - if recover previous app
 * @param {boolean} [options.force] - deactivate the app whether it is in stack or not
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.deactivateAppById = function deactivateAppById (appId, options) {
  var recover = _.get(options, 'recover', true)
  var force = _.get(options, 'force', false)

  if (this.monopolist === appId) {
    this.monopolist = null
  }

  var removed = this.activeSlots.removeApp(appId)
  if (!removed && !force) {
    /** app is in stack, no need to be deactivated */
    logger.info('app is not in stack, skip deactivating', appId)
    return Promise.resolve()
  }
  logger.info('deactivating app', appId, ', recover?', recover)

  delete this.appDataMap[appId]
  if (removed) {
    this.onStackUpdate()
  }

  var deactivating = this.destroyAppById(appId)

  var carrierId
  if (appId === this.lastSubordinate) {
    this.lastSubordinate = null
    /** if app is started by a carrier, unset the flag on exit */
    carrierId = this.carrierId
    this.carrierId = null
  }

  if (!recover) {
    return deactivating
  }

  if (carrierId) {
    /**
     * If app is brought up by a carrier, re-activate the carrier on exit of app.
     */
    if (this.isAppRunning(carrierId)) {
      logger.info(`app ${appId} is brought up by a carrier '${carrierId}', recovering.`)
      return deactivating.then(() => {
        return this.activateAppById(carrierId)
      })
    }
    logger.info(`app ${appId} is brought up by a carrier '${carrierId}', yet carrier is already died, skip recovering carrier.`)
  }

  logger.info('recovering previous app on deactivating.')
  return deactivating.then(() => {
    if (this.appIdOnPause != null) {
      logger.info('LaVieEnPile is paused, skip resuming on deactivation.')
      return
    }

    var lastAppId = this.getCurrentAppId()
    if (lastAppId) {
      /**
       * Since last app is already on top of stack, no need to re-activate it,
       * a simple life cycle event is sufficient.
       */
      return this.onLifeCycle(lastAppId, 'resume')
        .catch(err => logger.warn('Unexpected error on restoring previous app', err.stack))
    }
  })
}

/**
 * Deactivate all apps in stack.
 *
 * @param {object} [options] -
 * @param {string[]} [options.excepts] - do not include these app on deactivation
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.deactivateAppsInStack = function deactivateAppsInStack (options) {
  var excepts = _.get(options, 'excepts')

  var self = this
  var stack = [ this.activeSlots.cut, this.activeSlots.scene ]
  if (Array.isArray(excepts) && excepts.length > 0) {
    logger.info('deactivating apps in stack, excepts', excepts)
    stack = stack.filter(it => excepts.indexOf(it) < 0)
  } else {
    logger.info('deactivating apps in stack')
  }
  /** deactivate apps in stack in a reversed order */
  return Promise.all(stack.map(step)) // .then(() => self.onStackReset())

  function step (appId) {
    /** all apps in stack are going to be deactivated, no need to recover */
    return self.deactivateAppById(appId, { recover: false })
      .catch(err => logger.warn('Unexpected error on deactivating app', appId, err))
  }
}

/**
 * Switch app to background.
 * **Also resumes non-top app in stack.**
 *
 * Possible subsequent calls:
 *   - LaVieEnPile#setForegroundById
 *
 * @param {string} appId
 * @returns {Promise<ActivityDescriptor>}
 */
LaVieEnPile.prototype.setBackgroundById = function (appId, options) {
  var recover = _.get(options, 'recover', true)

  logger.info('set background', appId)
  var inactiveIdx = this.inactiveAppIds.indexOf(appId)
  if (inactiveIdx >= 0) {
    this.inactiveAppIds.splice(inactiveIdx, 1)
  }

  var removed = this.activeSlots.removeApp(appId)
  if (removed) {
    delete this.appDataMap[appId]
    this.onStackUpdate()
  }

  if (inactiveIdx < 0 && !removed) {
    logger.info('app already in background', appId)
    return Promise.resolve()
  }

  var future = this.onLifeCycle(appId, 'background')

  if (!recover || !removed) {
    /**
     * No recover shall be taken if app is not active.
     */
    return Promise.resolve()
  }

  if (this.appIdOnPause != null) {
    logger.info('LaVieEnPile is paused, skip resuming on setBackground.')
    return future
  }

  /**
   * Try to resume previous app only when app is active too.
   */
  var lastAppId = this.getCurrentAppId()
  if (lastAppId == null) {
    return future
  }
  return future.then(() =>
    this.onLifeCycle(lastAppId, 'resume')
      .catch(err => logger.error('Unexpected error on resuming previous app', err.stack)))
}

/**
 * Preempts top of stack and switch app to foreground.
 *
 * Possible subsequent calls:
 *   - LaVieEnPile#deactivateAppById
 *   - LaVieEnPile#setBackgroundById
 *
 * @param {string} appId
 * @param {'cut' | 'scene'} [form]
 */
LaVieEnPile.prototype.setForegroundById = function (appId, form) {
  if (!this.isBackgroundApp(appId)) {
    logger.warn('app is not in background, yet trying to set foreground', appId)
  }
  logger.info('set foreground', appId, form)
  return this.activateAppById(appId, form)
}

// MARK: - END Stack Manipulation

// MARK: - App Events

/**
 * Emit life cycle event to app asynchronously.
 *
 * > NOTE: doesn't perform any actual life cycle operations, only event emitting.
 *
 * @param {string} appId - app id
 * @param {string} event - event name to be emitted
 * @param {any[]} params -
 * @returns {Promise<ActivityDescriptor | undefined>} LifeCycle events are asynchronous.
 */
LaVieEnPile.prototype.onLifeCycle = function onLifeCycle (appId, event, params) {
  var app = this.loader.getAppById(appId)
  if (app == null) {
    return Promise.reject(new Error(`Trying to send life cycle '${event}' to app '${appId}', yet it's not created.`))
  }

  logger.info('on life cycle', event, appId)
  emit(app)

  return Promise.resolve(app)

  function emit (target) {
    if (params === undefined) {
      params = []
    }
    EventEmitter.prototype.emit.apply(target, [ event ].concat(params))
  }
}

/**
 * Emit event `stack-update` with current app id stack to listeners.
 */
LaVieEnPile.prototype.onStackUpdate = function onStackUpdate () {
  var stack = [ this.activeSlots.cut, this.activeSlots.scene ]
  process.nextTick(() => {
    this.emit('stack-update', stack)
  })
}

/**
 * Emit event `stack-reset` to listeners.
 */
LaVieEnPile.prototype.onStackReset = function onStackReset () {
  process.nextTick(() => {
    this.emit('stack-reset')
  })
}

// MARK: - END App Events

// MARK: - App Termination

/**
 * Destroy all app managed by LaVieEnPile.
 *
 * **Also destroy daemon apps.**
 *
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.destroyAll = function (options) {
  var force = _.get(options, 'force', false)

  logger.log(`destroying all apps${force ? ' by force' : ''}`)
  this.appDataMap = {}

  var self = this
  var ids = this.loader.getAppIds()
    .filter(id => this.loader.getAppById(id) != null)
  self.activeSlots.reset()
  this.onStackReset()
  /** destroy apps in stack in a reversed order */
  return Promise.all(ids.map(step))

  function step (appId) {
    return self.destroyAppById(appId, { force: force })
      .catch(err => logger.warn('Unexpected error on destroying app', appId, err))
  }
}

/**
 * Destroy the app managed by LaVieEnPile.
 *
 * **Also destroy daemon apps.**
 *
 * @param {string} appId -
 * @param {object} [options] -
 * @param {boolean} [options.force=false] -
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.destroyAppById = function (appId, options) {
  var force = _.get(options, 'force', false)

  /**
   * Try remove app id from stacks.
   */
  this.activeSlots.removeApp(appId)
  var inactiveIdx = this.inactiveAppIds.indexOf(appId)

  if (!force && this.isDaemonApp(appId)) {
    if (inactiveIdx < 0) {
      this.inactiveAppIds.push(appId)
    }
    return this.onLifeCycle(appId, 'destroy')
      .catch(err => logger.warn('Unexpected error on life cycle destroy previous app', err.stack))
  }

  if (inactiveIdx >= 0) {
    this.inactiveAppIds.splice(inactiveIdx, 1)
  }

  var deferred = () => {
    /**
     * Remove apps from records of LaVieEnPile.
     */
    delete this.appDataMap[appId]
    return this.loader.getExecutorByAppId(appId).destruct()
  }

  return this.onLifeCycle(appId, 'destroy')
    .then(deferred, err => {
      logger.warn('Unexpected error on send destroy event to app.', err.stack)
      return deferred()
    })
}

// MARK: - END App Termination

/**
 * Pause lifetime intentionally by system.
 * @returns {void}
 */
LaVieEnPile.prototype.pauseLifetime = function pauseLifetime () {
  if (this.appIdOnPause != null) {
    logger.info('LaVieEnPile already paused, skipping pausing.')
    return Promise.resolve()
  }
  var currentAppId = this.appIdOnPause = this.getCurrentAppId()

  logger.info('paused LaVieEnPile, current app', currentAppId)

  return Promise.resolve()
}

/**
 *
 * @param {object} [options] -
 * @param {boolean} [options.recover] - if previously stopped app shall be recovered
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.resumeLifetime = function resumeLifetime (options) {
  var recover = _.get(options, 'recover', false)

  if (this.appIdOnPause == null) {
    logger.info('no paused app found, skip resuming LaVieEnPile.')
    return Promise.resolve()
  }
  var appIdOnPause = this.appIdOnPause
  this.appIdOnPause = null

  var currentAppId = this.getCurrentAppId()
  logger.info('resuming LaVieEnPile, recover?', recover, 'app in pause:', appIdOnPause, 'current app:', currentAppId)

  if (!recover) {
    return Promise.resolve()
  }
  if (appIdOnPause != null && currentAppId === appIdOnPause) {
    /**
     * Since no app is allowed to preempt top of stack, only deactivation could change current app id.
     * yet if current app is exactly the app on pause,
     * resume of app at bottom of stack is not needed.
     */
    return Promise.resolve()
  }

  if (currentAppId == null) {
    return Promise.resolve()
  }
  return this.onLifeCycle(currentAppId, 'resume')
    .catch(err => logger.error('Unexpected error on resuming previous app', err.stack))
}
