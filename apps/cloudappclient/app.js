'use strict'

var Directive = require('./directive').Directive
var TtsEventHandle = require('./ttsEventHandle')
var MediaEventHandle = require('./mediaEventHandle')
var logger = require('logger')('cloudAppClient')

var Manager = require('./manager')

module.exports = activity => {
  // create an extapp
  var directive = new Directive()
  // skill os
  var sos = new Manager(directive)
  // tts, media event handle
  var ttsClient = new TtsEventHandle(activity.tts)
  var mediaClient = new MediaEventHandle(activity.media)

  sos.on('updateStack', (stack) => {
    logger.log('updateStack', stack)
    activity.syncCloudAppIdStack(stack)
  })

  directive.do('frontend', 'tts', function (dt, next) {
    if (dt.action === 'say') {
      activity.media.pause()
      ttsClient.speak(dt.data.item.tts, function (name) {
        logger.log('====> tts event ' + name)
        if (name === 'start') {
          sos.sendEventRequest('tts', 'start', dt.data, dt.data.item.itemId)
        } else if (name === 'end') {
          sos.sendEventRequest('tts', 'end', dt.data, dt.data.item.itemId, next)
        } else if (name === 'cancel') {
          sos.sendEventRequest('tts', 'cancel', dt.data, dt.data.item.itemId, next)
        }
      })
    } else if (dt.action === 'cancel') {
      activity.tts.stop()
        .then(() => {
          sos.sendEventRequest('tts', 'cancel', dt.data, dt.data.item.itemId, next)
        })
        .catch(() => {
          next()
        })
    }
  })
  directive.do('frontend', 'media', function (dt, next) {
    if (dt.action === 'play') {
      mediaClient.start(dt.data.item.url, function (name, args) {
        if (name === 'prepared') {
          sos.sendEventRequest('media', 'prepared', dt.data, {
            itemId: dt.data.item.itemId,
            duration: args[0],
            progress: args[1]
          })
        } else if (name === 'playbackcomplete') {
          sos.sendEventRequest('media', 'playbackcomplete', dt.data, {
            itemId: dt.data.item.itemId,
            token: dt.data.item.token
          }, next)
        }
      })
    } else if (dt.action === 'pause') {
      activity.media.pause()
        .then(() => {
          sos.sendEventRequest('media', 'pause', dt.data, {
            itemId: dt.data.item.itemId,
            token: dt.data.item.token
          }, next)
        })
        .catch(() => {
          next()
        })
    } else if (dt.action === 'resume') {
      activity.media.resume()
        .then(() => {
          sos.sendEventRequest('media', 'resume', dt.data, {
            itemId: dt.data.item.itemId,
            token: dt.data.item.token
          }, next)
        })
        .catch(() => {
          next()
        })
    } else if (dt.action === 'cancel') {
      activity.media.stop()
        .then(() => {
          sos.sendEventRequest('media', 'cancel', dt.data, {
            itemId: dt.data.item.itemId,
            token: dt.data.item.token
          }, next)
        })
        .catch(() => {
          next()
        })
    }
  })

  directive.do('frontend', 'confirm', function (dt, next) {
    activity.setConfirm(dt.data.confirmIntent, dt.data.confirmSlot, [], '')
      .then(() => {
        next()
      })
      .catch((error) => {
        logger.log('setConfirm failed: ', error)
        next()
      })
  })

  directive.do('frontend', 'pickup', function (dt, next) {
    activity.setPickup(true)
    next()
  })

  directive.do('frontend', 'native', function (dt, next) {
    // notice: current form default value is 'cut'
    activity.openUrl(`yoda-skill://${dt.data.packageInfo}/${dt.data.commond}`, 'cut')
    next()
  })

  activity.on('ready', function () {
    logger.log(this.appId + ' app ready')
  })

  activity.on('error', function (err) {
    logger.log('app error: ', err)
  })

  activity.on('create', function () {
    logger.log(`${this.appId} app create`)
    logger.log('get CONFIG from OS')
    activity.get('all')
      .then((result) => {
        logger.log('get prop success', result)
        sos.setEventRequestConfig(result || {})
      })
      .catch((error) => {
        logger.log('get prop error', error)
      })
    logger.log(this.appId + ' created')
  })

  activity.on('pause', function () {
    logger.log(this.appId + ' paused')
    sos.pause()
  })

  activity.on('resume', function () {
    logger.log(this.appId + ' resumed')
    sos.resume()
  })

  activity.on('request', function (nlp, action) {
    if (action.response.action.type === 'EXIT') {
      logger.log(`${this.appId} intent EXIT`)
      sos.destroy()
      return
    }
    logger.log(`${this.appId} app request`)
    sos.onrequest(nlp, action)
  })

  activity.on('destroy', function () {
    logger.log(this.appId + ' destroyed')
    sos.destroy()
  })
}
