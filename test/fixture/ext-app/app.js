'use strict'

var logger = require('logger')('test-ext-app')

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
  logger.info('app running')
}
