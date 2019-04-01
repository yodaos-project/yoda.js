var test = require('tape')

var ttsMock = require('./mock')
var helper = require('../../helper')
var TtsService = require(`${helper.paths.runtime}/services/ttsd/service`)
var TtsFlora = require(`${helper.paths.runtime}/services/ttsd/flora`)

function emit (flora, name, msg) {
  var handler = flora.handlers[name]
  if (typeof handler !== 'function') {
    throw new Error(`unknown handler ${name}`)
  }
  handler.call(flora, msg || [])
}

function invoke (flora, name, msg) {
  var handler = flora.remoteMethods[name]
  if (typeof handler !== 'function') {
    throw new Error(`unknown handler ${name}`)
  }
  return new Promise(resolve => {
    handler.call(flora, msg || [], {
      end: (code, res) => {
        resolve({ code: code, res: res })
      }
    })
  })
}

test('should recover paused playing on voice coming', t => {
  t.plan(5)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})
  var flora = new TtsFlora(service)

  var eventRecords = [ ]
  service.on('start', (id, appId) => {
    eventRecords.push(`start-${id}`)
  })
  service.on('cancel', (id) => {
    eventRecords.push(`cancel-${id}`)
  })
  service.on('end', (id, appId) => {
    eventRecords.push(`end-${id}`)
    t.deepEqual(eventRecords, [
      'start-0',
      'end-0'
    ])
  })

  service.speak('@test', 'foobar')
  setTimeout(() => {
    emit(flora, 'rokid.turen.voice_coming')
    t.strictEqual(service.pausedReqIdOnAwaken, 0)
    t.strictEqual(service.pausedAppIdOnAwaken, '@test')
  }, 50)
  setTimeout(() => {
    invoke(flora, 'yodart.ttsd.resetAwaken', [ '@test' ])
      .then(() => {
        t.looseEqual(service.pausedReqIdOnAwaken, null)
        t.looseEqual(service.pausedAppIdOnAwaken, null)
      })
  }, 100)
})

test('should recover paused playing on multiple voice coming', t => {
  t.plan(5)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})
  var flora = new TtsFlora(service)

  var eventRecords = [ ]
  service.on('start', (id, appId) => {
    eventRecords.push(`start-${id}`)
  })
  service.on('cancel', (id) => {
    eventRecords.push(`cancel-${id}`)
  })
  service.on('end', (id, appId) => {
    eventRecords.push(`end-${id}`)
    t.deepEqual(eventRecords, [
      'start-0',
      'end-0'
    ])
  })

  service.speak('@test', 'foobar')
  setTimeout(() => {
    emit(flora, 'rokid.turen.voice_coming')
    t.strictEqual(service.pausedReqIdOnAwaken, 0)
    t.strictEqual(service.pausedAppIdOnAwaken, '@test')
  }, 50)
  setTimeout(() => {
    invoke(flora, 'yodart.ttsd.resetAwaken', [ '@test' ])
  }, 100)

  setTimeout(() => {
    emit(flora, 'rokid.turen.voice_coming')
    t.strictEqual(service.pausedReqIdOnAwaken, 0)
    t.strictEqual(service.pausedAppIdOnAwaken, '@test')
  }, 110)
  setTimeout(() => {
    invoke(flora, 'yodart.ttsd.resetAwaken', [ '@test' ])
  }, 120)
})
