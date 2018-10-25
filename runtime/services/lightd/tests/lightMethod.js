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

/**
 * play light
 * @param {string} appId your appId
 * @param {string} uri the path of light uri
 * @param {object} [data] user's data for light
 * @param {object} [option]
 * @param {boolean} [option.shouldResume] should resume this light
 * @return {Promise}
 */
function play (appId, uri, data, option) {
  var dataStr
  var optionStr
  if (!data) {
    dataStr = '{}'
  } else {
    dataStr = JSON.stringify(data)
  }
  if (!option) {
    optionStr = '{}'
  } else {
    optionStr = JSON.stringify(option)
  }
  return lightMethod('play', [appId, uri, dataStr, optionStr])
}

/**
 * stop specified light through appId, clear recovery layer also
 * @param {string} appId your appId
 * @param {string} uri the uri of light to stop
 * @return {Promise}
 */
function stop (appId, uri) {
  return lightMethod('stop', [appId, uri])
}

/**
 * stop any light through appId, clear recovery layer also
 * @param {string} appId your appId
 * @return {Promise}
 */
function stopByAppId (appId) {
  return lightMethod('stop', [appId, ''])
}

/**
 * play sound
 * @param {string} appId your appId
 * @param {string} uri the uri of sound
 * @return {Promise}
 */
function appSound (appId, uri) {
  return lightMethod('appSound', [appId, uri])
}

/**
 * stop sound by specified appId
 * @param {string} appId your appId
 * @return {Promise}
 */
function stopSoundByAppId (appId) {
  if (!appId) {
    throw new Error('appId is required')
  }
  return lightMethod('stopSound', [appId])
}

module.exports.lightMethod = lightMethod
module.exports.play = play
module.exports.stop = stop
module.exports.stopByAppId = stopByAppId
module.exports.appSound = appSound
module.exports.stopSoundByAppId = stopSoundByAppId
