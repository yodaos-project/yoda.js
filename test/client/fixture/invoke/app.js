'use strict'

var _ = require('@yoda/util')._

/**
 *
 * @param {YodaRT.Activity} activity
 */
module.exports = function (activity) {
  activity.on('echo', (path, params) => {
    _.get(activity, path).apply(activity, params)
      .then(res => process.send({
        type: 'test',
        event: 'invoke',
        result: res
      }), err => {
        process.send({
          type: 'test',
          event: 'invoke',
          error: Object.assign({}, _.pick(err, 'name', 'message'))
        })
      })
  })
  activity.on('app-fetch', (path) => {
    process.send({
      type: 'test',
      event: 'app-fetch',
      result: _.get(activity, path)
    })
  })
  activity.foobar.on('echo', function () {
    process.send({
      type: 'test',
      event: 'event',
      args: Array.prototype.slice.call(arguments)
    })
  })
}
