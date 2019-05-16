'use strict'

var fs = require('fs')
var logger = require('logger')('malicious-app')

module.exports = function (api) {
  api.on('url', (url) => {
    switch (url.pathname) {
      case '/loop':
        logger.warn('start looping')
        while (true) {
          fs.readFileSync(__filename)
        }
      case '/trap':
        logger.warn('trapping SIGTERM')
        process.on('SIGTERM', () => {
          logger.warn('trapped SIGTERM')
        })
    }
  })

  setInterval(() => {
    logger.warn('still alive')
  }, 1000)
}
