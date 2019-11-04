'use strict'

/**
 * @namespace yodaRT
 */

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var Url = require('url')
var path = require('path')

var logger = require('logger')('yoda')

var ComponentConfig = require('./lib/config').getConfig('component-config.json')

var _ = require('@yoda/util')._
var Loader = require('@yoda/bolero').Loader
var endoscope = require('@yoda/endoscope')

var runtimePhaseMetric = new endoscope.Enum('yodaos:runtime:phase', { states: [ 'booting', 'reset', 'ready' ] })
var dispatchDurationHistogram = new endoscope.Histogram('yodaos:runtime:open_url_duration', { labels: [ 'url' ] })

/**
 * @memberof yodaRT
 * @class
 */
class YodaFramework extends EventEmitter {
  constructor () {
    super()

    this.inited = false
    this.hibernated = false
    this.__temporaryDisablingReasons = [ 'initiating' ]
    this.componentLoader = new Loader(this, 'component')
    this.descriptorLoader = new Loader(this, 'descriptor')
  }

  /**
   * Start AppRuntime
   *
   * @returns {Promise<void>}
   */
  init () {
    if (this.inited) {
      return Promise.resolve()
    }

    /** 0. load components and descriptors */
    var ComponentDirs = ComponentConfig.paths
    if (ComponentDirs.length === 0) {
      ComponentDirs = [path.join(__dirname, './component')]
    }
    ComponentDirs.forEach(it => {
      this.componentLoader.load(it)
    })
    this.descriptorLoader.load(path.join(__dirname, 'descriptor'))

    /** 1. init components */
    this.componentsInvoke('init')
    this.phaseToBooting()
    /** 2. init services */
    this.resetServices()

    /** 3. load app manifests */
    logger.info('start loading applications')
    return this.component.appLoader.reload().then(() => {
      this.inited = true
      this.enableRuntimeFor('initiating')

      /** 4. questioning if any interests of delegation */
      return this.component.dispatcher.delegate('runtimeDidInit')
    }).then(delegation => {
      /** 5. broadcast system booted */
      var future = this.component.broadcast.dispatch('yodaos.on-system-booted', [])
      if (delegation) {
        return future
      }

      /** 6. phase runtime to reset */
      this.phaseToReset()
      /** 7. open the setup url and wait for incoming `ready` call */
      return this.openUrl('yoda-app://setup/init')
    })
  }

  /**
   * Deinit runtime.
   */
  deinit () {
    this.componentsInvoke('deinit')
  }

  /**
   * Invokes method on each component if exists with args.
   *
   * @param {string} method - method name to be invoked.
   * @param {any[]} args - arguments on invocation.
   */
  componentsInvoke (method, args) {
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
   * Start the daemon apps.
   */
  startDaemonApps () {
    var self = this
    var daemons = Object.keys(self.component.appLoader.appManifests).filter(appId => {
      var manifest = self.component.appLoader.appManifests[appId]
      return !!manifest.daemon
    })

    return start(0)
    function start (idx) {
      if (idx > daemons.length - 1) {
        return Promise.resolve()
      }
      var appId = daemons[idx]
      logger.info('Starting daemon app', appId)
      return self.component.appScheduler.createApp(appId)
        .then(() => {
          return start(idx + 1)
        }, () => {
          /** ignore error and continue populating */
          return start(idx + 1)
        })
    }
  }

  /**
   * Determines if runtime has been disabled for specific reason or just has been disabled.
   *
   * @param {string} [reason]
   * @returns {boolean}
   */
  hasBeenDisabled (reason) {
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
  getDisabledReasons () {
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
  disableRuntimeFor (reason) {
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
  enableRuntimeFor (reason) {
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
   * Put device into hibernation state.
   */
  hibernate () {
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
    return this.component.appScheduler.suspendAllApps({ force: true })
  }

  /**
   * Wake up device from hibernation.
   *
   * @param {object} [options]
   * @param {boolean} [options.shouldWelcome=false] - if welcoming is needed after re-logged in
   */
  wakeup (options) {
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
    this.component.broadcast.dispatch('yodaos.on-system-booted', [])
  }

  /**
   *
   * > Note: currently only `yoda-app:` scheme is supported.
   *
   * @param {string} url -
   * @param {object} [options] -
   * @returns {Promise<boolean>}
   */
  openUrl (url, options) {
    var urlObj = Url.parse(url, true)
    // ensure to clean up potentially wonky urls.
    url = Url.format(urlObj)
    if (urlObj.protocol !== 'yoda-app:') {
      logger.info('Url protocol other than yoda-app is not supported now.')
      return Promise.resolve(false)
    }
    var appId = this.component.appLoader.getAppIdByHost(urlObj.hostname)
    if (appId == null) {
      logger.info(`No app registered for app host '${urlObj.hostname}'.`)
      return Promise.resolve(false)
    }

    var slice = dispatchDurationHistogram.start({ url: typeof url === 'string' ? url : Url.format(url) })
    return this.component.dispatcher.dispatchAppEvent(
      appId,
      'url', [ url ],
      Object.assign({}, options)
    ).finally(() => dispatchDurationHistogram.end(slice))
  }

  /**
   *
   * @param {object} [options] -
   * @param {boolean} [options.lightd=true] -
   */
  resetServices (options) {
    // var lightd = _.get(options, 'lightd', true)
    // logger.info('resetting services')

    // var promises = []
    // if (lightd) {
    //   promises.push(
    //     this.component.effect.reset()
    //       .then((res) => {
    //         if (res && res[0] === true) {
    //           logger.log('reset lightd success')
    //         } else {
    //           logger.log('reset lightd failed')
    //         }
    //       })
    //       .catch((error) => {
    //         logger.log('reset lightd error', error)
    //       })
    //   )
    // }

    // return Promise.all(promises)
    return Promise.resolve()
  }

  appDidExit (appId) {
    logger.info('Collecting resources of app', appId)
    try {
      this.componentsInvoke('appDidExit', [ appId ])
    } catch (err) {
      logger.error('unexpected error on collection resources of app', appId, err.stack)
    }
  }

  /**
   * Reset the runtime to the reset state, it deactivates all running apps and
   * open the url "yoda-app://setup/reset".
   */
  reset () {
    return this.phaseToReset().then(
      () => this.openUrl('yoda-app://setup/reset'))
  }

  /**
   * @private
   */
  phaseToBooting () {
    this.component.flora.post('yodaos.runtime.phase', ['booting'], require('@yoda/flora').MSGTYPE_PERSIST)
    runtimePhaseMetric.state('booting')
  }

  /**
   * @private
   */
  phaseToReady () {
    this.component.flora.post('yodaos.runtime.phase', ['ready'], require('@yoda/flora').MSGTYPE_PERSIST)
    return this.startDaemonApps()
      .catch(err => logger.error('Unexpected error on starting daemon app', err.stack))
      .then(() => this.component.broadcast.dispatch('yodaos.on-phase-ready', []))
      .finally(() => runtimePhaseMetric.state('ready'))
  }

  /**
   * @private
   */
  phaseToReset () {
    this.component.flora.post('yodaos.runtime.phase', ['setup'], require('@yoda/flora').MSGTYPE_PERSIST)
    this.component.broadcast.dispatch('yodaos.on-phase-reset', [])
    return this.component.visibility.abandonAllVisibilities()
  }

}

module.exports = YodaFramework