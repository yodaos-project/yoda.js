var test = require('tape')

var helper = require('../../helper')
var AppLoader = require(`${helper.paths.runtime}/lib/component/app-loader`)
var mock = require('./mock')

test('should register notifications', t => {
  t.plan(2)
  var fakeRuntime = mock.mockRuntime()
  var loader = new AppLoader(fakeRuntime)

  loader.registerNotificationChannel('foobar')
  t.deepEqual(loader.notifications['foobar'], [])
  loader.reload()
  t.deepEqual(loader.notifications['foobar'], [])
})
