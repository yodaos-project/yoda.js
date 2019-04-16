var test = require('tape')
var path = require('path')

var _ = require('@yoda/util')._
var helper = require('../../helper')
var bootstrap = require('../../bootstrap')

test('should load path', t => {
  var tt = bootstrap()
  var loader = tt.component.appLoader

  loader.loadPath(helper.paths.apps)
    .then(() => {
      t.assert(Object.keys(loader.appManifests).length > 0)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should skip path if not exist', t => {
  var tt = bootstrap()
  var loader = tt.component.appLoader

  loader.loadPath(helper.paths.apps + 'foobar')
    .then(() => {
      t.pass()
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should load paths', t => {
  var tt = bootstrap()
  var loader = tt.component.appLoader

  loader.loadPaths([ helper.paths.apps ])
    .then(() => {
      t.assert(Object.keys(loader.appManifests).length > 0)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should load app', t => {
  var tt = bootstrap()
  var loader = tt.component.appLoader

  var appPath = path.join(helper.paths.fixture, 'simple-app')
  loader.loadApp(appPath)
    .then(() => {
      var packagePath = path.join(appPath, 'package.json')
      var pkgInfo = require(packagePath)
      var appId = pkgInfo.name
      var permissions = _.get(pkgInfo, 'metadata.permission', [])
      var hosts = _.get(pkgInfo, 'metadata.hosts', [])

      hosts.forEach(it => {
        t.strictEqual(loader.hostAppIdMap[it.name], it.appId)
      })
      t.deepEqual(tt.component.permission.permission[appId], permissions)

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should load dbus app', t => {
  var tt = bootstrap()
  var loader = tt.component.appLoader

  var appId = '@dbus-app'
  var manifest = {
    objectPath: 'foo',
    ifaceName: 'bar',
    permission: []
  }
  loader.setManifest(appId, manifest, { dbusApp: true })
  t.deepEqual(tt.component.permission.permission[appId], manifest.permission)

  var loadedManifest = loader.appManifests[appId]
  t.strictEqual(loadedManifest.objectPath, 'foo', 'objectPath')
  t.strictEqual(loadedManifest.ifaceName, 'bar', 'ifaceName')

  t.end()
})
