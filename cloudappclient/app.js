'use strict'

var DbusAdapter = require('extapp').DbusAdapter
var ExtAppService = require('extapp').ExtAppService
var Directive = require('./directive').Directive
var eventRequest = require('./eventRequestApi')
var Manager = require('./manager')

// 创建一个service
var service = new ExtAppService(DbusAdapter, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/extapp/test',
  dbusInterface: 'com.test.interface'
})

service.on('ready', () => {
  console.log('debug: service ready')
})
service.on('error', (err) => {
  console.log('debug: service ', err.stack)
})

// create an extapp
var app = service.create('@cloud')
var directive = new Directive()
// skill os
var sos = new Manager(directive)

var prevMediaItemData = null
var mediaNextFn = null
app.media.on('prepared', function (duration, position) {
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
app.media.on('playbackcomplete', function () {
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
      app.mockNLPResponse(null, action)
    })
  }
})

directive.do('frontend', 'tts', function (dt, next) {
  if (dt.action === 'say') {
    app.media.pause()
    app.tts.speak(dt.data.item.tts, function (name) {
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
    app.tts.stop(function () {
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
    app.media.start(dt.data.item.url)
  } else if (dt.action === 'pause') {
    app.media.pause(function () {
      next()
      if (dt.data.disableEvent === false) {
        eventRequest.mediaEvent('Media.PAUSED', dt.data.appId, {
          itemId: dt.data.item.itemId,
          token: dt.data.item.token
        })
      }
    })
  } else if (dt.action === 'resume') {
    app.media.resume(function () {
      next()
      if (dt.data.disableEvent === false) {
        eventRequest.mediaEvent('Media.STARTED', dt.data.appId, {
          itemId: dt.data.item.itemId,
          token: dt.data.item.token
        })
      }
    })
  } else if (dt.action === 'cancel') {
    app.media.stop(function () {
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

app.on('ready', function () {
  console.log(this.getAppId() + ' app ready')
  app.get('all')
    .then((result) => {
      console.log('get prop success', result[0])
      eventRequest.setConfig(JSON.parse(result[0] || {}))
    })
    .catch((error) => {
      console.log('get prop error', error)
    })
})

app.on('error', function (err) {
  console.log('app error: ', err)
})

app.on('created', function () {
  console.log(this.getAppId() + ' created')
})

app.on('paused', function () {
  console.log(this.getAppId() + ' paused')
  sos.pause()
})

app.on('resumed', function () {
  console.log(this.getAppId() + ' resumed')
  sos.resume()
})

app.on('onrequest', function (nlp, action) {
  // console.log(this.getAppId() + ' onrequest', nlp, action);
  sos.onrequest(nlp, action)
})

app.on('destroyed', function () {
  console.log(this.getAppId() + ' destroyed')
  sos.destroy()
})
