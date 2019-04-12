var path = require('path')
var helper = require('./index')
var AppRuntime = require(`${helper.paths.runtime}/app-runtime`)

class MockRuntime extends AppRuntime {
  constructor () {
    super()
    this.componentLoader.load(path.join(helper.paths.runtime, 'component'))
    this.descriptorLoader.load(path.join(helper.paths.runtime, 'descriptor'))
  }
}

module.exports = MockRuntime
