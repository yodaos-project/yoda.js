'use strict'
var EventEmitter = require('events')
var inherits = require('util').inherits

var logger = require('logger')('la-vie')
var _ = require('@yoda/util')._

/**
 * Active app slots. Only two slots are currently supported: cut and scene.
 * And only two app could be able to be on slots simultaneously.
 */
function AppSlots (cut, scene) {
  this.cut = cut
  this.scene = scene
}

AppSlots.prototype.addApp = function addApp (appId, isScene) {
  if (isScene) {
    this.cut = null
    this.scene = appId
    return
  }
  this.cut = appId
}

/**
 * Remove app from app slots.
 * @param {string} appId
 * @returns {false|'cut'|'scene'} returns form if app is removed from slots, false otherwise.
 */
AppSlots.prototype.removeApp = function removeApp (appId) {
  if (appId == null) {
    return false
  }
  if (this.cut === appId) {
    this.cut = null
    return 'cut'
  }
  if (this.scene === appId) {
    this.scene = null
    return 'scene'
  }
  return false
}

/**
 * Get a copy of current slots.
 *
 * @returns {AppSlots}
 */
AppSlots.prototype.copy = function copy () {
  return new AppSlots(this.cut, this.scene)
}

/**
 * Get a array copy of current slots in array form.
 *
 * @returns {string[]}
 */
