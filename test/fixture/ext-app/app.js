'use strict'

/**
 *
 * @param {YodaRT.Activity} activity
 */
module.exports = function (activity) {
  activity.on('create', () => {
    activity.testMethod('foo', 'bar')
      .then(data => {
        process.send({
          type: 'test',
          event: 'create',
          data: data
        })
      })
  })

  activity.on('request', (nlp, action) => {
    process.send({
      type: 'test',
      event: 'request',
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

  activity.on('test-ack', (arg1, arg2) => {
    process.send({
      type: 'test',
      event: 'test-ack',
      args: [arg1, arg2]
    })
  })

  activity.tts.on('end', (arg1, arg2) => {
    process.send({
      type: 'test',
      namespace: 'tts',
      event: 'end',
      args: [arg1, arg2]
    })
  })
}
