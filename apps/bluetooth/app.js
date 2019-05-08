'use strict'

var logger = require('logger')('bluetooth-app')
var Application = require('@yodaos/application').Application
var rt = global[Symbol.for('yoda#api')]
var AppTask = require('@yodaos/application').vui.AppTask
var network = require('@yoda/network')
var networkAgent = new network.NetworkAgent()

function speak (text, alternativeVoice) {
  networkAgent.getWifiStatus().then(reply => {
    if (reply.wifi.state === network.CONNECTED) {
      app.openUrl(`yoda-app://system/speak?text=${text}&alt=${alternativeVoice}`)
    } else {
      if (alternativeVoice != null) {
        var task = new AppTask([
          { media: alternativeVoice }
        ])
        task.execute()
      }
    }
  })
}

var app = Application({
  created: () => {
    logger.debug('created')
  },
  destroyed: () => {
    logger.debug('destroyed')
  },
  url: (url) => {
    logger.debug('on url: ', url)
    logger.debug(`pathname = ${url.pathname}`)
    switch (url.pathname) {
      case '/start':
        app.startService('bluetooth-service')
        break
      case '/stop':
        var service = app.getService('bluetooth-service')
        service.finish()
        rt.exit()
        break
      default:
        service = app.getService('bluetooth-service')
        var text = service.handleUrl(url)
        if (typeof text === 'string') {
          speak(text)
        } else if (text != null && typeof text === 'object') {
          speak(text.text, text.alternativeVoice)
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
        service.finish()
        rt.exit()
        break
      default:
        break
    }
  }
})

module.exports = app
