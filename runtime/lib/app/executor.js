'use strict'

var logger = require('logger')('executor')
var lightApp = require('./light-app')
var extApp = require('./ext-app')
var _ = require('@yoda/util')._

function Executor (profile, prefix) {
  this.daemon = false
  this.errmsg = null
  this.valid = true
  this.profile = profile

  if (profile.metadata.extapp === true) {
    this.type = 'extapp'
    this.daemon = _.get(profile, 'metadata.daemon', false)
    this.exec = prefix
  } else {
    this.type = 'light'
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
    app = lightApp(appId, this.exec, runtime)
    this.app = app
    return Promise.resolve(app)
  } else if (this.type === 'extapp') {
    if (this.daemon && this.app != null) {
      return Promise.resolve(this.app)
    }

    return extApp(appId, this.exec, runtime)
      .then(app => {
        logger.info('Ext-app successfully started')
        this.app = app
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
