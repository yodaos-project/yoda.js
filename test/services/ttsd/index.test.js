var test = require('tape')

var ttsMock = require('./mock')
var helper = require('../../helper')
var TtsService = require(`${helper.paths.runtime}/services/ttsd/service`)

test('should synthesize speeches', t => {
  t.plan(5)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})

  service.on('start', (id, appId) => {
    t.strictEqual(id, 0)
    t.strictEqual(appId, '@test')
    t.strictEqual(service.playingReqId, id)
    ttsMock.getCurrentHandle().__end()
  })
  service.on('end', (id, appId) => {
    t.strictEqual(id, 0)
    t.strictEqual(appId, '@test')
  })

  service.speak('@test', 'foobar')
})

test('should stop previous handle before speaking new one', t => {
  t.plan(1)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})

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
      'start-1',
      /** termination events were delayed to next loop */
      'cancel-0',
      'end-1'
    ])
  })

  service.speak('@test', 'foobar')
  setTimeout(() => {
    service.speak('@test', 'foobar-2')
  }, 1000)
})

test('pause-resume event masquerade', t => {
  t.plan(1)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})

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
    service.pause('@test')
  }, 500)
  setTimeout(() => {
    service.resume('@test')
  }, 1000)
})

test('pause-resume event masquerade', t => {
  t.plan(1)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})

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
    service.pause('@test')
  }, 500)
  setTimeout(() => {
    service.resume('@test')
  }, 1000)
})

test('multiple pause-resume event masquerade', t => {
  t.plan(1)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})

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
    service.pause('@test')
  }, 500)
  setTimeout(() => {
    service.resume('@test')
  }, 1000)

  setTimeout(() => {
    service.pause('@test')
  }, 1500)
  setTimeout(() => {
    service.resume('@test')
  }, 2000)
})

test('stop paused request', t => {
  t.plan(1)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})

  var eventRecords = [ ]
  function defer () {
    t.deepEqual(eventRecords, [
      'start-0',
      'cancel-0'
    ])
  }
  service.on('start', (id, appId) => {
    eventRecords.push(`start-${id}`)
  })
  service.on('cancel', (id) => {
    eventRecords.push(`cancel-${id}`)
    defer()
  })
  service.on('end', (id, appId) => {
    eventRecords.push(`end-${id}`)
    defer()
  })

  service.speak('@test', 'foobar')
  setTimeout(() => {
    service.pause('@test')
  }, 500)
  setTimeout(() => {
    service.stop('@test')
  }, 1000)
})

test('new request while paused request exists', t => {
  t.plan(1)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})

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
      'cancel-0',
      'start-1',
      'end-1'
    ])
  })

  service.speak('@test', 'foobar')
  setTimeout(() => {
    service.pause('@test')
  }, 500)
  setTimeout(() => {
    service.speak('@test', 'foobar')
  }, 1000)
})

test('new app request while paused request exists', t => {
  t.plan(1)
  var service = new TtsService(ttsMock.lightd)
  service.connect({})

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
      'start-1',
      'end-1'
    ])
  })

  service.speak('@test', 'foobar')
  setTimeout(() => {
    service.pause('@test')
  }, 500)
  setTimeout(() => {
    service.speak('@test-2', 'foobar')
  }, 1000)
})
