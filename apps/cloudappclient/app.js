'use strict'

var Directive = require('./directive').Directive
var eventRequest = require('./eventRequestApi')
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
        logger.log('====> tts event' + name)
        if (name === 'start') {
          if (dt.data.disableEvent === false) {
            eventRequest.ttsEvent('Voice.STARTED', dt.data.appId, dt.data.item.itemId)
          }
        } else if (name === 'end') {
          if (dt.data.disableEvent === false) {
            eventRequest.ttsEvent('Voice.FINISHED', dt.data.appId, dt.data.item.itemId, (response) => {
              logger.log('-----> end response', response)
              var action = JSON.parse(response)
              sos.append(null, action)
            })
          } else {
            next()
          }
        } else if (name === 'cancel') {
          if (dt.data.disableEvent === false) {
            eventRequest.ttsEvent('Voice.FINISHED', dt.data.appId, dt.data.item.itemId, (response) => {
              logger.log('tts response', response)
              var action = JSON.parse(response)
              sos.append(null, action)
            })
          } else {
            next()
          }
        }
      })
    } else if (dt.action === 'cancel') {
      activity.tts.stop()
        .then(() => {
          next()
          if (dt.data.disableEvent === false) {
            eventRequest.ttsEvent('Voice.FINISHED', dt.data.appId, dt.data.item.itemId, (response) => {
              logger.log('tts response', response)
            })
          }
        })
    }
  })
  directive.do('frontend', 'media', function (dt, next) {
    if (dt.action === 'play') {
      mediaClient.start(dt.data.item.url, function (name, args) {
        if (name === 'prepared') {
          if (dt.data.disableEvent === false) {
            eventRequest.mediaEvent('Media.STARTED', dt.data.appId, {
              itemId: dt.data.item.itemId,
              duration: args[0],
              progress: args[1]
            }, (response) => {
              // nothing to do now
            })
          }
        } else if (name === 'playbackcomplete') {
          next()
          if (dt.data.disableEvent === false) {
            eventRequest.mediaEvent('Media.FINISHED', dt.data.appId, {
              itemId: dt.data.item.itemId,
              token: dt.data.item.token
            }, (response) => {
              var action = JSON.parse(response)
              activity.mockNLPResponse(null, action)
            })
          }
        }
      })
    } else if (dt.action === 'pause') {
      activity.media.pause(function () {
        next()
        if (dt.data.disableEvent === false) {
          eventRequest.mediaEvent('Media.PAUSED', dt.data.appId, {
            itemId: dt.data.item.itemId,
            token: dt.data.item.token
          })
        }
      })
    } else if (dt.action === 'resume') {
      activity.media.resume(function () {
        next()
        if (dt.data.disableEvent === false) {
          eventRequest.mediaEvent('Media.STARTED', dt.data.appId, {
            itemId: dt.data.item.itemId,
            token: dt.data.item.token
          })
        }
      })
    } else if (dt.action === 'cancel') {
      activity.media.stop(function () {
        next()
        if (dt.data.disableEvent === false) {
          eventRequest.mediaEvent('Media.FINISHED', dt.data.appId, {
            itemId: dt.data.item.itemId,
            token: dt.data.item.token
          })
        }
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

  activity.on('ready', function () {
    logger.log(this.appId + ' app ready')
  })

  activity.on('error', function (err) {
    logger.log('app error: ', err)
  })

  activity.on('create', function () {
    logger.log('get CONFIG from OS')
    activity.get('all')
      .then((result) => {
        logger.log('get prop success', result)
        eventRequest.setConfig(result || {})
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
      sos.destroy()
      return
    }
    sos.onrequest(nlp, action)
  })

  activity.on('destroy', function () {
    logger.log(this.appId + ' destroyed')
    sos.destroy()
  })
}
