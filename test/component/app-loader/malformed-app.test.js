var test = require('tape')
var path = require('path')

var helper = require('../../helper')
var bootstrap = require('../../bootstrap')

var malformedApps = path.join(helper.paths.fixture, 'malformed-apps')

test('should not load app if package.json is malformed', t => {
  var tt = bootstrap()
  var loader = tt.component.appLoader

  loader.loadApp(path.join(malformedApps, 'malformed-package'))
    .then(() => {
      t.fail('unreachable path')
      t.end()
    }, err => {
      t.throws(() => { throw err }, /Malformed package\.json/)
      t.end()
    })
})

test('no error should be thrown on reload for apps with unknown notification', t => {
  var tt = bootstrap()
  var loader = tt.component.appLoader

  var appId = 'unknown-notification'
  loader.loadApp(path.join(malformedApps, appId))
    .then(() => {
      return loader.reload(appId)
    })
    .then(() => {
      t.notLooseEqual(loader.appManifests[appId], null)
      t.deepEqual(loader.appManifests[appId].notifications, [])
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
