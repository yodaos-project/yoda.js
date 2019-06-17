'use strict'
var logger = require('logger')('scheduler')
var _ = require('@yoda/util')._

var Constants = require('../constants').AppScheduler
var AppBridge = require('../app/app-bridge')
var lightLauncher = require('../app/light-launcher')
var defaultLauncher = require('../app/default-launcher')
var executableLauncher = require('../app/executable-launcher')

module.exports = AppScheduler
function AppScheduler (runtime) {
  this.runtime = runtime
  this.loader = runtime.component.appLoader

  this.pidAppIdMap = {}
  this.appMap = {}
  this.appStatus = {}
  this.appLaunchOptions = {}

  this.appCreationFutures = {}
  this.__appSuspensionResolvers = {}
  this.appSuspensionFutures = {}
}

AppScheduler.prototype.isAppRunning = function isAppRunning (appId) {
  return this.appStatus[appId] === Constants.status.running
}

AppScheduler.prototype.getAppById = function getAppById (appId) {
  return this.appMap[appId]
}

AppScheduler.prototype.getAppStatusById = function getAppStatusById (appId) {
  return this.appStatus[appId] || Constants.status.notRunning
}

/**
 *
 * @param {string} appId -
 * @param {object} metadata - app metadata
 * @param {AppBridge} bridge -
 * @param {number} mode - running mode
 * @param {object} [options]
 * @param {string} [options.descriptorPath] - api descriptor file to be used
 * @param {string[]} [options.args] - additional execution arguments to the child process
 * @param {object} [options.environs] - additional execution environs to the child process
 */
AppScheduler.prototype.appLauncher = {
  light: function (appId, metadata, appBridge, mode, options) {
    return lightLauncher(appId, metadata.appHome, appBridge)
  },
  exe: function (appId, metadata, appBridge, mode, options) {
    return executableLauncher(metadata.appHome, appBridge)
  },
  default: function (appId, metadata, appBridge, mode, options) {
    return defaultLauncher(metadata.appHome, appBridge, mode, options)
  }
}

/**
 *
 * @param {string} appId
 * @param {string | number} mode
 * @param {object} [options]
 * @param {string} [options.descriptorPath] - api descriptor file to be used
 * @param {string[]} [options.args] - additional execution arguments to the child process
 * @param {object} [options.environs] - additional execution environs to the child process
 */
AppScheduler.prototype.createApp = function createApp (appId, mode, options) {
  if (this.isAppRunning(appId)) {
    return Promise.resolve(this.getAppById(appId))
  }
  var future
  switch (this.appStatus[appId]) {
    case Constants.status.creating:
      future = this.appCreationFutures[appId]
      if (future == null) {
        return Promise.reject(new Error(`Scheduler is creating app ${appId}.`))
      }
      return future
    case Constants.status.suspending:
      future = this.appSuspensionFutures[appId]
      if (future == null) {
        return Promise.reject(new Error(`Scheduler is suspending app ${appId}.`))
      }
      return future.then(() => this.createApp(appId, mode))
    case Constants.status.error:
      future = this.suspendApp(appId, { force: true })
      return future.then(() => this.createApp(appId, mode))
  }
  this.appStatus[appId] = Constants.status.creating

  var appType = this.loader.getTypeOfApp(appId)
  var metadata = this.loader.getAppManifest(appId)
  var args = _.get(options, 'args')
  var environs = _.get(options, 'environs')

  if (typeof mode !== 'number') {
    mode = Constants.modes[mode]
  }
  if (mode == null) {
    mode = Constants.modes.default
  }

  var launcher = this.appLauncher[appType]
  if (launcher == null) {
    launcher = this.appLauncher.default
    appType = 'default'
  }
  this.appLaunchOptions[appId] = { type: appType, mode: mode, args: args, environs: environs }

  var appBridge = new AppBridge(this.runtime, appId, metadata)
  this.appMap[appId] = appBridge
  appBridge.onExit = (code, signal) => {
    if (this.appMap[appId] !== appBridge) {
      logger.info(`Not matched app on exiting, skip unset executor.app(${appId})`)
      return
    }
    this.handleAppExit(appId, code, signal)
  }
  var readyPromise = new Promise((resolve, reject) => {
    appBridge.onReady = (err) => {
      if (err) {
        logger.error(`Unexpected error on initializing ${appType} app(${appId})`, err.stack)
        this.handleAppExit(appId)
        reject(err)
        return
      }
      this.appStatus[appId] = Constants.status.running
      appBridge.emit('activity', 'created')
      resolve()
    }
  })
  var launchPromise = Promise.resolve()
    .then(() => launcher.call(this, appId, metadata, appBridge, mode, options))
    .then(pid => {
      if (pid != null) {
        this.pidAppIdMap[pid] = appId
        appBridge.pid = pid
      }
      logger.info(`App(${appId}) launched`)
      this.appMap[appId] = appBridge
    }, err => {
      logger.error(`Unexpected error on launching ${appType} app(${appId})`, err.stack)
      this.handleAppExit(appId)
      throw err
    })

  future = Promise.all([ readyPromise, launchPromise ])
    .finally(() => {
      delete this.appCreationFutures[appId]
    })
    .then(() => appBridge)
  this.appCreationFutures[appId] = future
  return future
}

