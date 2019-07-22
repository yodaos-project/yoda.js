var test = require('tape')
var bootstrap = require('../../bootstrap')
var mm = require('../../helper/mock')

test('default request should gain focus', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus
  mm.mockReturns(desc, 'emitToApp', function () {
    t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'gain', [ 1 ] ])
  })

  var ret = comp.request({
    id: 1,
    appId: 'test'
  })
  t.strictEqual(ret, 0)
  t.looseEqual(comp.transientRequest, null)
  t.deepEqual(comp.lastingRequest, {
    id: 1,
    appId: 'test',
    exclusive: false,
    mayDuck: false,
    transient: false
  })
  t.end()
})

test('transient request should gain focus', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus
  mm.mockReturns(desc, 'emitToApp', function () {
    t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'gain', [ 1 ] ])
  })

  var ret = comp.request({
    id: 1,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  t.strictEqual(ret, 0)
  t.deepEqual(comp.transientRequest, {
    id: 1,
    appId: 'test',
    exclusive: false,
    mayDuck: false,
    transient: true
  })
  t.looseEqual(comp.lastingRequest, null)
  t.end()
})

test('re-request an modified request', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus
  mm.mockReturns(desc, 'emitToApp', function () {
    t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'gain', [ 1 ] ])
  })
  comp.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  var ret = comp.request({
    id: 1,
    appId: 'test',
    gain: 0b001 /** transient */
  })

  t.deepEqual(ret, -3)
  t.end()
})

test('transient request should gain focus over default request', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus
  t.pass(6)
  mm.mockReturns(desc, 'emitToApp', true)

  var ret = comp.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  t.strictEqual(ret, 0)

  mm.mockReturns(desc, 'emitToApp', function (appId, event) {
    switch (event) {
      case 'gain': {
        t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'gain', [ 2 ] ])
        break
      }
      case 'loss': {
        t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'loss', [ 1, /** transient */true, /** mayDuck */ false ] ])
      }
    }
  })

  ret = comp.request({
    id: 2,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  t.strictEqual(ret, 0)

  t.deepEqual(comp.transientRequest, {
    id: 2,
    appId: 'test',
    exclusive: false,
    mayDuck: false,
    transient: true
  })
  t.deepEqual(comp.lastingRequest, {
    id: 1,
    appId: 'test',
    exclusive: false,
    mayDuck: false,
    transient: false
  })
  t.end()
})

test('transient request should gain focus over transient request', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus
  t.pass(8)
  mm.mockReturns(desc, 'emitToApp', true)

  var ret = comp.request({
    id: 0,
    appId: 'should-not-be-preempted',
    gain: 0b000 /** default */
  })
  t.strictEqual(ret, 0)
  ret = comp.request({
    id: 1,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  t.strictEqual(ret, 0)

  mm.mockReturns(desc, 'emitToApp', function (appId, event) {
    switch (event) {
      case 'gain': {
        t.strictEqual(appId, 'test')
        t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'gain', [ 2 ] ])
        break
      }
      case 'loss': {
        t.strictEqual(appId, 'test')
        t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'loss',
          [ 1, /** transient request should not loss as transient */false, /** mayDuck */ false ]
        ])
      }
    }
  })

  ret = comp.request({
    id: 2,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  t.strictEqual(ret, 0)

  t.deepEqual(comp.transientRequest, {
    id: 2,
    appId: 'test',
    exclusive: false,
    mayDuck: false,
    transient: true
  })
  t.deepEqual(comp.lastingRequest, {
    id: 0,
    appId: 'should-not-be-preempted',
    exclusive: false,
    mayDuck: false,
    transient: false
  })
  t.end()
})

test('default request should gain focus over default request', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus
  t.pass(6)
  mm.mockReturns(desc, 'emitToApp', true)

  var ret = comp.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  t.strictEqual(ret, 0)

  mm.mockReturns(desc, 'emitToApp', function (appId, event) {
    switch (event) {
      case 'gain': {
        t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'gain', [ 2 ] ])
        break
      }
      case 'loss': {
        t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'loss', [ 1, /** transient */false, /** mayDuck */ false ] ])
      }
    }
  })

  ret = comp.request({
    id: 2,
    appId: 'test',
    gain: 0b000 /** default */
  })
  t.strictEqual(ret, 0)

  t.looseEqual(comp.transientRequest, null)
  t.deepEqual(comp.lastingRequest, {
    id: 2,
    appId: 'test',
    exclusive: false,
    mayDuck: false,
    transient: false
  })
  t.end()
})

test('default request should gain focus over transient request', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus
  t.pass(6)
  mm.mockReturns(desc, 'emitToApp', true)

  var ret = comp.request({
    id: 1,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  t.strictEqual(ret, 0)

  mm.mockReturns(desc, 'emitToApp', function (appId, event) {
    switch (event) {
      case 'gain': {
        t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'gain', [ 2 ] ])
        break
      }
      case 'loss': {
        t.deepEqual(Array.prototype.slice.call(arguments), [ 'test', 'loss', [ 1, /** transient */false, /** mayDuck */ false ] ])
      }
    }
  })

  ret = comp.request({
    id: 2,
    appId: 'test',
    gain: 0b000 /** default */
  })
  t.strictEqual(ret, 0)

  t.looseEqual(comp.transientRequest, null)
  t.deepEqual(comp.lastingRequest, {
    id: 2,
    appId: 'test',
    exclusive: false,
    mayDuck: false,
    transient: false
  })
  t.end()
})

