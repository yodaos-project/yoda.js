var test = require('tape')
var bootstrap = require('../../bootstrap')
var mm = require('../../helper/mock')

mm.proxyFunction(require('@yoda/manifest'), 'get', {
  after: (ret, self, args) => {
    if (args[0] === 'capabilities.main-visibility') {
      return 'voice'
    }
    return ret
  }
})

test('should get key and visible app id', t => {
  var tt = bootstrap()
  var audioFocus = tt.component.audioFocus
  var audioFocusDescriptor = tt.descriptor.audioFocus
  var visibility = tt.component.visibility

  mm.mockReturns(audioFocusDescriptor, 'emitToApp', function (appId, event, args) {})

  audioFocus.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  t.strictEqual(visibility.getKeyAndVisibleAppId(), 'test')
  t.end()
})

test('should get all visible app ids', t => {
  var tt = bootstrap()
  var audioFocus = tt.component.audioFocus
  var audioFocusDescriptor = tt.descriptor.audioFocus
  var visibility = tt.component.visibility

  mm.mockReturns(audioFocusDescriptor, 'emitToApp', function (appId, event, args) {})

  audioFocus.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  t.deepEqual(visibility.getVisibleAppIds(), [ 'test' ])
  t.end()
})

test('should abandon key visibility', t => {
  var tt = bootstrap()
  var audioFocus = tt.component.audioFocus
  var audioFocusDescriptor = tt.descriptor.audioFocus
  var visibility = tt.component.visibility

  mm.mockReturns(audioFocusDescriptor, 'emitToApp', function (appId, event, args) {})

  audioFocus.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  audioFocus.request({
    id: 1,
    appId: 'test-2',
    gain: 0b001 /** transient */
  })
  t.strictEqual(visibility.getKeyAndVisibleAppId(), 'test-2')
  visibility.abandonKeyVisibility()
  t.strictEqual(visibility.getKeyAndVisibleAppId(), 'test')
  visibility.abandonKeyVisibility()
  t.strictEqual(visibility.getKeyAndVisibleAppId(), undefined)
  t.end()
})

test('should abandon all visibilities', t => {
  var tt = bootstrap()
  var audioFocus = tt.component.audioFocus
  var audioFocusDescriptor = tt.descriptor.audioFocus
  var visibility = tt.component.visibility

  mm.mockReturns(audioFocusDescriptor, 'emitToApp', function (appId, event, args) {})

  audioFocus.request({
    id: 1,
    appId: 'test',
    gain: 0b000 /** default */
  })
  audioFocus.request({
    id: 1,
    appId: 'test-2',
    gain: 0b001 /** transient */
  })
  t.strictEqual(visibility.getKeyAndVisibleAppId(), 'test-2')
  visibility.abandonAllVisibilities()
  t.strictEqual(visibility.getKeyAndVisibleAppId(), undefined)
  t.end()
})
