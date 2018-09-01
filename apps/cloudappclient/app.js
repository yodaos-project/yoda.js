'use strict'

var Directive = require('./directive').Directive
var eventRequest = require('./eventRequestApi')
var Manager = require('./manager')

module.exports = activity => {
  // create an extapp
  var directive = new Directive()
  // skill os
  var sos = new Manager(directive)

  sos.on('updateStack', (stack) => {
    console.log('updateStack', stack)
    activity.syncCloudAppIdStack(stack)
  })

  var prevMediaItemData = null
  var mediaNextFn = null
  activity.media.on('prepared', function (duration, position) {
    if (!prevMediaItemData) {
      return
    }
    if (prevMediaItemData.disableEvent === false) {
      eventRequest.mediaEvent('Media.STARTED', prevMediaItemData.appId, {
        itemId: prevMediaItemData.item.itemId,
        duration: duration,
        progress: position
      }, (response) => {
        // console.log('media response', response);
      })
    }
  })
  activity.media.on('playbackcomplete', function () {
    if (!prevMediaItemData) {
      return
    }
    if (typeof mediaNextFn === 'function') {
      mediaNextFn()
    }
    if (prevMediaItemData.disableEvent === false) {
      eventRequest.mediaEvent('Media.FINISHED', prevMediaItemData.appId, {
        itemId: prevMediaItemData.item.itemId,
        token: prevMediaItemData.item.token
      }, (response) => {
        // console.log('media response', response);
        var action = JSON.parse(response)
        activity.mockNLPResponse(null, action)
      })
    }
  })

  directive.do('frontend', 'tts', function (dt, next) {
    if (dt.action === 'say') {
      activity.media.pause()
      activity.tts.speak(dt.data.item.tts, function (name) {
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
            // console.log('tts response', response);
          })
        }
      })
    }
  })
  directive.do('frontend', 'media', function (dt, next) {
    if (dt.action === 'play') {
      prevMediaItemData = dt.data || {}
      mediaNextFn = next
      activity.media.start(dt.data.item.url)
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

  activity.on('created', function () {
    console.log(this.appId + ' created')
  })

  activity.on('paused', function () {
    console.log(this.appId + ' paused')
    sos.pause()
  })

  activity.on('resumed', function () {
    console.log(this.appId + ' resumed')
    sos.resume()
  })

  activity.on('onrequest', function (nlp, action) {
    // console.log(this.appId + ' onrequest', nlp, action);
    sos.onrequest(nlp, action)
  })

  activity.on('destroyed', function () {
    console.log(this.appId + ' destroyed')
    sos.destroy()
  })
}