test('apps request with same request id', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus

  var eventSeq = []
  var expected = [
    [ 'test', 'gain' ],
    [ 'test', 'loss' ],
    [ 'test2', 'gain' ],
    [ 'test2', 'loss' ],
    [ 'test', 'gain' ],
    [ 'test', 'loss' ]
  ]
  mm.mockReturns(desc, 'emitToApp', function (appId, event) {
    eventSeq.push([ appId, event ])
    if (eventSeq.length === expected.length) {
      t.deepEqual(eventSeq, expected)
      t.end()
    }
  })

  comp.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  comp.request({
    id: 1,
    appId: 'test2',
    gain: 0b001 /** transient */
  })
  comp.abandon('test2', 1)
  comp.abandon('test', 1)
})

test('abandoning transient request with no request available to be recovered', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus

  var eventSeq = []
  var expected = [
    [ 'test', 'gain' ],
    [ 'test', 'loss' ]
  ]
  mm.mockReturns(desc, 'emitToApp', function (appId, event) {
    eventSeq.push([ appId, event ])
    if (eventSeq.length === expected.length) {
      t.deepEqual(eventSeq, expected)
      t.end()
    }
  })

  comp.request({
    id: 1,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  comp.abandon('test', 1)
})

test('exclusive request should not be preempted', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus

  var eventSeq = []
  var expected = [
    [ 'test-a', 'gain' ],
    [ 'test-a', 'loss', /** transient */ true, /** mayDuck */ false ],
    [ 'test-b', 'gain' ],
    [ 'test-b', 'loss', /** transient */ false, /** mayDuck */ false ],
    [ 'test-a', 'gain' ],
    [ 'test-a', 'loss', /** transient */ true, /** mayDuck */ false ],
    [ 'test-c', 'gain' ]
  ]
  mm.mockReturns(desc, 'emitToApp', function (appId, event, args) {
    eventSeq.push([ appId, event ].concat(args.splice(/** reqId */1)))
    if (eventSeq.length === expected.length) {
      t.deepEqual(eventSeq, expected)
      t.end()
    }
  })

  var ret = comp.request({
    id: 1,
    appId: 'test-a',
    gain: 0b000 /** default */
  })
  t.strictEqual(ret, 0)
  t.deepEqual(comp.lastingRequest, {
    id: 1,
    appId: 'test-a',
    exclusive: false,
    mayDuck: false,
    transient: false
  })

  ret = comp.request({
    id: 1,
    appId: 'test-b',
    gain: 0b011 /** exclusive_transient */
  })
  t.strictEqual(ret, 0)
  t.deepEqual(comp.transientRequest, {
    id: 1,
    appId: 'test-b',
    exclusive: true,
    mayDuck: false,
    transient: true
  })

  ret = comp.request({
    id: 1,
    appId: 'test-c',
    gain: 0b001 /** transient */
  })
  t.strictEqual(ret, /** FAILED */-1)

  t.deepEqual(comp.transientRequest, {
    id: 1,
    appId: 'test-b',
    exclusive: true,
    mayDuck: false,
    transient: true
  })
  comp.abandon('test-b', 1)

  ret = comp.request({
    id: 1,
    appId: 'test-c',
    gain: 0b001 /** transient */
  })
  t.strictEqual(ret, 0)
  t.deepEqual(comp.transientRequest, {
    id: 1,
    appId: 'test-c',
    exclusive: false,
    mayDuck: false,
    transient: true
  })
})

test('abandoning current focus', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus

  var eventSeq = []
  var expected = [
    [ 'test', 'gain', 1 ],
    [ 'test', 'loss', 1, /** transient */ true, /** mayDuck */ false ],
    [ 'test', 'gain', 2 ],
    [ 'test', 'loss', 2, /** transient */ false, /** mayDuck */ false ],
    [ 'test', 'gain', 1 ]
  ]
  mm.mockReturns(desc, 'emitToApp', function (appId, event, args) {
    eventSeq.push([ appId, event ].concat(args))
    if (eventSeq.length === expected.length) {
      t.deepEqual(eventSeq, expected)
      t.end()
    }
  })

  comp.abandonCurrentFocus()
  comp.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  comp.request({
    id: 2,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  comp.abandonCurrentFocus()
})

test('abandoning all focuses', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus

  var eventSeq = []
  var expected = [
    [ 'test', 'gain', 1 ],
    [ 'test', 'loss', 1, /** transient */ true, /** mayDuck */ false ],
    [ 'test', 'gain', 2 ],
    [ 'test', 'loss', 2, /** transient */ false, /** mayDuck */ false ],
    [ 'test', 'loss', 1, /** transient */ false, /** mayDuck */ false ]
  ]
  mm.mockReturns(desc, 'emitToApp', function (appId, event, args) {
    eventSeq.push([ appId, event ].concat(args))
    if (eventSeq.length === expected.length) {
      t.deepEqual(eventSeq, expected)
      t.end()
    }
  })

  comp.abandonAllFocuses()
  comp.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  comp.request({
    id: 2,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  comp.abandonAllFocuses()
})

test('identical focus re-requesting', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus

  var eventSeq = []
  var expected = [
    [ 'test', 'gain', 1 ],
    [ 'test', 'loss', 1, /** transient */true, /** may duck */false ],
    [ 'test', 'gain', 2 ],
    [ 'test', 'loss', 2, /** transient */false, /** may duck */false ],
    [ 'test', 'gain', 1 ]
  ]
  mm.mockReturns(desc, 'emitToApp', function (appId, event, args) {
    eventSeq.push([ appId, event ].concat(args))
  })

  comp.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  comp.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  comp.request({
    id: 2,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  comp.request({
    id: 2,
    appId: 'test',
    gain: 0b001 /** transient */
  })
  comp.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })

  t.deepEqual(eventSeq, expected)
  t.end()
})
