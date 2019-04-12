'use strict'
var EventEmitter = require('events')

var logger = require('logger')('la-vie')
var _ = require('@yoda/util')._

/**
 * App life time management
 *
 * 1. CreateApp -> app created, now inactive
 * 2. ActivateApp -> app activated, now on top of stack
 * 3. DeactivateApp -> app deactivated, now inactive
 * 4. DestroyApp -> app suspended, waiting for eviction
 *
 * - OnLifeCycle -> send events to app
 *
 * @author Chengzhong Wu <chengzhong.wu@rokid.com>
 * @param {AppScheduler} scheduler - AppScheduler that manages app processes.
 *
 */
class Lifetime extends EventEmitter {
  /**
   * On app been evicted from stack
   * @event evict
   * @param {string} appId - the app id to be evicted
   */
  /**
   * On stack reset, might have be de-bounced
   * @event stack-reset
   */
  constructor (runtime) {
    super()
    this.scheduler = runtime.component.appScheduler
    this.activity = runtime.descriptor.activity
    /**
     * @typedef ContextOptionsData
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
     * @type {string[]}
     */
    this.activitiesStack = []
    /**
     * Some app may have permissions to monopolize top of stack,
     * in which case, no other apps could interrupts it's monologue.
     */
    this.monopolist = null
  }
  // MARK: - Getters
  /**
   * Get app id of top app in stack.
   * @returns {string | null} appId, or undefined if no app was in stack.
   */
  getCurrentAppId () {
    return this.activitiesStack[this.activitiesStack.length - 1]
  }
  /**
   * Get app preemption priority data by app id.
   * @param {string} appId -
   * @returns {ContextOptionsData | undefined} app preemption priority data, or undefined if data for the app doesn't exist.
   */
  setContextOptionsById (appId, options) {
    var prevOptions = this.contextOptionsMap[appId]
    this.contextOptionsMap[appId] = Object.assign({}, prevOptions, options)
    return options
  }
  /**
   * Get app preemption priority data by app id.
   * @param {string} appId -
   * @returns {ContextOptionsData | undefined} app preemption priority data, or undefined if data for the app doesn't exist.
   */
  getContextOptionsById (appId) {
    return this.contextOptionsMap[appId]
  }
  /**
   * Get if app is in activities stack.
   * @param {string} appId -
   * @returns {boolean} true if active, false otherwise.
   */
  isAppInStack (appId) {
    return this.activitiesStack.indexOf(appId) >= 0
  }
  /**
   * Get if app is inactive (not active in stack).
   * @param {string} appId -
   * @returns {boolean} true if inactive, false otherwise.
   */
  isAppInactive (appId) {
    return this.scheduler.isAppRunning(appId) && !this.isAppInStack(appId)
  }
  /**
   * Determines if top of stack is monopolized.
   *
   * If Lifetime#monopolist is set, yet following conditions not matched, monopolization would be revoked:
   * - is current app
   * - app is alive
   */
  isMonopolized () {
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
   * @returns {string | null} the monopolist app id
   */
  getMonopolist () {
    return this.monopolist
  }
  /**
   * Oppress the given event if monopolist is available.
   *
   * @param {string} appId
   * @param {boolean} [options.preemptive=true]
   * @returns {Promise<boolean>} Promise of false if event doesn't been oppressed, true otherwise.
   */
  guardMonopolization (appId, options) {
    var preemptive = _.get(options, 'preemptive', true)
    if (!preemptive) {
      return false
    }
    if (!this.isMonopolized()) {
      return false
    }
    if (appId === this.monopolist) {
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
   *   - Lifetime#activateAppById
   *
   * > Deprecated: Use AppScheduler.createApp instead.
   *
   * @param {string} appId -
   * @returns {Promise<AppDescriptor>}
   */
  createApp (appId) {
    return this.scheduler.createApp(appId)
  }
  /**
   * Activate given app with form to preempting top of stack.
   *
   * 1. resolve if app is top of stack
   * 2. pause last top app
   * 3. resume app if app
   *
   * Possible subsequent calls:
   *   - Lifetime#deactivateAppById
   *
   * @param {string} appId -
   * @param {object} [options] -
   * @param {any[]} [options.activateParams] -
   * @returns {Promise<void>}
   */
  activateAppById (appId, options) {
    var activateParams = _.get(options, 'activateParams', [])
    if (!this.scheduler.isAppRunning(appId)) {
      return Promise.reject(new Error(`App ${appId} is ${this.scheduler.getAppStatusById(appId)}, launch it first.`))
    }
    if (this.guardMonopolization(appId, { preemptive: true })) {
      return Promise.reject(new Error(`App ${this.monopolist} monopolized top of stack.`))
    }
    var future = Promise.resolve()
    var lastAppId = this.getCurrentAppId()
    var lastContext = this.getContextOptionsById(lastAppId)
    if (appId === lastAppId) {
      /**
       * App is the currently running one
       */
      logger.info('app is top of stack, skipping resuming', appId)
      return future
    }
    logger.info('app is running inactively, resuming', appId)
    /** push app to top of stack */
    if (lastAppId && lastContext) {
      this.onPreemption(lastAppId, lastContext)
    }
    var idx = this.activitiesStack.indexOf(appId)
    if (idx >= 0) {
      this.activitiesStack.splice(idx, 1)
    }
    this.activitiesStack.push(appId)
    var deferred = () => {
      return this.activity.emitToApp(appId, 'resumed', activateParams)
    }
    if (lastAppId == null) {
      /** no previously running app */
      logger.info('no previously running app, skip preempting')
      /** deferred shall be ran in current context to prevent possible simultaneous preemption */
      return future.then(deferred)
    }
    /**
     * pause currently running app
     */
    logger.info(`on app '${appId}' preempting, pausing previous app`)
    return future.then(() => this.activity.emitToApp(lastAppId, 'paused'))
      .catch(err => logger.warn('Unexpected error on pausing previous app', err.stack))
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
   * - app: destroyed
   *
   * Possible subsequent calls:
   *   - Lifetime#setForegroundById
   *
   * @param {string} appId -
   * @param {object} [options] -
   * @param {boolean} [options.recover] - if recover previous app
   * @param {boolean} [options.force] - deactivate the app whether it is in stack or not
   * @param {boolean} [options.ignoreKeptAlive] - ignore contextOptions.keepAlive
   * @returns {Promise<void>}
   */
  deactivateAppById (appId, options) {
    var recover = _.get(options, 'recover', true)
    var force = _.get(options, 'force', false)
    if (this.monopolist === appId) {
      this.monopolist = null
    }
    var currentAppId = this.getCurrentAppId()
    var idx = this.activitiesStack.indexOf(appId)
    if (idx >= 0) {
      this.activitiesStack.splice(idx, 1)
    }
    if (idx < 0 && !force) {
      /** app is in stack, no need to be deactivated */
      logger.info('app is not in stack, skip deactivating', appId)
      return Promise.resolve()
    }
    logger.info(`deactivating app(${appId}), recover? ${recover}, currentApp(${currentAppId})`)
    if (recover && currentAppId !== appId) {
      recover = false
    }
    delete this.contextOptionsMap[appId]
    if (idx >= 0) {
      this.onEviction(appId)
    }
    var future = this.destroyAppById(appId)
    if (recover && idx >= 0) {
      return future
    }

    var lastAppId = this.getCurrentAppId()
    if (lastAppId == null) {
      logger.info(`no app available to be recovered.`)
      return future
    }
    if (appId !== lastAppId) {
      logger.info(`app(${appId}) to be deactivated is not last active app, skip recovering.`)
      return future
    }
    logger.info(`recovering previous app(${lastAppId}) on deactivating.`)
    return future.then(() => {
      /**
       * Since last app is already on top of stack, no need to re-activate it,
       * a simple life cycle event is sufficient.
       */
      return this.activity.emitToApp(lastAppId, 'resumed')
        .catch(err => logger.warn('Unexpected error on restoring previous app', err.stack))
    })
  }
  /**
   * Deactivate all apps in stack.
   *
   * @param {object} [options] -
   * @param {string[]} [options.excepts] - do not include these app on deactivation
   * @returns {Promise<void>}
   */
  deactivateAppsInStack (options) {
    var excepts = _.get(options, 'excepts')
    var self = this
    var stack = this.activitiesStack
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
  // MARK: - END Stack Manipulation
  // MARK: - App Events
  /**
   * Emit event `eviction` with the evicted app id as first argument to listeners.
   */
  onEviction (appId) {
    if (!appId) {
      return
    }
    var isIdle = !this.getCurrentAppId()
    process.nextTick(() => {
      this.emit('eviction', appId)
      if (isIdle) {
        this.emit('idle')
      }
    })
  }
  /**
   * Emit event `preemption` with the app id as first argument to listeners.
   *
   * @param {string} appId
   */
  onPreemption (appId) {
    if (!appId) {
      return
    }
    process.nextTick(() => {
      this.emit('preemption', appId)
    })
  }
  /**
   * Emit event `stack-reset` to listeners.
   */
  onStackReset () {
    process.nextTick(() => {
      this.emit('stack-reset')
    })
  }
  // MARK: - END App Events
  // MARK: - App Termination
  /**
   * Destroy all app managed by Lifetime.
   *
   * **Also destroy daemon apps.**
   *
   * @returns {Promise<void>}
   */
  destroyAll (options) {
    var force = _.get(options, 'force', false)
    logger.log(`destroying all apps${force ? ' by force' : ''}`)
    var activitiesStack = this.activitiesStack
    this.activitiesStack = []
    this.contextOptionsMap = {}
    this.onStackReset()
    /** destroy apps in stack in a reversed order */
    return Promise.all(activitiesStack
      .map(it => {
        if (!this.scheduler.isAppRunning(it)) {
          /**
           * App is already not running, skip destroying.
           */
          return Promise.resolve()
        }
        return Promise.resolve()
      }))
      .then(() => this.scheduler.suspendAllApps({ force: force }))
  }
  /**
   * Destroy the app managed by Lifetime.
   *
   * @param {string} appId -
   * @param {object} [options] -
   * @param {boolean} [options.force=false] -
   * @returns {Promise<void>}
   */
  destroyAppById (appId, options) {
    var force = _.get(options, 'force', false)
    /**
     * Remove apps from records of Lifetime.
     */
    var idx = this.activitiesStack.indexOf(appId)
    if (idx >= 0) {
      this.activitiesStack.splice(idx, 1)
    }
    delete this.contextOptionsMap[appId]
    if (!this.scheduler.isAppRunning(appId)) {
      /**
       * App is already not running, skip destroying.
       */
      logger.info(`app(${appId}) is not running, skip destroying.`)
      return Promise.resolve()
    }
    return this.scheduler.suspendApp(appId, { force: force })
  }
  // MARK: - END App Termination
}

module.exports = Lifetime
