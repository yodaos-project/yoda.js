var test = require('tape')
var bootstrap = require('../../bootstrap')
var mm = require('../../helper/mock')

test('shall abandon requests on app exited', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus
  mm.mockReturns(desc, 'emitToApp', null)

  comp.request({
    id: 1,
    appId: 'test'
  })
  t.notLooseEqual(comp.lastingRequest, null)
  comp.appDidExit('test')
  t.strictEqual(comp.lastingRequest, null)
  t.end()
})

test('shall recover requests on transient app exited', t => {
  var tt = bootstrap()
  var comp = tt.component.audioFocus
  var desc = tt.descriptor.audioFocus

  var eventSeq = []
  var expected = [
    [ 'test', 'gain' ],
    [ 'test', 'loss' ],
    [ 'test-e', 'gain' ],
    [ 'test-e', 'loss' ],
    [ 'test', 'gain' ]
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
    appId: 'test-e',
    gain: 0b001 /** transient */
  })
  comp.appDidExit('test-e')
})
