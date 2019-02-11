var test = require('tape')

var property = require('@yoda/property')

var ttsMock = require('./mock')
var helper = require('../../helper')
var TtsService = require(`${helper.paths.runtime}/services/ttsd/service`)
var TtsFlora = require(`${helper.paths.runtime}/services/ttsd/flora`)

function postMessage (comp, name, msg) {
  var handler = comp.handlers[name]
  if (handler == null) {
    throw new Error(`Cannot handle unknown message ${name}`)
  }
  return Promise.resolve(handler.apply(comp, [ msg ]))
}

function invokeFloraMethod (comp, name, msg) {
  var handler = comp.remoteMethods[name]
  if (handler == null) {
    throw new Error(`Cannot handle unknown method ${name}`)
  }
  return new Promise(resolve => {
    var reply = {
      end: (code, resMsg) => {
        resolve({ code: code, msg: resMsg })
      }
    }
    handler.apply(comp, [ msg, reply ])
  })
}

test('should pause currently playing on voice coming', t => {
  t.plan(2)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})
  var comp = new TtsFlora(service)
  /** do not init comp to prevent unexpected income message */

  var expectedPausingId
  service.on('start', (id, appId) => {
    /** 2. voice coming */
    expectedPausingId = id
    property.set('state.network.connected', 'true')
    postMessage(comp, 'rokid.turen.voice_coming', [])
      .then(() => {
        /** 3. playing tts has been paused */
        t.strictEqual(service.pausedReqIdOnAwaken, expectedPausingId)
        t.deepEqual(service.appRequestMemo[appId], { reqId: expectedPausingId, text: 'foobar' })
      })
  })
  service.on('end', (id, appId) => {
    t.fail('no end event should be emitted on pausing')
  })

  /** 1. start speech synthesis */
  service.speak('@test', 'foobar')
})

test('should resume voice coming paused tts on reset awaken', t => {
  t.plan(3)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})
  var comp = new TtsFlora(service)
  /** do not init comp to prevent unexpected income message */

  var first = true
  var expectedPausingId
  service.on('start', (id, appId) => {
    if (!first) {
      t.fail('only one start event should be emitted')
      return
    }
    /** 2. voice coming */
    expectedPausingId = id
    property.set('state.network.connected', 'true')
    postMessage(comp, 'rokid.turen.voice_coming', [])
      .then(() => {
        /** 3. playing tts has been paused */
        return invokeFloraMethod(comp, 'yodart.ttsd.resetAwaken', [ '@test' ])
      })
      .then((res) => {
        var code = res.code
        var msg = res.msg

        t.strictEqual(code, 0)
        t.deepEqual(msg, [ true ])
      })
  })
  service.on('end', (id, appId) => {
    /** 4. end of resumed tts */
    t.strictEqual(id, expectedPausingId)
  })

  /** 1. start speech synthesis */
  service.speak('@test', 'foobar')
})

test('should not resume voice coming paused tts if app is not expected one', t => {
  t.plan(4)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})
  var comp = new TtsFlora(service)
  /** do not init comp to prevent unexpected income message */

  var first = true
  service.on('start', (id, appId) => {
    if (!first) {
      t.fail('only one start event should be emitted')
      return
    }
    /** 2. voice coming */
    property.set('state.network.connected', 'true')
    postMessage(comp, 'rokid.turen.voice_coming', [])
      .then(() => {
        /** 3. playing tts has been paused */
        return invokeFloraMethod(comp, 'yodart.ttsd.resetAwaken', [ '@foobar' ])
      })
      .then((res) => {
        var code = res.code
        var msg = res.msg

        t.strictEqual(code, 0)
        t.deepEqual(msg, [ false ])
        t.strictEqual(service.playingReqId, null)
        t.strictEqual(service.pausedReqIdOnAwaken, null)
      })
  })
  service.on('end', (id, appId) => {
    t.fail('no end event expected')
  })

  /** 1. start speech synthesis */
  service.speak('@test', 'foobar')
})
