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
  if (this.creating) {
    return Promise.reject(new Error(`Executor is creating app ${this.appId}.`))
  }
  this.creating = true

  if (this.type === 'light') {
    return lightApp(this.appId, this.appHome, this.runtime)
      .then(app => {
        this.app = app
        this.creating = false
        app.emit('ready')
        return app
      })
  } else if (this.type === 'extapp') {
    return extApp(this.appId, this.appHome, this.runtime)
      .then(app => {
        logger.info('Ext-app successfully started')
        this.app = app
        this.creating = false
        app.once('exit', () => {
          logger.info(`${this.appId} exited.`)
          this.app = null
          this.runtime.appGC(this.appId)
        })
        app.emit('ready')
        return app
      }, err => {
        logger.error('Unexpected error on starting ext-app', err.message, err.stack)
        this.creating = false
        throw err
      })
  }
}

/**
 *
 * @param {ActivityDescriptor} app
 * @returns {Promise<void>}
 */
Executor.prototype.destruct = function destruct () {
  if (this.app) {
    this.app.destruct()
    this.app = null
  }
  return Promise.resolve()
}

module.exports = Executor
