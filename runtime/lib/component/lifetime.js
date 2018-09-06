'use strict'
var EventEmitter = require('events')
var inherits = require('util').inherits

var logger = require('logger')('la-vie')
var _ = require('@yoda/util')._

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
 * @param {object} executors - AppExecutors map used to create apps, keyed by app id.
 */
function LaVieEnPile (executors) {
  EventEmitter.call(this)
  // App Executor
  this.executors = executors
  this.apps = {}
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
   * @type {string[]}
   */
  this.appIdStack = []
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
}
inherits(LaVieEnPile, EventEmitter)

// MARK: - Getters

/**
 * Get app id of top app in stack.
 * @returns {string | undefined} appId, or undefined if no app was in stack.
 */
LaVieEnPile.prototype.getCurrentAppId = function getCurrentAppId () {
  if (this.appIdStack.length === 0) {
    return undefined
  }
  return this.appIdStack[this.appIdStack.length - 1]
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
 * Get running app instance by app id.
 * @param {string} appId -
 * @returns {AppDescriptor | undefined} app instance, or undefined if app is not running.
 */
LaVieEnPile.prototype.getAppById = function getAppById (appId) {
  return this.apps[appId]
}

/**
 * Get if app is running in background (neither inactive nor active in stack).
 * @param {string} appId -
 * @returns {boolean} true if in background, false otherwise.
 */
LaVieEnPile.prototype.isBackgroundApp = function isBackgroundApp (appId) {
  return this.isAppRunning(appId) && !(this.isAppInStack(appId) || this.isAppInactive(appId))
}

/**
 * Get if app is in active stack (neither inactive nor in background).
 * @param {string} appId -
 * @returns {boolean} true if active, false otherwise.
 */
LaVieEnPile.prototype.isAppInStack = function isAppInStack (appId) {
  return this.appIdStack.indexOf(appId) >= 0
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
  return this.getAppById(appId) != null
}

/**
 * Get if app is a daemon app (shall be switched to background on deactivating).
 * @param {string} appId -
 * @returns {boolean} true if is a daemon app, false otherwise.
 */
LaVieEnPile.prototype.isDaemonApp = function isDaemonApp (appId) {
  return this.executors[appId].daemon === true
}

// MARK: - END Getters

// MARK: - Stack Manipulation

/**
 * Create app, yet does not activate it, and set it as inactive.
 *
 * - daemon app: created as background app
 * - non-daemon app: created as inactive app
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
    return Promise.resolve(this.getAppById(appId))
  }

  // Launch app
  logger.info('app is not running, creating', appId)
  var executor = this.executors[appId]
  if (executor == null) {
    // FIXME: what if executor doesn't exists for app
    return Promise.reject(new Error(`App ${appId} not registered`))
  }

  return executor.create()
    .then(app => {
      this.apps[appId] = app
      if (!this.isDaemonApp(appId)) {
        this.inactiveAppIds.push(appId)
      }
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
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.activateAppById = function activateAppById (appId, form, carrierId) {
  if (!this.isAppRunning(appId)) {
    return Promise.reject(new Error('App is not running, launch it first.'))
  }

  if (form == null) {
    form = 'cut'
  }

  var wasScene = _.get(this.appDataMap, `${appId}.form`) === 'scene'
  this.appDataMap[appId] = Object.assign({}, this.appDataMap[appId], { form: wasScene ? 'scene' : form })

  var future = Promise.resolve()

  if (this.carrierId) {
    /**
     * if previous app is started by a carrier,
     * exit the carrier before next steps.
     */
    logger.info('previous app started by a carrier, ', this.carrierId)
    future = future.then(() => this.deactivateAppsInStack())
  }
  this.carrierId = carrierId

  if (appId === this.getCurrentAppId()) {
    /**
     * App is the currently running one
     */
    logger.info('app is top of stack, skipping resuming', appId)
    return future
  }

  if (this.isBackgroundApp(appId)) {
    /**
     * Pull the app to foreground if running in background
     */
    logger.info('app is running, resuming', appId)
    future = this.onLifeCycle(appId, 'resume')
  } else {
    var idx = this.inactiveAppIds.indexOf(appId)
    if (idx >= 0) {
      this.inactiveAppIds.splice(idx, 1)
    }
  }

  /** push app to top of stack */
  var lastAppId = this.getCurrentAppId()
  var deferred = () => this.appIdStack.push(appId)

  if (form === 'scene') {
    // Exit all apps in stack on incoming scene nlp
    logger.debug('on scene app preempting, deactivating all apps in stack.')
    return future.then(() => this.deactivateAppsInStack()).then(deferred)
  }

  var last = this.getAppDataById(lastAppId)
  if (!last) {
    /** no previously running app */
    logger.debug('no previously running app, skip preempting')
    return future.then(deferred)
  }

  if (last.form === 'scene') {
    /**
     * currently running app is a scene app, pause it
     */
    logger.debug('on cut app preempting, pausing previous scene app')
    return future.then(() => this.onLifeCycle(lastAppId, 'pause')).then(deferred)
  }

  var lastIdIdx = this.appIdStack.indexOf(lastAppId)
  if (lastIdIdx >= 0) {
    this.appIdStack.splice(lastIdIdx, 1)
  }

  /**
   * currently running app is a normal app, deactivate it
   */
  logger.debug('on cut app preempting, deactivating previous cut app', lastAppId)
  return future.then(() => this.deactivateAppById(lastAppId)).then(deferred)
}

