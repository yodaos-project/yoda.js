var test = require('tape')
var path = require('path')

var helper = require('../../helper')
var AppLoader = require(`${helper.paths.runtime}/lib/component/app-loader`)
var mock = require('./mock')

var fakeRuntime = mock.mockRuntime()
var malformedApps = path.join(helper.paths.fixture, 'malformed-apps')

test('should not load app if package.json is malformed', t => {
  var loader = new AppLoader(fakeRuntime)
  loader.loadApp(path.join(malformedApps, 'malformed-package'))
    .then(() => {
      t.fail('unreachable path')
      t.end()
    }, err => {
      t.throws(() => { throw err }, /Malformed package\.json/)
      t.end()
    })
})
