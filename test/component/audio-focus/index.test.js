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
    exclusive: 0,
    mayDuck: 0,
    transient: 0
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
    exclusive: 0,
    mayDuck: 0,
    transient: 1
  })
  t.looseEqual(comp.lastingRequest, null)
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
    exclusive: 0,
    mayDuck: 0,
    transient: 1
  })
  t.deepEqual(comp.lastingRequest, {
    id: 1,
    appId: 'test',
    exclusive: 0,
    mayDuck: 0,
    transient: 0
  })
  t.end()
})

test('transient request should gain focus over transient request', t => {
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
    exclusive: 0,
    mayDuck: 0,
    transient: 1
  })
  t.looseEqual(comp.lastingRequest, null)
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
    exclusive: 0,
    mayDuck: 0,
    transient: 0
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
    exclusive: 0,
    mayDuck: 0,
    transient: 0
  })
  t.end()
})
