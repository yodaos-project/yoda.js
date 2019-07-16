var test = require('tape')
var mm = require('../../helper/mock')
var bootstrap = require('../../bootstrap')

test('should set now playing info', t => {
  var suite = bootstrap()
  var mediaController = suite.component.mediaController
  var appId = 'test'
  var info = {}
  var expected = Object.assign({}, info, { appId: appId })
  var ret = mediaController.setNowPlayingInfo(appId, {})
  t.deepEqual(ret, expected)
  t.deepEqual(mediaController.nowPlayingInfo, expected)
  mediaController.setNowPlayingInfo('foo', null)
  t.deepEqual(mediaController.nowPlayingInfo, expected)
  mediaController.setNowPlayingInfo(appId, null)
  t.deepEqual(mediaController.nowPlayingInfo, null)
  t.end()
})

test('apps should be able to override now playing info', t => {
  var suite = bootstrap()
  var mediaController = suite.component.mediaController
  mediaController.setNowPlayingInfo('test', {})
  t.deepEqual(mediaController.nowPlayingInfo, { appId: 'test' })
  mediaController.setNowPlayingInfo('foo', {})
  t.deepEqual(mediaController.nowPlayingInfo, { appId: 'foo' })
  mediaController.setNowPlayingInfo('test', null)
  t.deepEqual(mediaController.nowPlayingInfo, { appId: 'foo' })
  mediaController.setNowPlayingInfo('foo', null)
  t.deepEqual(mediaController.nowPlayingInfo, null)
  t.end()
})

test('should dispatch command', t => {
  t.plan(5)
  var suite = bootstrap()
  var mediaController = suite.component.mediaController
  mediaController.setNowPlayingInfo('test', {})
  t.deepEqual(mediaController.nowPlayingInfo, { appId: 'test' })

  mm.mockReturns(suite.descriptor.mediaController, 'emitToApp', (appId, eve, args) => {
    t.strictEqual(appId, 'test')
    t.strictEqual(eve, 'command')
    t.deepEqual(args, [ { type: 'togglePausePlay' } ])
  })
  var ret = mediaController.dispatchCommand('togglePausePlay')
  t.strictEqual(ret, true)
  t.end()
})

test('dispatchCommand should return false on nothing playing', t => {
  t.plan(2)
  var suite = bootstrap()
  var mediaController = suite.component.mediaController
  t.ok(mediaController.nowPlayingInfo == null)

  mm.mockReturns(suite.descriptor.mediaController, 'emitToApp', (appId, eve, args) => {
    t.fail('unreachable path')
  })
  var ret = mediaController.dispatchCommand('togglePausePlay')
  t.strictEqual(ret, false)
  t.end()
})
