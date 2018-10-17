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
      case 'ROKID.SYSTEM.EXIT':
        activity.destroyAll()
        break
      default:
        activity.tts.speak(_.sample(fallbacks))
          .then(
            () => activity.exit(),
            () => /** ignoring any possible tts error */activity.exit()
          )
    }
  })

  activity.on('url', urlObj => {
    switch (urlObj.pathname) {
      case '/no-local-app': {
        var appName = _.get(urlObj, 'query.appName')
        if (!appName) {
          appName = '应用'
        }
        var appId = _.get(urlObj, 'query.appId')
        if (!appId) {
          appId = 'UNKNOWN'
        }
        activity.wormhole.sendToApp('card', {
          appid: 'ROKID.SYSTEM',
          template: JSON.stringify({ tts: `${appName}(${appId}) 没有安装` }),
          type: 'Chat'
        }).catch(err => logger.error('Unexpected error on send card to app', err.stack))
        activity.tts.speak(`哎呀，${appName}好像没有安装，请到若琪 app 查看一下吧`)
          .then(() => activity.exit())
        break
      }
      case '/malicious-nlp':
      default:
        activity.exit()
    }
  })
}