/**
 *
 * @private
 * @param {string} appId
 * @param {number | undefined} code
 * @param {string | undefined} signal
 */
AppScheduler.prototype.handleAppExit = function handleAppExit (appId, code, signal) {
  logger.info(`${appId} exited.`)
  /** incase bridge has not been marked as suspended */
  var app = this.appMap[appId]
  if (app) {
    app.suspend()
    delete this.pidAppIdMap[app.pid]
  }
  this.appStatus[appId] = Constants.status.exited
  this.runtime.appDidExit(appId)

  delete this.appMap[appId]
  delete this.appLaunchOptions[appId]

  var suspensionResolver = this.__appSuspensionResolvers[appId]
  if (typeof suspensionResolver === 'function') {
    suspensionResolver()
  }
  delete this.__appSuspensionResolvers[appId]

  if (code != null) {
    var manifest = this.loader.getAppManifest(appId)
    if (manifest && manifest.daemon) {
      logger.info(`Restarting daemon app(${appId}) in 5s`)
      setTimeout(() => {
        this.createApp(appId)
      }, 5 * 1000)
    }
  }
}

/**
 * @param {object} [options]
 * @param {boolean} [options.force=false]
 */
AppScheduler.prototype.suspendAllApps = function suspendAllApps (options) {
  var aliveAppIds = Object.keys(this.appMap)
  return Promise.all(aliveAppIds.map(id => this.suspendApp(id, options)))
}

/**
 * @param {string} appId
 * @param {object} [options]
 * @param {boolean} [options.force=false]
 */
AppScheduler.prototype.suspendApp = function suspendApp (appId, options) {
  var force = _.get(options, 'force', false)
  var launchOptions = this.appLaunchOptions[appId]
  if (launchOptions == null) {
    return Promise.resolve()
  }
  var appType = launchOptions.type
  logger.info(`suspending ${appType}-app(${appId}), force?`, force)

  if (appType === 'light') {
    return Promise.resolve()
  }

  // TODO: emit event `destroy` on destroy of app

  var manifest = this.loader.getAppManifest(appId)
  if (manifest && manifest.daemon && !force) {
    // do nothing
    return Promise.resolve()
  }

  if (this.appStatus[appId] === Constants.status.suspending) {
    return Promise.resolve()
  }

  var bridge = this.appMap[appId]
  var future = Promise.resolve()
  if (bridge) {
    bridge.emit('activity', 'destroyed')
    this.appStatus[appId] = Constants.status.suspending
    future = this.appSuspensionFutures[appId] = new Promise((resolve, reject) => {
      var timer = setTimeout(() => {
        if (timer == null) {
          return
        }
        timer = null
        this.appStatus[appId] = Constants.status.error
        reject(new Error(`Suspend app(${appId}) timed out`))
      }, 5000)
      this.__appSuspensionResolvers[appId] = () => {
        if (timer == null) {
          return
        }
        clearTimeout(timer)
        timer = null
        resolve()
      }
      bridge.suspend({ force: force })
    })
  }

  return future
}
