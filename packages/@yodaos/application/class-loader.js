var path = require('path')
var _ = require('@yoda/util')._
var symbol = require('./symbol')

module.exports.getManifest = getManifest
module.exports.loadPackage = loadPackage
module.exports.getComponent = getComponent

function getManifest (api) {
  var manifest = api[symbol.manifest]
  if (manifest != null) {
    return manifest
  }
  var appHome = api.appHome
  var packageJson = require(path.join(appHome, 'package.json'))
  manifest = packageJson.manifest || {}

  ;['services', 'hosts'].forEach(field => {
    var ff = _.get(manifest, field, [])
    manifest[field] = ff.map(it => {
      if (!Array.isArray(it)) {
        it = [ it ]
      }
      return it
    })
  })

  api[symbol.manifest] = manifest
  return manifest
}

function loadPackage (api, registry) {
  var appHome = api.appHome
  var manifest = getManifest(api)
  var services = manifest.services
  services.forEach(it => {
    var name = it[0]
    registry.service[name] = {
      path: path.join(appHome, _.get(it, '1.main', name))
    }
  })
}

function getComponent (application, name, type) {
  var registry = application[symbol.registry]
  var entity = registry[type][name]
  if (entity == null) {
    throw new Error(`Unknown app component '${type}:${name}'.`)
  }
  var component = entity.mod
  if (component == null) {
    component = entity.mod = require(entity.path)
    component[symbol.componentName] = name
  }
  return component
}