AppSlots.prototype.toArray = function toArray () {
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
 * @param {AppScheduler} scheduler - AppScheduler that manages app processes.
 *
 */
function LaVieEnPile (runtime) {
  EventEmitter.call(this)
  this.scheduler = runtime.component.appScheduler
  /**
   * @typedef ContextOptionsData
   * @property {'cut' | 'scene'} form
   * @property {boolean} keepAlive
   */
  /**
   * App stack preemption priority data, keyed by app id.
   *
   * @type {ContextOptionsData}
   */
  this.contextOptionsMap = {}
  /**
   * Apps' id running actively.
   * @type {AppSlots}
   */
  this.activeSlots = new AppSlots()
  /**
   * Apps' id running in background.
   * @type {string[]}
   */
  this.backgroundAppIds = []
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
 * On app been evicted from stack
 * @event evict
 * @param {string} appId - the app id to be evicted
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
 * @returns {ContextOptionsData | undefined} app preemption priority data, or undefined if data for the app doesn't exist.
 */
LaVieEnPile.prototype.setContextOptionsById = function setContextOptionsById (appId, options) {
  var prevOptions = this.contextOptionsMap[appId]
  this.contextOptionsMap[appId] = Object.assign({}, prevOptions, options)
  return options
}

/**
 * Get app preemption priority data by app id.
 * @param {string} appId -
 * @returns {ContextOptionsData | undefined} app preemption priority data, or undefined if data for the app doesn't exist.
 */
LaVieEnPile.prototype.getContextOptionsById = function getContextOptionsById (appId) {
  return this.contextOptionsMap[appId]
}

/**
 * Get if app is running in background (neither inactive nor active in stack).
 * @param {string} appId -
 * @returns {boolean} true if in background, false otherwise.
 */
LaVieEnPile.prototype.isBackgroundApp = function isBackgroundApp (appId) {
  return this.backgroundAppIds.indexOf(appId) >= 0
}

/**
 * Get if app is active (neither inactive nor in background).
 * @param {string} appId -
 * @returns {boolean} true if active, false otherwise.
 */
LaVieEnPile.prototype.isAppInStack = function isAppInStack (appId) {
  return this.activeSlots.cut === appId || this.activeSlots.scene === appId
}

/**
 * Get if app is inactive (neither active in stack nor in background).
 * @param {string} appId -
 * @returns {boolean} true if inactive, false otherwise.
 */
LaVieEnPile.prototype.isAppInactive = function isAppInactive (appId) {
  return this.scheduler.isAppRunning(appId) &&
    !(this.isAppInStack(appId) || this.isBackgroundApp(appId))
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
    if (this.isAppInStack(this.monopolist) &&
      this.scheduler.isAppRunning(this.monopolist)) {
      return true
    }
    this.monopolist = null
  }
  return false
}

/**
 * Oppress the given event if monopolist is available.
 *
 * @param {string} appId
 * @param {boolean} [options.preemptive=true]
 * @param {string} [options.form='cut']
 * @returns {Promise<boolean>} Promise of false if event doesn't been oppressed, true otherwise.
 */
LaVieEnPile.prototype.guardMonopolization = function guardMonopolization (appId, options) {
  var preemptive = _.get(options, 'preemptive', true)
  var form = _.get(options, 'form', 'cut')
  if (!preemptive) {
    return false
  }
  if (!this.isMonopolized()) {
    return false
  }
  if (appId === this.monopolist) {
    return false
  }
  if (form === 'cut' && this.activeSlots.scene === this.monopolist) {
    logger.info(`current monopolist is a scene app, bypassing upcoming cut app(${appId})`)
    return false
  }
  return true
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
 * > Deprecated: Use AppScheduler.createApp instead.
 *
 * @param {string} appId -
 * @returns {Promise<AppDescriptor>}
 */
LaVieEnPile.prototype.createApp = function createApp (appId) {
  return this.scheduler.createApp(appId)
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
 * @param {any[]} [options.activateParams] -
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.activateAppById = function activateAppById (appId, form, carrierId, options) {
  var activateParams = _.get(options, 'activateParams', [])

  if (!this.scheduler.isAppRunning(appId)) {
    return Promise.reject(new Error(`App ${appId} is ${this.scheduler.getAppStatusById(appId)}, launch it first.`))
  }

  if (form == null) {
    form = 'cut'
  }

  if (this.guardMonopolization(appId, { form: form, preemptive: true })) {
    return Promise.reject(new Error(`App ${this.monopolist} monopolized top of stack.`))
  }

  var wasScene = _.get(this.getContextOptionsById(appId), 'form') === 'scene'
  this.setContextOptionsById(appId, { form: wasScene ? 'scene' : form })

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
    if (cid !== appId && cid !== carrierId && this.scheduler.isAppRunning(cid)) {
      logger.info(`carrier ${cid} is alive and not the app to be activated, destroying`)
      future = future.then(() => this.destroyAppById(cid))
    }
  }

  var isScene = wasScene || form === 'scene'
  if (appId === this.getCurrentAppId() &&
    this.activeSlots[isScene ? 'scene' : 'cut'] === appId) {
    /**
     * App is the currently running one
     */
    logger.info('app is top of stack, skipping resuming', appId)
    this.activeSlots.addApp(appId, isScene)
    return future
  }

  var backgroundIdx = this.backgroundAppIds.indexOf(appId)
  if (backgroundIdx >= 0) {
    /**
     * Pull the app to foreground if running in background
     */
    logger.info('app is running in background, resuming', appId)
    this.backgroundAppIds.splice(backgroundIdx, 1)
  } else {
    logger.info('app is running inactively, resuming', appId)
  }

  /** push app to top of stack */
  var lastAppId = this.getCurrentAppId()
  var lastContext = this.getContextOptionsById(lastAppId)
  if (lastAppId && lastContext && lastAppId !== appId) {
    this.onPreemption(lastAppId, lastContext)
  }
  var memoStack = this.activeSlots.copy()
  this.activeSlots.addApp(appId, isScene)
  var deferred = () => {
    return this.onLifeCycle(appId, 'active', activateParams)
  }

  if (form === 'scene') {
    // Exit all apps in stack on incoming scene nlp
    logger.info(`on scene app '${appId}' preempting, deactivating all apps in stack.`)
    if (memoStack.cut !== appId) {
      this.onEviction(memoStack.cut, _.get(this.getContextOptionsById(lastAppId), 'form'))
    }
    if (memoStack.scene !== appId) {
      this.onEviction(memoStack.scene, _.get(this.getContextOptionsById(lastAppId), 'form'))
    }
    var memoIds = memoStack.toArray().filter(it => it !== appId)
    return future.then(() =>
      Promise.all(memoIds.map(it => this.deactivateAppById(it, { recover: false, force: true })))
    ).then(deferred)
  }

  if (lastContext == null) {
    /** no previously running app */
    logger.info('no previously running app, skip preempting')
    /** deferred shall be ran in current context to prevent possible simultaneous preemption */
    return Promise.all([ deferred(), future ])
  }

  if (lastContext.form === 'scene') {
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
  this.onEviction(lastAppId, _.get(this.getContextOptionsById(lastAppId), 'form'))

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
 * @param {boolean} [options.ignoreKeptAlive] - ignore contextOptions.keepAlive
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.deactivateAppById = function deactivateAppById (appId, options) {
  var recover = _.get(options, 'recover', true)
  var force = _.get(options, 'force', false)
  var ignoreKeptAlive = _.get(options, 'ignoreKeptAlive', false)

  if (this.monopolist === appId) {
    this.monopolist = null
  }
  var currentAppId = this.getCurrentAppId()

  var removedSlot = this.activeSlots.removeApp(appId)
  if (!removedSlot && !force) {
    /** app is in stack, no need to be deactivated */
    logger.info('app is not in stack, skip deactivating', appId)
    return Promise.resolve()
  }
  logger.info('deactivating app', appId, ', recover?', recover, `currentApp(${currentAppId})`)
  if (recover && currentAppId !== appId) {
    recover = false
  }

  var contextOptions = this.contextOptionsMap[appId]
  delete this.contextOptionsMap[appId]
  if (removedSlot) {
    this.onEviction(appId, _.get(contextOptions, 'form'))
  }

  var future
  if (ignoreKeptAlive || _.get(contextOptions, 'keepAlive') !== true) {
    future = this.destroyAppById(appId)
  } else {
    logger.info(`app '${appId}' was kept alive`)
    future = this.setBackgroundById(appId, { recover: false })
  }

  return this.recoverIfPossibleAfter(future, appId, recover && removedSlot)
}

LaVieEnPile.prototype.recoverIfPossibleAfter = function recoverIfPossibleAfter (future, appId, recover) {
  var carrierId
  if (appId === this.lastSubordinate) {
    this.lastSubordinate = null
    /** if app is started by a carrier, unset the flag on exit */
    carrierId = this.carrierId
    this.carrierId = null
  }

  if (!recover) {
    return future
  }

  if (this.appIdOnPause != null) {
    logger.info('LaVieEnPile is paused, skip resuming on recover.')
    return future
  }

  if (carrierId) {
    /**
     * If app is brought up by a carrier, re-activate the carrier on exit of app.
     */
    if (this.scheduler.isAppRunning(carrierId)) {
      logger.info(`app ${appId} is brought up by a carrier '${carrierId}', recovering.`)
      return future.then(() => {
        return this.activateAppById(carrierId, undefined, undefined, { activateParams: [ { reason: 'carrier', carriageId: appId } ] })
      })
    }
    logger.info(`app ${appId} is brought up by a carrier '${carrierId}', yet carrier is already died, skip recovering carrier.`)
  }

  logger.info('recovering previous app on deactivating.')
  return future.then(() => {
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
 * @param {object} [options]
 * @param {boolean} [options.recover]
 * @returns {Promise<ActivityDescriptor>}
 */
LaVieEnPile.prototype.setBackgroundById = function (appId, options) {
  var recover = _.get(options, 'recover', true)

  logger.info('set background', appId)
  var removedSlot = this.activeSlots.removeApp(appId)
  if (removedSlot) {
    var contextOptions = this.contextOptionsMap[appId]
    delete this.contextOptionsMap[appId]
    this.onEviction(appId, _.get(contextOptions, 'form'))
  }

  var idx = this.backgroundAppIds.indexOf(appId)
  if (idx >= 0 && !removedSlot) {
    logger.info('app already in background', appId)
    return Promise.resolve()
  }
  if (idx < 0) {
    this.backgroundAppIds.push(appId)
  }

  var future = this.onLifeCycle(appId, 'background')

  /**
   * No recover shall be taken if app is not active.
   */
  return this.recoverIfPossibleAfter(future, appId, recover && removedSlot)
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
  var app = this.scheduler.getAppById(appId)
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
 * Emit event `eviction` with the evicted app id as first argument to listeners.
 */
LaVieEnPile.prototype.onEviction = function onEvict (appId, form) {
  if (!appId) {
    return
  }
  var isIdle = !this.getCurrentAppId()
  process.nextTick(() => {
    this.emit('eviction', appId, form)
    if (isIdle) {
      this.emit('idle')
    }
  })
}

/**
 * Emit event `preemption` with the app id as first argument to listeners.
 *
 * @param {string} appId
 * @param {ContextOptionsData} contextOptions
 */
LaVieEnPile.prototype.onPreemption = function onPreemption (appId, contextOptions) {
  if (!appId) {
    return
  }
  process.nextTick(() => {
    this.emit('preemption', appId, contextOptions.form)
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
  this.activeSlots.reset()
  this.contextOptionsMap = {}
  this.backgroundAppIds = []

  this.onStackReset()
  /** destroy apps in stack in a reversed order */
  // TODO: use event `suspend` instead of `destroy` in LaVieEnPile
  return Promise.all(Object.keys(this.scheduler.appMap)
    .map(it => {
      if (!this.scheduler.isAppRunning(it)) {
        /**
         * App is already not running, skip destroying.
         */
        return Promise.resolve()
      }
      return this.onLifeCycle(it, 'destroy')
        .catch(err => logger.error('Unexpected error on send destroy event to app', it, err.stack))
    }))
    .then(() => this.scheduler.suspendAllApps({ force: force }))
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
   * Remove apps from records of LaVieEnPile.
   */
  this.activeSlots.removeApp(appId)
  var backgroundIdx = this.backgroundAppIds.indexOf(appId)
  if (this.backgroundAppIds >= 0) {
    this.backgroundAppIds.splice(backgroundIdx, 1)
  }
  delete this.contextOptionsMap[appId]

  if (!this.scheduler.isAppRunning(appId)) {
    /**
     * App is already not running, skip destroying.
     */
    logger.info(`app(${appId}) is not running, skip destroying.`)
    return Promise.resolve()
  }

  // TODO: use event `suspend` instead of `destroy` in LaVieEnPile
  return this.onLifeCycle(appId, 'destroy')
    .then(
      () => this.scheduler.suspendApp(appId, { force: force }),
      err => {
        logger.error('Unexpected error on send destroy event to app', appId, err.stack)
        this.scheduler.suspendApp(appId, { force: force })
      }
    )
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

/**
 * Deactivate current cut app if exists.
 */
LaVieEnPile.prototype.deactivateCutApp = function deactivateCutApp (options) {
  var expectedAppId = _.get(options, 'appId')
  var appId = this.activeSlots.cut
  if (appId == null) {
    logger.info('no currently running cut app, skipping')
    return Promise.resolve()
  }
  if (expectedAppId && appId !== expectedAppId) {
    logger.info('currently active cut app is not the one been expected, skipping')
    return Promise.resolve()
  }
  if (appId === this.monopolist) {
    logger.info('current cut app is running as monologue, skipping')
    return Promise.resolve()
  }
  logger.info('deactivate cut app', appId)
  return this.deactivateAppById(appId, options)
}
