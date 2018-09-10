var EventEmitter = require('events')
var helper = require('../../helper')
var AppLoader = require(`${helper.paths.runtime}/lib/component/app-loader`)

module.exports.eventBus = new EventEmitter()

module.exports.appLoader = new AppLoader({})

module.exports.mockAppExecutors = mockAppExecutors
/**
 *
 * @param {number} number
 * @param {boolean} daemon
 * @param {number} [startIdx]
 */
function mockAppExecutors (number, daemon, startIdx) {
  var map = {}
  var bus = module.exports.eventBus
  if (startIdx == null) {
    startIdx = 0
  }
  for (var idx = startIdx; idx < number + startIdx; ++idx) {
    var executor = {
      appId: `${idx}`,
      daemon: daemon,
      create: function create () {
        var app = new EventEmitter()
        this.app = app
        bus.emit('create', this.appId, app, daemon)
        return Promise.resolve(app)
      },
      destruct: function destruct () {
        this.app = null
        bus.emit('destruct', this.appId, daemon)
        return Promise.resolve()
      }
    }
    map[executor.appId] = executor
  }
  Object.assign(module.exports.appLoader.executors, map)
  return map
}

module.exports.restore = function restore () {
  module.exports.eventBus.removeAllListeners()
  module.exports.eventBus = new EventEmitter()
  module.exports.appLoader.executors = {}
}
