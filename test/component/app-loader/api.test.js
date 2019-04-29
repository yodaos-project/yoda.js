var test = require('tape')

var helper = require('../../helper')
var AppLoader = require(`${helper.paths.runtime}/component/app-loader`)
var mock = require('./mock')

test('should register broadcasts', t => {
  t.plan(2)
  var fakeRuntime = mock.mockRuntime()
  var loader = new AppLoader(fakeRuntime)

  loader.registerBroadcastChannel('foobar')
  t.deepEqual(loader.broadcasts['foobar'], [])
  loader.reload()
  t.deepEqual(loader.broadcasts['foobar'], [])
})
