var EventEmitter = require('events')
var _ = require('@yoda/util')._
var helper = require('../../helper')
var Scheduler = require(`${helper.paths.runtime}/lib/component/app-scheduler`)

module.exports.eventBus = new EventEmitter()

var runtime = new EventEmitter()
var scheduler = module.exports.scheduler = new Scheduler({}, runtime)

var appMap = {}
scheduler.createApp = function createApp (appId) {
  if (this.isAppRunning(appId)) {
    return Promise.resolve(this.getAppById(appId))
  }

  var bus = module.exports.eventBus

  var app = new EventEmitter()
  this.appMap[appId] = app
  this.appStatus[appId] = 'running'
  bus.emit('create', appId, app, appMap[appId].daemon)
  app.emit('create')
  return Promise.resolve(app)
}
scheduler.suspendApp = function suspendApp (appId, options) {
  console.log('destruct app', appId, appMap[appId])
  var force = _.get(options, 'force', false)
  var bus = module.exports.eventBus
  if (appMap[appId].daemon && !force) {
    return Promise.resolve()
  }

  this.appMap[appId] = null
  this.appStatus[appId] = 'exited'
  bus.emit('destruct', appId, appMap[appId].daemon)
  return Promise.resolve()
}
module.exports.mockAppExecutors = mockAppExecutors
/**
 *
 * @param {number} number
 * @param {boolean} daemon
 * @param {number} [startIdx]
 */
function mockAppExecutors (number, daemon, startIdx) {
  if (startIdx == null) {
    startIdx = 0
  }
  for (var idx = startIdx; idx < number + startIdx; ++idx) {
    appMap[`${idx}`] = {
      daemon: daemon
    }
  }
  return appMap
}

module.exports.restore = function restore () {
  module.exports.eventBus.removeAllListeners()
  module.exports.eventBus = new EventEmitter()
  appMap = {}
  scheduler.appMap = {}
  scheduler.appStatus = {}
}
