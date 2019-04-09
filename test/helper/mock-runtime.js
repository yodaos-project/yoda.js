var path = require('path')
var helper = require('./index')
var AppRuntime = require(`${helper.paths.runtime}/lib/app-runtime`)

class MockRuntime extends AppRuntime {
  constructor () {
    super()
    this.componentLoader.load(path.join(helper.paths.runtime, 'lib/component'))
    this.descriptorLoader.load(path.join(helper.paths.runtime, 'lib/descriptor'))
  }
}

module.exports = MockRuntime
