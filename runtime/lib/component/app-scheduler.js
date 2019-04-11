'use strict'
var logger = require('logger')('scheduler')
var _ = require('@yoda/util')._

var Constants = require('../../constants').AppScheduler
var AppBridge = require('../app/app-bridge')
var lightApp = require('../app/light-app')
var extApp = require('../app/ext-app')
var DbusApp = require('../app/dbus-app')
var executableProc = require('../app/executable-proc')

module.exports = AppScheduler
function AppScheduler (runtime) {
  this.runtime = runtime
  this.loader = runtime.component.appLoader

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

AppScheduler.prototype.createApp = function createApp (appId, mode) {
  if (this.isAppRunning(appId)) {
    return Promise.resolve(this.getAppById(appId))
  }
  var future
  switch (this.appStatus[appId]) {
    case Constants.status.creating:
      future = this.appCreationFutures[appId]
      if (future != null) {
        return future
      }
      return Promise.reject(new Error(`Scheduler is creating app ${appId}.`))
    case Constants.status.suspending:
      future = this.appSuspensionFutures[appId]
      if (future == null) {
        return Promise.reject(new Error(`Scheduler is suspending app ${appId}.`))
      }
      return future.then(() => this.createApp(appId, mode), () => this.createApp(appId, mode))
  }
  this.appStatus[appId] = Constants.status.creating

  var appType = this.loader.getTypeOfApp(appId)
  var metadata = this.loader.getAppManifest(appId)

  if (Constants.modes[mode] == null) {
    mode = Constants.modes.default
  }
  this.appLaunchOptions[appId] = { type: appType, mode: mode }

  var appBridge = new AppBridge(this.runtime, appId)
  if (appType === 'light') {
    return lightApp(appId, metadata, appBridge)
      .then(
        app => this.handleAppCreate(appId, app),
        err => {
          logger.error(`Unexpected error on creating light app(${appId})`, err)
          this.handleAppExit(appId, null, null)
          throw err
        })
  }

  if (appType === 'dbus') {
    var app = new DbusApp(appId, metadata, this.runtime)
    this.handleAppCreate(appId, app)
    return Promise.resolve(app)
  }

  if (appType === 'exe') {
    future = executableProc(appId, metadata, appBridge)
  } else {
    future = extApp(appId, metadata, appBridge, mode)
  }

  future = future
    .then(() => {
      logger.info(`App(${appId}) successfully started`)
      appBridge.onExit = (code, signal) => {
        if (this.appMap[appId] !== appBridge) {
          logger.info(`Not matched app on exiting, skip unset executor.app(${appId})`)
          return
        }
        this.handleAppExit(appId, code, signal)
      }

      delete this.appCreationFutures[appId]
      return this.handleAppCreate(appId, appBridge)
    }, err => {
      logger.error(`Unexpected error on starting ext-app(${appId})`, err.stack)

      delete this.appCreationFutures[appId]
      this.handleAppExit(appId)
      throw err
    })

  this.appCreationFutures[appId] = future
  return future
}

AppScheduler.prototype.handleAppCreate = function handleAppCreate (appId, app) {
  this.appMap[appId] = app
  this.appStatus[appId] = Constants.status.running

  return app
}

AppScheduler.prototype.handleAppExit = function handleAppExit (appId, code, signal) {
  logger.info(`${appId} exited.`)
  /** incase bridge has not been marked as suspended */
  if (this.appMap[appId] && typeof this.appMap[appId].suspend === 'function') {
    this.appMap[appId].suspend()
  }
  this.appStatus[appId] = Constants.status.exited
  this.runtime.appGC(appId)

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

AppScheduler.prototype.suspendAllApps = function suspendAllApps (options) {
  var aliveAppIds = Object.keys(this.appMap)
  return Promise.all(aliveAppIds.map(id => this.suspendApp(id, options)))
}

AppScheduler.prototype.suspendApp = function suspendApp (appId, options) {
  var force = _.get(options, 'force', false)
  var appType = this.loader.getTypeOfApp(appId)
  logger.info(`suspending ${appType}-app(${appId}), force?`, force)

  if (appType === 'light') {
    return Promise.resolve()
  }

  if (appType === 'dbus') {
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

  var app = this.appMap[appId]
  if (app) {
    app.suspend()
    this.appStatus[appId] = Constants.status.suspending
    this.appSuspensionFutures[appId] = new Promise((resolve, reject) => {
      var timer = setTimeout(() => {
        if (timer == null) {
          return
        }
        timer = null
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
    })
  }

  return Promise.resolve()
}