/**
 * Deactivate app. Could be trigger by app itself, or it's active status was preempted by another app.
 * Once an app was deactivated, it's resources may be collected by app runtime.
 * **Also resumes last non-top app in stack.**
 *
 * On deactivating:
 * - non-daemon app: destroyed
 * - daemon app: switched to background
 *
 * Possible subsequent calls:
 *   - LaVieEnPile#setForegroundById
 *
 * @param {string} appId -
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.deactivateAppById = function deactivateAppById (appId) {
  var idx = this.appIdStack.indexOf(appId)
  if (idx !== this.appIdStack.length - 1) {
    /** app is not top of stack, no need to be deactivated */
    logger.info('app is not top of stack, skip deactivating', appId)
    return Promise.resolve()
  }
  logger.info('deactivating top app', appId)

  this.appIdStack.splice(idx, 1)

  var deactivating
  if (this.isDaemonApp(appId)) {
    deactivating = this.onLifeCycle(appId, 'background')
  } else {
    // TODO: inactive app could still be alive for a while waiting for automatic destroy
    deactivating = this.destroyAppById(appId)
  }

  if (this.carrierId) {
    // TODO: carrier
    /** if app is started by a carrier, unset the flag on exit */
    this.carrierId = null
  }

  return deactivating.then(() => {
    var lastAppId = this.getCurrentAppId()
    if (lastAppId) {
      return this.onLifeCycle(lastAppId, 'resume')
    }
  })
}

/**
 * Deactivate all apps in stack.
 *
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.deactivateAppsInStack = function deactivateAppsInStack () {
  var self = this
  var stack = self.appIdStack
  self.appIdStack = []
  /** deactivate apps in stack in a reversed order */
  logger.info('deactivating apps in stack')
  return Promise.all(stack.map(step))

  function step (appId) {
    return self.deactivateAppById(appId)
      .catch(err => logger.error('Unexpected error on deactivating app', appId, err))
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
LaVieEnPile.prototype.setBackgroundById = function (appId) {
  var inactiveIdx = this.inactiveAppIds.indexOf(appId)
  if (inactiveIdx >= 0) {
    this.inactiveAppIds.splice(inactiveIdx, 1)
  }

  var activeIdx = this.appIdStack.indexOf(appId)
  if (activeIdx >= 0) {
    this.appIdStack.splice(activeIdx, 1)
  }

  if (inactiveIdx < 0 && activeIdx < 0) {
    logger.info('app already in background', appId)
    return Promise.resolve()
  }
  logger.info('set background', appId)

  // try to resume previous app
  var lastAppId = this.getCurrentAppId()
  if (lastAppId == null) {
    return Promise.resolve()
  }
  return this.onLifeCycle(lastAppId, 'resume')
}

/**
 * Preempts top of stack and switch app to foreground.
 *
 * Does nothing if app is not running in background.
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
    return Promise.resolve()
  }
  logger.info('set foreground', appId)
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
 * @returns {Promise<ActivityDescriptor>} LifeCycle events are asynchronous.
 */
LaVieEnPile.prototype.onLifeCycle = function onLifeCycle (appId, event, params) {
  var app = this.getAppById(appId)
  if (app == null) {
    return Promise.reject(new Error(`App '${appId}' not created yet.`))
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

// MARK: - END App Events

// MARK: - App Termination

/**
 * Destroy all app managed by LaVieEnPile.
 *
 * **Also destroy daemon apps.**
 *
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.destroyAll = function () {
  logger.log('destroying all apps')
  // 清空正在运行的所有App
  this.appDataMap = {}

  var self = this
  var ids = Object.keys(this.executors)
  self.appIdStack = []
  /** destroy apps in stack in a reversed order */
  return Promise.all(ids.map(step))

  function step (appId) {
    return self.destroyAppById(appId)
      .catch(err => logger.error('Unexpected error on destroying app', appId, err))
  }
}

/**
 * Destroy the app managed by LaVieEnPile.
 *
 * **Also destroy daemon apps.**
 *
 * @param {string} appId -
 * @returns {Promise<void>}
 */
LaVieEnPile.prototype.destroyAppById = function (appId) {
  /**
   * Try remove app id from stacks.
   */
  var idx = this.appIdStack.indexOf(appId)
  if (idx >= 0) {
    this.appIdStack.splice(idx, 1)
  }
  idx = this.inactiveAppIds.indexOf(appId)
  if (idx >= 0) {
    this.inactiveAppIds.splice(idx, 1)
  }

  return this.onLifeCycle(appId, 'destroy')
    .then(() => {
      /**
       * Remove apps from records of LaVieEnPile.
       */
      delete this.apps[appId]
      delete this.appDataMap[appId]

      return this.executors[appId].destruct()
    })
}

// MARK: - END App Termination
