'use strict'

var logger = require('logger')('executor')
var lightApp = require('./light-app')
var extApp = require('./ext-app')
var _ = require('@yoda/util')._

/**
 *
 * @param {object} profile -
 * @param {string} appHome -
 * @param {string} appId -
 * @param {AppRuntime} runtime -
 */
function Executor (profile, appHome, appId, runtime) {
  this.profile = profile
  this.appId = appId
  this.runtime = runtime
  this.daemon = _.get(profile, 'metadata.daemon', false)
  this.app = null

  if (profile.metadata.extapp === true) {
    this.type = 'extapp'
    this.appHome = appHome
  } else {
    this.type = 'light'
    this.appHome = appHome
  }
}

Executor.prototype.create = function () {
  if (this.daemon && this.app != null) {
    return Promise.resolve(this.app)
  }

  if (this.type === 'light') {
    return lightApp(this.appId, this.appHome, this.runtime)
      .then(app => {
        this.app = app
        app.emit('ready')
        return app
      })
  } else if (this.type === 'extapp') {
    return extApp(this.appId, this.appHome, this.runtime)
      .then(app => {
        logger.info('Ext-app successfully started')
        this.app = app
        app.once('exit', () => {
          logger.info(`${this.appId} exited.`)
          this.app = null
        })
        app.emit('ready')
        return app
      }, err => {
        logger.info('Unexpected error on starting ext-app', err.message, err.stack)
        this.runtime.exitAppByIdForce(this.appId)
      })
  }
}

/**
 *
 * @param {ActivityDescriptor} app
 * @returns {Promise<void>}
 */
Executor.prototype.destruct = function destruct () {
  if (this.app == null) {
    return Promise.resolve()
  }
  return Promise.resolve()
    .then(() => {
      this.app.destruct()
      this.app = null
    })
}

module.exports = Executor
