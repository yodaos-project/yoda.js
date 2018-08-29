'use strict'

var promisify = require('util').promisify

function Proxy (bus, options) {
  this.options = options
  this.bus = bus
}

Proxy.prototype.invoke = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args && args.length > 0 ? args.map(() => 's').join('') : ''
    this.bus.callMethod(
      this.options.dbusService,
      this.options.dbusObjectPath,
      this.options.dbusInterface,
      name, sig, args || [], function (res) {
        resolve(res)
      })
  })
}

Proxy.prototype.listen = function (serviceName, objectPath, ifaceName, callback) {
  var getUniqueServiceNameAsync = promisify(this.bus.getUniqueServiceName.bind(this.bus))
  var addSignalFilterAsync = promisify(this.bus.addSignalFilter.bind(this.bus))

  var channel
  return getUniqueServiceNameAsync(serviceName)
    .then(uniqueName => {
      channel = `${uniqueName}:${objectPath}:${ifaceName}`
      return addSignalFilterAsync(uniqueName, objectPath, ifaceName)
    })
    .then(() => {
      this.bus.on(channel, callback)
    })
}

module.exports = Proxy
