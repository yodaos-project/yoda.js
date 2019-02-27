'use strict'

var _ = require('@yoda/util')._

/**
 *
 * @param {YodaRT.Activity} activity
 */
module.exports = function (activity) {
  activity.on('test-invoke', (method, params) => {
    _.get(activity, method).apply(activity, params)
      .then(res => process.send({
        type: 'test',
        event: 'invoke',
        method: method,
        result: res
      }), err => process.send({
        type: 'test',
        event: 'invoke',
        error: Object.assign({}, _.pick(err, 'message'), err)
      }))
  })

  ;[
    'click',
    'dbclick',
    'longpress'
  ].forEach(it => {
    activity.keyboard.on(it, function () {
      process.send({
        type: 'test',
        event: 'event',
        name: 'keyboard.' + it,
        params: Array.prototype.slice.apply(arguments, [])
      })
    })
  })
}
