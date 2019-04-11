'use strict'

var _ = require('@yoda/util')._
var EventEmitter = require('events')

var proxy = new EventEmitter()

/**
 *
 * @param {YodaRT.Activity} activity
 */
module.exports = function (activity) {
  activity.on('echo', (path, params) => {
    _.get(activity, path).apply(activity, params)
      .then(res => {
        proxy.emit('invoke', {
          result: res
        })
      }, err => {
        proxy.emit('invoke', {
          error: Object.assign({}, _.pick(err, 'name', 'message'))
        })
      })
  })
  activity.foobar.on('echo', function () {
    proxy.emit('event', {
      args: Array.prototype.slice.call(arguments)
    })
  })
}

module.exports.proxy = proxy
