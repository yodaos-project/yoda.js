'use strict'

var EventEmitter = require('events')

var eventProxy = new EventEmitter()

/**
 *
 * @param {YodaRT.Activity} activity
 */
module.exports = function (activity) {
  ;['created', 'paused', 'resumed', 'destroyed', 'onrequest'].forEach(eve => {
    activity.on(eve, function onEvent () {
      EventEmitter.prototype.emit.apply(
        eventProxy,
        [ eve ].concat(Array.prototype.slice.call(arguments, 0)))
    })
  })
}

module.exports.proxy = eventProxy
