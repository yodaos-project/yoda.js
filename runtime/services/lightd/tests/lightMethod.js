var dbus = require('dbus')
var bus = dbus.getBus('session')

var DBUS_LIGHT_SERVER = 'com.service.light'
var DBUS_LIGHT_PATH = '/rokid/light'
var DBUS_LIGHT_INTERFACE = 'com.rokid.light.key'

var remoteCall = function (method, args, dbusService, dbusObjectPath, dbusInterface) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('')
    bus.callMethod(
      dbusService,
      dbusObjectPath,
      dbusInterface,
      method, sig, args, function (err) {
        if (err) {
          reject(err)
        } else {
          // 支持多个参数
          resolve(Array.prototype.slice.call(arguments, 1))
        }
      })
  })
}

var lightMethod = function (name, args) {
  return remoteCall(name, args, DBUS_LIGHT_SERVER, DBUS_LIGHT_PATH, DBUS_LIGHT_INTERFACE)
}

module.exports = lightMethod
