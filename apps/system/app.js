'use strict'

var logger = require('logger')('sys-app')
var wifi = require('@yoda/wifi')
var _ = require('@yoda/util')._

var fallbacks = [
  '今天的风儿好喧嚣啊',
  '这风儿似有略略欲泣',
  '风儿把不祥的东西吹到镇子里去了',
  '快走吧，在风停止之前'
]

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
          .then(() => activity.exit())
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
