'use strict'

var logger = require('logger')('sys-app')
var wifi = require('@yoda/wifi')
var _ = require('@yoda/util')._
var fallbacks = require('./fallback.json')

module.exports = function (activity) {
  activity.on('request', function (nlp, action) {
    switch (nlp.intent) {
      case 'disconnect_network':
        wifi.disableAll()
        activity.exit()
        break
      case 'sleep':
      case 'dormancy':
      case 'usersleep':
      case 'byebyesleep':
      case 'ROKID.SYSTEM.EXIT':
        activity.idle()
        break
      default:
        fallback()
    }
  })

  activity.on('url', urlObj => {
    switch (urlObj.pathname) {
      case '/no-local-app': {
        var appId = _.get(urlObj, 'query.appId')
        if (!appId) {
          appId = 'UNKNOWN'
        }
        logger.warn(`app(${appId}) not installed`)
        activity.tts.speak(`我还不支持这个功能，等我学会了第一时间告诉你。`)
          .then(() => activity.exit())
        break
      }
      case '/malicious-nlp':
        fallback()
        break
      default:
        activity.exit()
    }
  })

  function fallback () {
    activity.tts.speak(_.sample(fallbacks))
      .then(
        () => activity.exit(),
        () => /** ignoring any possible tts error */activity.exit()
      )
  }
}
