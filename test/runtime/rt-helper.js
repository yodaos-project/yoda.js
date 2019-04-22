var _ = require('@yoda/util')._
var fs = require('fs')
var path = require('path')

var helper = require('../helper')
var mock = require('../helper/mock')
var AppRuntime = require(`${helper.paths.runtime}/lib/app-runtime`)

var ComponentConfig = require('/etc/yoda/component-config.json')
var ComponentConfigCopy = Object.assign({}, ComponentConfig)

module.exports.loadBaseConfig = loadBaseConfig
function loadBaseConfig () {
  ComponentConfig.paths = [ '/usr/yoda/lib/component' ]
  ComponentConfig.interception = {}
}

module.exports.restoreConfig = restoreConfig
function restoreConfig () {
  Object.assign(ComponentConfig, ComponentConfigCopy)
}

module.exports.getAppRuntime = getAppRuntime
function getAppRuntime (enabledComponents) {
  mock.proxyFunction(fs, 'readdirSync', {
    after: (ret, target, args) => {
      if (args[0] !== '/usr/yoda/lib/component') {
        return ret
      }
      return ret.filter(it => {
        return enabledComponents.indexOf(_.camelCase(path.basename(it, '.js'))) >= 0
      })
    }
  })
  var runtime = new AppRuntime()
  return runtime
}
