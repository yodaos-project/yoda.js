'use strict'
var logger = require('logger')('dbus-remote-call')

function Proxy (bus, options) {
  this.options = options
  this.bus = bus

  this.dbusDaemonSignalsListened = false
  /**
   * @type {{ [serviceName: string]: { uniqueName?: string, listeners: any[] } }}
   */
  this.serviceMap = {}
}

Proxy.prototype.invoke = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args && args.length > 0 ? args.map(() => 's').join('') : ''
    this.bus.callMethod(
      this.options.dbusService,
      this.options.dbusObjectPath,
      this.options.dbusInterface,
      name, sig, args || [], function () {
        resolve(Array.prototype.slice.call(arguments, 0))
      })
  })
}

Proxy.prototype.listen = function (serviceName, objectPath, ifaceName, listener) {
  this.__listenDbusDaemonSignals()

  var service
  if (this.serviceMap[serviceName] == null) {
    service = this.serviceMap[serviceName] = { listeners: [] }
  }
  service.listeners.push([ objectPath, ifaceName, listener ])

  this.__listenSignal(serviceName, objectPath, ifaceName, listener)
}

Proxy.prototype.__listenSignal = function (serviceName, objectPath, ifaceName, listener) {
  this.bus.getUniqueServiceName(serviceName, (err, uniqueName) => {
    if (err) {
      logger.error(`Unable to fetch unique service name for service(${serviceName})`, err)
      return
    }
    var service = this.serviceMap[serviceName]
    if (service == null) {
      service = this.serviceMap[serviceName] = { listeners: [] }
    }
    service.uniqueName = uniqueName

    this.bus.addSignalFilter(uniqueName, objectPath, ifaceName)

    var channel = `${uniqueName}:${objectPath}:${ifaceName}`
    this.bus.on(channel, listener)
  })
}

Proxy.prototype.__listenDbusDaemonSignals = function () {
  if (this.dbusDaemonSignalsListened) {
    return
  }
  var sender = 'org.freedesktop.DBus'
  var objectPath = '/org/freedesktop/DBus'
  var ifaceName = 'org.freedesktop.DBus'
  Object.keys(this.__dbusDaemonSignalHandler).forEach(it => {
    this.__addSignalFilter(sender, objectPath, ifaceName, it)
  })
  var channel = `${sender}:${objectPath}:${ifaceName}`
  this.bus.on(channel, this.__onDbusDaemonSignals.bind(this))
  this.dbusDaemonSignalsListened = true
}

Proxy.prototype.__addSignalFilter = function (sender, objectPath, ifaceName, member) {
  var rule = `type='signal',sender='${sender}',path=${objectPath},interface='${ifaceName}'`
  if (member) {
    rule += `,member='${member}'`
  }
  this.bus.dbus.addSignalFilter(rule)
}

Proxy.prototype.__onDbusDaemonSignals = function __onDbusDaemonSignals (msg) {
  var handler = this.__dbusDaemonSignalHandler[msg.name]
  if (handler == null) {
    return
  }
  handler.call(this, msg)
}

Proxy.prototype.__dbusDaemonSignalHandler = {
  'NameOwnerChanged': function NameAcquired (msg) {
    var serviceName = msg.args[0]
    var origin = msg.args[1]
    var target = msg.args[2]
    var service = this.serviceMap[serviceName]
    if (service == null) {
      return
    }
    if (!Array.isArray(service.listeners)) {
      return
    }
    var uniqueName = service.uniqueName
    service.listeners.forEach(it => {
      var objectPath = it[0]
      var ifaceName = it[1]
      var listener = it[2]
      if (origin) {
        logger.info(`Remove abandoned name owner listening for ${serviceName}:${objectPath}:${ifaceName}`)
        this.bus.removeAllListeners(`${uniqueName}:${objectPath}:${ifaceName}`)
      }
      if (target) {
        logger.info(`Re-listening dbus signal for ${serviceName}:${objectPath}:${ifaceName}`)
        this.__listenSignal(serviceName, objectPath, ifaceName, listener)
      }
    })
  }
}

module.exports = Proxy
