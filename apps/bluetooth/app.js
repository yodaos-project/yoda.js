'use strict'

var logger = require('logger')('bluetooth-app')
var Application = require('@yodaos/application').Application
var rt = global[Symbol.for('yoda#api')]

function speak (text, altVoice) {
  logger.debug(`speak: ${text}`)
  app.openUrl(`yoda-app://system/speak?text=${text}&alt=${altVoice}`)
}

var app = Application({
  created: () => {
    logger.debug('created')
  },
  destroyed: () => {
    logger.debug('destroyed')
  },
  url: (url) => {
    logger.debug(`on url.pathname = ${url.pathname}`)
    switch (url.pathname) {
      case '/start':
        app.startService('bluetooth-service')
        break
      case '/stop':
        var service = app.getService('bluetooth-service')
        if (service != null) {
          service.finish()
        }
        rt.exit()
        break
      default:
        service = app.getService('bluetooth-service')
        if (service != null) {
          var text = service.handleUrl(url)
          if (typeof text === 'string') {
            speak(text)
          } else if (text != null && typeof text === 'object') {
            speak(text.text, text.alt)
          }
        }
        break
    }
  },
  broadcast: channel => {
    logger.error('on broadcast: ', channel)
    switch (channel) {
      case 'yoda.on-system-booted':
        app.startService()
        break
      case 'yoda.on-system-shutdown':
        var service = app.getService('bluetooth-service')
        if (service != null) {
          service.finish()
        }
        rt.exit()
        break
      default:
        break
    }
  }
})

module.exports = app
