var path = require('path')
var _ = require('@yoda/util')._
var symbol = require('./symbol')

module.exports.loadPackage = loadPackage
module.exports.getComponent = getComponent

function loadPackage (api, registry) {
  var appHome = api.appHome
  var packageJson = require(path.join(appHome, 'package.json'))
  var services = _.get(packageJson, 'manifest.services', [])

  services.forEach(it => {
    if (!Array.isArray(it)) {
      it = [ it ]
    }
    var name = it[0]
    if (typeof name !== 'string') {
      return
    }
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
