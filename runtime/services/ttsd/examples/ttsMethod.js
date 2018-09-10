/**
 * author: sudo <xiaofei.lan@rokid.com>
 * examples:
 *
 *  ttsMethod('speak', ['@appId', 'text to speech'])
 *    .then(res => console.log(res))
 *    .catch(err => console.log(err))
 *
 * 注意：调用 speak 会进行权限检查，测试时可以把 appId 设置为 '@cloud'，ttsd 无法独立运行，需要依赖OS的登录信息
 */

var dbus = require('dbus')
var bus = dbus.getBus('session')

var DBUS_TTS_SERVER = 'com.service.tts'
var DBUS_TTS_PATH = '/tts/service'
var DBUS_TTS_INTERFACE = 'tts.service'

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

var ttsMethod = function (name, args) {
  return remoteCall(name, args, DBUS_TTS_SERVER, DBUS_TTS_PATH, DBUS_TTS_INTERFACE)
}

module.exports = ttsMethod
