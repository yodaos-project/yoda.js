'use strict'

var logger = require('logger')('executor')
var lightApp = require('./light-app')
var extApp = require('./ext-app')
var _ = require('@yoda/util')._

function Executor (profile, appHome) {
  this.daemon = false
  this.errmsg = null
  this.valid = true
  this.profile = profile

  if (profile.metadata.extapp === true) {
    this.type = 'extapp'
    this.daemon = _.get(profile, 'metadata.daemon', false)
    this.appHome = appHome
  } else {
    this.type = 'light'
    this.daemon = true
    this.appHome = appHome
  }
}

Executor.prototype.create = function (appId, runtime) {
  if (!this.valid) {
    logger.log(`app ${appId} invalid`)
    return false
  }
  if (this.daemon && this.app != null) {
    return Promise.resolve(this.app)
  }

  var app = null
  if (this.type === 'light') {
    app = lightApp(appId, this.appHome, runtime)
    this.app = app
    app.emit('ready')
    return Promise.resolve(app)
  } else if (this.type === 'extapp') {
    return extApp(appId, this.appHome, runtime)
      .then(app => {
        logger.info('Ext-app successfully started')
        this.app = app
        app.emit('ready')
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
  if (this.daemon) {
    return
  }
  app.destruct()
}

module.exports = Executor
