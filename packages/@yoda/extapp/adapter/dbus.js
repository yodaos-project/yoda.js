'use strict'

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var dbus = require('dbus')
var logger = require('logger')('extDbusAdapter')

// vui extapp接口
var DBUS_EXTAPP_PATH = '/activation/extapp'
var DBUS_EXTAPP_INTERFACE = 'com.rokid.activation.extapp'
// vui prop接口
var DBUS_PROP_PATH = '/activation/prop'
var DBUS_PROP_INTERFACE = 'com.rokid.activation.prop'
// vui 通知接口
var DBUS_NOTIFY_PATH = '/extapp/notify'
var DBUS_NOTIFY_INTERFACE = 'rokid.notify.interface'

// ttsd 接口
var DBUS_TTS_SERVER = 'com.service.tts'
var DBUS_TTS_PATH = '/tts/service'
var DBUS_TTS_INTERFACE = 'tts.service'

// multimedia 接口
var DBUS_MULTIMEDIA_SERVER = 'com.service.multimedia'
var DBUS_MULTIMEDIA_PATH = '/multimedia/service'
var DBUS_MULTIMEDIA_INTERFACE = 'multimedia.service'

var DBUS_LIGHT_SERVER = 'com.service.light'
var DBUS_LIGHT_PATH = '/rokid/light'
var DBUS_LIGHT_INTERFACE = 'com.rokid.light.key'

function Adapter (options) {
  EventEmitter.call(this)
  this.options = options || {}
  this.bus = dbus.getBus('session')
}
inherits(Adapter, EventEmitter)

/**
 * 监听vui发送的App事件，包括App生命周期和TTS、media的事件
 * @param {function} cb App事件回调函数
 * @return {promise} 监听成功或失败
 */
Adapter.prototype.listenAppEvent = function (cb) {
  return this.listen(this.options.dbusService, this.options.dbusObjectPath, this.options.dbusInterface, (name, args) => {
    cb(name, args)
  })
}

Adapter.prototype.listenTtsdEvent = function (cb) {
  return this.listen(DBUS_TTS_SERVER, DBUS_TTS_PATH, DBUS_TTS_INTERFACE, (name, args) => {
    cb(name, args)
  })
}

Adapter.prototype.listenMultimediadEvent = function (cb) {
  return this.listen(DBUS_MULTIMEDIA_SERVER, DBUS_MULTIMEDIA_PATH, DBUS_MULTIMEDIA_INTERFACE, (name, args) => {
    cb(name, args)
  })
}

/**
 * 监听vui系统发送的事件，比如vui启动
 * @param {function} cb vui 通知事件回调
 * @return {promise} 监听成功或失败
 */
Adapter.prototype.listenVuiEvent = function (cb) {
  return this.listen(this.options.dbusService, DBUS_NOTIFY_PATH, DBUS_NOTIFY_INTERFACE, (name, args) => {
    cb(name, args)
  })
}

/**
 * 调用vui提供的extapp的方法
 * @param {string} name 要远程调用的方法名字
 * @param {string[]} args 传递给远程方法的参数
 * @return {promise}
 */
Adapter.prototype.extAppMethod = function (name, args) {
  return this.remoteCall(name, args, this.options.dbusService, DBUS_EXTAPP_PATH, DBUS_EXTAPP_INTERFACE)
}

/**
 * 调用vui提供的prop的方法
 * @param {string} name 要远程调用的方法名字
 * @param {string} args 传递给远程方法的参数
 */
Adapter.prototype.propMethod = function (name, args) {
  return this.remoteCall(name, args, this.options.dbusService, DBUS_PROP_PATH, DBUS_PROP_INTERFACE)
}

Adapter.prototype.ttsMethod = function (name, args) {
  return this.remoteCall(name, args, DBUS_TTS_SERVER, DBUS_TTS_PATH, DBUS_TTS_INTERFACE)
}

Adapter.prototype.multiMediaMethod = function (name, args) {
  return this.remoteCall(name, args, DBUS_MULTIMEDIA_SERVER, DBUS_MULTIMEDIA_PATH, DBUS_MULTIMEDIA_INTERFACE)
}

Adapter.prototype.lightMethod = function (name, args) {
  return this.remoteCall(name, args, DBUS_LIGHT_SERVER, DBUS_LIGHT_PATH, DBUS_LIGHT_INTERFACE)
}
/**
 * 调用dbus的远程方法
 * @param {string} method 要调用的方法名
 * @param {string[]} args 要传递的参数
 * @return {promise} dbus远程方法返回的值，是一个参数数组
 */
Adapter.prototype.remoteCall = function (method, args, dbusService, dbusObjectPath, dbusInterface) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('')
    this.bus.callMethod(
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

/**
 * 监听dbus signal
 * @param {string} serviceName 需要监听的dbus service name
 * @param {string} objectPath 需要监听的dbus object path
 * @param {string} ifaceName 需要监听的dbus interface name
 * @param {string} cb 收到signal事件的回调
 * @return {promise}
 */
Adapter.prototype.listen = function (serviceName, objectPath, ifaceName, cb) {
  var self = this
  var tryGetUniqueServiceName = function (serviceName, callback) {
    self.bus.getUniqueServiceName(serviceName, (err, uniqueName) => {
      if (err || uniqueName === undefined) {
        setTimeout(() => {
          tryGetUniqueServiceName(serviceName, callback)
        }, 300)
      } else {
        callback(uniqueName)
      }
    })
  }
  return new Promise((resolve, reject) => {
    tryGetUniqueServiceName(serviceName, (uniqueName) => {
      resolve(uniqueName)
    })
  }).then((uniqueName) => {
    return Promise.all([
      this.addSignalFilter(uniqueName, objectPath, ifaceName)
    ])
  }).then((names) => {
    // 监听signal
    var uniqueName = names[0]
    var channel = `${uniqueName}:${objectPath}:${ifaceName}`
    this.bus.on(channel, (message) => {
      var name = message.name
      var args = message.args
      cb.call(this, name, args)
    })
  })
}

/**
 * 增加signal过滤
 * @param {string} uniqueName dbus server的唯一name
 * @param {string} objectPath dbus的object path
 * @param {string} dbusInterface dbus的interface name
 * @return {promise} uniqueName
 */
Adapter.prototype.addSignalFilter = function (uniqueName, objectPath, ifaceName) {
  var self = this
  var timer
  var tryAddSignalFilter = function (callback) {
    self.bus.addSignalFilter(uniqueName, objectPath, ifaceName, (err) => {
      clearTimeout(timer)
      if (err) {
        setTimeout(() => {
          tryAddSignalFilter(callback)
        }, 300)
      } else {
        callback()
      }
    })
  }
  return new Promise((resolve, reject) => {
    tryAddSignalFilter(() => {
      resolve(uniqueName)
    })
  })
}

/**
 * 注册extapp
 * @param {string} appId extapp的AppID
 * @return {promise}
 */
Adapter.prototype.register = function (appId) {
  var self = this
  return new Promise((resolve, reject) => {
    tryRegister((error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
  function tryRegister (cb) {
    self.extAppMethod('register', [appId, self.options.dbusObjectPath, self.options.dbusInterface])
      .then((res) => {
        if (res && res[0] === true) {
          cb()
        } else {
          setTimeout(() => {
            logger.log('retry to register extapp with appId: ' + appId)
            tryRegister(cb)
          }, 300)
        }
      })
      .catch(() => {
        setTimeout(() => {
          tryRegister(cb)
        }, 300)
      })
  }
}

module.exports = Adapter
