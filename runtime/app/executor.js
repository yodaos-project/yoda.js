'use strict'

var fork = require('child_process').fork
var ExtApp = require('./extappServer')
var logger = require('logger')('executor')
var lightApp = require('./lightAppProxy')

function Executor (profile, prefix) {
  this.type = 'light'
  this.daemon = false
  this.exec = null
  this.errmsg = null
  this.valid = true
  this.connector = null
  this.profile = profile

  if (profile.metadata.extapp === true) {
    if (profile.metadata.daemon === true) {
      this.daemon = true
    }
    this.type = 'extapp'
    this.exec = prefix
  } else {
    this.exec = prefix
    this.connector = lightApp(this.exec)
  }
}

Executor.prototype.create = function (appId, runtime) {
  if (!this.valid) {
    logger.log(`app ${appId} invalid`)
    return false
  }
  var app = null
  if (this.type === 'light') {
    app = this.connector(appId, runtime)
    return Promise.resolve(app)
  } else if (this.type === 'extapp') {
    // create extapp's sender
    app = new ExtApp(appId, this.profile.metadata.dbusConn, runtime)
    if (this.daemon === true) {
      return Promise.resolve(app)
    }
    // run real extapp
    logger.log(`fork extapp ${this.exec}`)
    var handle = fork(`${__dirname}/extappProxy.js`, [this.exec], {
      env: {
        NODE_PATH: '/usr/lib'
      }
    })
    logger.log('fork complete')
    handle.on('exit', () => {
      logger.log(appId + ' exit')
      runtime.exitAppByIdForce(appId)
    })
    handle.on('error', () => {
      logger.log(appId + ' error')
    })
    return new Promise((resolve, reject) => {
      // a message will received after extapp is startup
      handle.on('message', (message, sender) => {
        if (message.ready === true) {
          logger.log(`extapp ${this.exec} run`)
          resolve(app)
        } else {
          reject(new Error('an error occurred when starting the extapp'))
        }
      })
    })
  }
}

module.exports = Executor
