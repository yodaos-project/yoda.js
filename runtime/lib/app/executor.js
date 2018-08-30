'use strict'

var logger = require('logger')('executor')
var DaemonExtApp = require('./extappServer')
var lightApp = require('./light-app')
var extApp = require('./ext-app')

function Executor (profile, prefix) {
  this.type = 'light'
  this.daemon = false
  this.exec = null
  this.errmsg = null
  this.valid = true
  this.profile = profile

  if (profile.metadata.extapp === true) {
    if (profile.metadata.daemon === true) {
      this.daemon = true
    }
    this.type = 'extapp'
    this.exec = prefix
  } else {
    this.exec = prefix
  }
}

Executor.prototype.create = function (appId, runtime) {
  if (!this.valid) {
    logger.log(`app ${appId} invalid`)
    return false
  }
  var app = null
  if (this.type === 'light') {
    app = lightApp(this.exec, appId, runtime)
    return Promise.resolve(app)
  } else if (this.type === 'extapp') {
    // app @cloud
    if (this.daemon === true) {
      app = new DaemonExtApp(appId, this.profile.metadata.dbusConn, runtime)
      return Promise.resolve(app)
    }
    return extApp(this.exec, appId, runtime)
      .then(app => {
        logger.info('Ext-app successfully started')
        return app
      }, err => {
        logger.info('Unexpected error on starting ext-app', err.message, err.stack)
        runtime.exitAppByIdForce(appId)
      })
  }
}

/**
 *
 * @param {ActivityDescriptor} app
 */
Executor.prototype.destruct = function destruct (app) {
  app.destruct()
}

module.exports = Executor
