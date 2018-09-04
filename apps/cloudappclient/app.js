'use strict'

var Directive = require('./directive').Directive
var eventRequest = require('./eventRequestApi')
var TtsEventHandle = require('./ttsEventHandle')
var MediaEventHandle = require('./mediaEventHandle')

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
    console.log('updateStack', stack)
    activity.syncCloudAppIdStack(stack)
  })

  directive.do('frontend', 'tts', function (dt, next) {
    if (dt.action === 'say') {
      activity.media.pause()
      ttsClient.speak(dt.data.item.tts, function (name) {
        if (name === 'start') {
          if (dt.data.disableEvent === false) {
            eventRequest.ttsEvent('Voice.STARTED', dt.data.appId, dt.data.item.itemId)
          }
        } else if (name === 'end') {
          if (dt.data.disableEvent === false) {
            eventRequest.ttsEvent('Voice.FINISHED', dt.data.appId, dt.data.item.itemId, (response) => {
              // console.log('tts response', response);
              var action = JSON.parse(response)
              sos.append(null, action)
              // next();
            })
          } else {
            next()
          }
        } else if (name === 'cancel') {
          if (dt.data.disableEvent === false) {
            eventRequest.ttsEvent('Voice.FINISHED', dt.data.appId, dt.data.item.itemId, (response) => {
              console.log('tts response', response)
              var action = JSON.parse(response)
              sos.append(null, action)
              // next();
            })
          } else {
            next()
          }
        }
      })
    } else if (dt.action === 'cancel') {
      activity.tts.stop(function () {
        next()
        if (dt.data.disableEvent === false) {
          eventRequest.ttsEvent('Voice.FINISHED', dt.data.appId, dt.data.item.itemId, (response) => {
            console.log('tts response', response)
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
              // console.log('media response', response);
            })
          }
        } else if (name === 'playbackcomplete') {
          next()
          if (dt.data.disableEvent === false) {
            eventRequest.mediaEvent('Media.FINISHED', dt.data.appId, {
              itemId: dt.data.item.itemId,
              token: dt.data.item.token
            }, (response) => {
              // console.log('media response', response);
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
        console.log('setConfirm failed: ', error)
        next()
      })
  })

  directive.do('frontend', 'pickup', function (dt, next) {
    activity.setPickup(true)
    next()
  })

  activity.on('ready', function () {
    console.log(this.appId + ' app ready')
    activity.get('all')
      .then((result) => {
        console.log('get prop success', result[0])
        eventRequest.setConfig(JSON.parse(result[0] || {}))
      })
      .catch((error) => {
        console.log('get prop error', error)
      })
  })

  activity.on('error', function (err) {
    console.log('app error: ', err)
  })

  activity.on('create', function () {
    console.log(this.appId + ' created')
  })

  activity.on('pause', function () {
    console.log(this.appId + ' paused')
    sos.pause()
  })

  activity.on('resume', function () {
    console.log(this.appId + ' resumed')
    sos.resume()
  })

  activity.on('request', function (nlp, action) {
    // console.log(this.appId + ' onrequest', nlp, action);
    sos.onrequest(nlp, action)
  })

  activity.on('destroy', function () {
    console.log(this.appId + ' destroyed')
    sos.destroy()
  })
}
