'use strict'

/**
 *
 * @param {YodaRT.Activity} activity
 */
module.exports = function (activity) {
  activity.on('created', () => {
    activity.setPickup('foo', 'bar')
      .then(data => {
        process.send({
          type: 'test',
          event: 'created',
          data: data
        })
      })
  })

  activity.on('onrequest', (nlp, action) => {
    process.send({
      type: 'test',
      event: 'onrequest',
      args: [nlp, action]
    })
  })

  activity.on('test-get', (key) => {
    process.send({
      type: 'test',
      event: 'get',
      result: activity[key],
      typeof: typeof activity[key]
    })
  })

  activity.on('test-invoke', (method, params) => {
    activity[method].apply(activity, params)
      .then(res => process.send({
        type: 'test',
        event: 'invoke',
        result: res
      }), err => process.send({
        type: 'test',
        event: 'invoke',
        error: err.message
      }))
  })
}
