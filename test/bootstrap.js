var AppRuntime = require('./helper/mock-runtime')

module.exports = function bootstrap () {
  var runtime = new AppRuntime()
  return {
    runtime: runtime,
    component: runtime.component,
    descriptor: runtime.descriptor
  }
}
