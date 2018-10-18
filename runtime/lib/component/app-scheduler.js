'use strict'
var logger = require('logger')('scheduler')
var _ = require('@yoda/util')._

var lightApp = require('../app/light-app')
var extApp = require('../app/ext-app')
var DbusApp = require('../app/dbus-app')

module.exports = AppScheduler
function AppScheduler (loader, runtime) {
  this.loader = loader
  this.runtime = runtime

  this.appMap = {}
  this.appStatus = {}
}

AppScheduler.status = {
  creating: 'creating',
  running: 'running',
  destructing: 'destructing',
  exited: 'exited'
}

AppScheduler.prototype.isAppRunning = function isAppRunning (appId) {
  return this.appStatus[appId] === AppScheduler.status.running
}

AppScheduler.prototype.getAppById = function getAppById (appId) {
  return this.appMap[appId]
}

AppScheduler.prototype.createApp = function createApp (appId) {
  if (this.isAppRunning(appId)) {
    return Promise.resolve(this.getAppById(appId))
  }
  if (this.appStatus[appId] === AppScheduler.status.creating) {
    return Promise.reject(new Error(`Scheduler is creating app ${appId}.`))
  }
  this.appStatus[appId] = AppScheduler.status.creating

  var appType = this.loader.getTypeOfApp(appId)
  var metadata = this.loader.getAppManifest(appId)

  if (appType === 'light') {
    return lightApp(appId, metadata, this.runtime)
      .then(app => this.handleAppCreate(appId, app))
  }

  if (appType === 'dbus') {
    var app = new DbusApp(appId, metadata, this.runtime)
    this.handleAppCreate(appId, app)
    return Promise.resolve(app)
  }

  return extApp(appId, metadata, this.runtime)
    .then(app => {
      logger.info('Ext-app successfully started')
      app.once('exit', () => {
        if (this.appMap[appId] !== app) {
          logger.info('Not matched app on exiting, skip unset executor.app')
          return
        }
        this.handleAppExit(appId)
      })

      return this.handleAppCreate(appId, app)
    }, err => {
      logger.error('Unexpected error on starting ext-app', err.message, err.stack)
      this.handleAppExit(appId)
      throw err
    })
}

AppScheduler.prototype.handleAppCreate = function handleAppCreate (appId, app) {
  this.appMap[appId] = app
  this.appStatus[appId] = AppScheduler.status.running
  app.emit('ready')
  app.emit('create')

  return app
}

AppScheduler.prototype.handleAppExit = function handleAppExit (appId) {
  logger.info(`${appId} exited.`)
  delete this.appMap[appId]
  this.appStatus[appId] = AppScheduler.status.exited
  this.runtime.appGC(appId)
}

AppScheduler.prototype.suspendAllApps = function suspendAllApps (options) {
  var aliveAppIds = Object.keys(this.appMap)
  return Promise.all(aliveAppIds.map(id => this.suspendApp(id, options)))
}

AppScheduler.prototype.suspendApp = function suspendApp (appId, options) {
  var force = _.get(options, 'force', false)
  var appType = this.loader.getTypeOfApp(appId)

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

  var app = this.appMap[appId]
  if (app) {
    app.destruct()
    this.appStatus[appId] = AppScheduler.status.destructing
  }

  return Promise.resolve()
}
