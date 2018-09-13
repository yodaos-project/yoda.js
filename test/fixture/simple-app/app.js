'use strict'

var EventEmitter = require('events')

var eventProxy = new EventEmitter()

/**
 *
 * @param {YodaRT.Activity} activity
 */
module.exports = function (activity) {
  ;['create', 'pause', 'resume', 'destroy', 'request'].forEach(eve => {
    activity.on(eve, function onEvent () {
      EventEmitter.prototype.emit.apply(
        eventProxy,
        [ eve ].concat(Array.prototype.slice.call(arguments, 0)))
    })
  })
  activity.on('test-invoke', (method, params) => {
    activity[method].apply(activity, params)
      .then(res => eventProxy.emit('test', {
        event: 'invoke',
        result: res
      }), err => eventProxy.emit('test', {
        event: 'invoke',
        error: err.message
      }))
  })
}

module.exports.proxy = eventProxy
