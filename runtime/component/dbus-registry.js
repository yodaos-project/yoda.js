var dbus = require('dbus')
var EventEmitter = require('events')
var util = require('util')

var logger = require('logger')('dbus')
var _ = require('@yoda/util')._
var safeParse = require('@yoda/util').json.safeParse

var dbusConfig = require('../lib/config').getConfig('dbus-config.json')

module.exports = DBus
function DBus (runtime) {
  EventEmitter.call(this)
  this.runtime = runtime
  this.component = runtime.component
}
util.inherits(DBus, EventEmitter)

DBus.prototype.init = function init () {
  var service = dbus.registerService('session', dbusConfig.service)
  this.service = service

  ;['amsexport', 'yodadebug'].forEach(namespace => {
    if (typeof this[namespace] !== 'object') {
      throw new TypeError(`Expect object on component.dbus.prototype.${namespace}.`)
    }

    var object = service.createObject(dbusConfig[namespace].objectPath)
    var iface = object.createInterface(dbusConfig[namespace].interface)

    Object.keys(this[namespace]).forEach(method => {
      var descriptor = this[namespace][method]
      iface.addMethod(method, {
        in: descriptor.in,
        out: descriptor.out
      }, descriptor.fn.bind(this))
    })
  })
}

DBus.prototype.callMethod = function callMethod (
  serviceName, objectPath, interfaceName,
  member, args) {
  return new Promise((resolve, reject) => {
    var sig = args.map((arg) => {
      if (typeof arg === 'boolean') {
        return 'b'
      } else {
        return 's'
      }
    }).join('')
    this.service._dbus.callMethod(
      serviceName,
      objectPath,
      interfaceName,
      member, sig, args, resolve)
  })
}

DBus.prototype.amsexport = {
  Hibernate: {
    in: [],
    out: ['s'],
    fn: function Hibernate (cb) {
      // TODO: `Hibernate` is a published API. Should be updated on next major version.
      this.component.visibility.abandonAllVisibilities()
        .then(
          () => cb(null, '{"ok": true}'),
          err => {
            logger.error('unexpected error on deactivating apps in stack', err.stack)
            cb(null, JSON.stringify({ ok: false, error: err.message }))
          }
        )
    }
  },
  OpenUrl: {
    in: ['s', 's'],
    out: ['s'],
    fn: function OpenUrl (url, optionsJson, cb) {
      var options
      if (typeof optionsJson === 'function') {
        cb = optionsJson
        options = {}
      } else {
        options = safeParse(optionsJson)
      }
      this.runtime.openUrl(url, options)
        .then(result => {
          cb(null, JSON.stringify({ ok: true, result: result }))
        })
        .catch(err => {
          logger.error('unexpected error on opening url', url, optionsJson, err.stack)
          cb(null, JSON.stringify({ ok: false, message: err.message, stack: err.stack }))
        })
    }
  },
  LaunchApp: {
    in: ['s', 's'],
    out: ['s'],
    fn: function LaunchApp (appId, optionsJson, cb) {
      var options
      if (typeof optionsJson === 'function') {
        cb = optionsJson
        options = {}
      } else {
        options = safeParse(optionsJson)
      }
      var stopBeforeLaunch = _.get(options, 'stopBeforeLaunch', true)
      var mode = _.get(options, 'mode')
      logger.info('launch requested by dbus iface', appId, 'mode', mode)
      var future = Promise.resolve()
      if (stopBeforeLaunch) {
        future = this.component.appScheduler.suspendApp(appId)
      }
      future
        .then(() => this.component.appScheduler.createApp(appId, options))
        .then(() => {
          cb(null, JSON.stringify({ ok: true, result: { appId: appId, mode: mode } }))
        })
        .catch(err => {
          logger.error('unexpected error on launch app', appId, 'mode', mode, err.stack)
          cb(null, JSON.stringify({ ok: false, message: err.message, stack: err.stack }))
        })
    }
  },
  ForceStop: {
    in: ['s'],
    out: ['s'],
    fn: function ForceStop (appId, cb) {
      logger.info('force stop requested by dbus iface', appId)
      this.component.appScheduler.suspendApp(appId, { force: true })
        .then(() => {
          cb(null, JSON.stringify({ ok: true, result: { appId: appId } }))
        })
        .catch(err => {
          logger.error('unexpected error on launch app', appId, err.stack)
          cb(null, JSON.stringify({ ok: false, message: err.message, stack: err.stack }))
        })
    }
  },
  ListPackages: {
    in: ['s'],
    out: ['s'],
    fn: function ListPackages (optionJson, cb) {
      if (typeof optionJson === 'function') {
        cb = optionJson
        optionJson = undefined
      }
      var options = safeParse(optionJson)
      var packageName = _.get(options, 'packageName')
      if (packageName) {
        cb(null, JSON.stringify({ ok: true, result: this.component.appLoader.appManifests[packageName] }))
        return
      }
      cb(null, JSON.stringify({ ok: true, result: this.component.appLoader.appManifests }))
    }
  },
  Reload: {
    in: ['s'],
    out: ['s'],
    fn: function Reload (appId, cb) {
      if (typeof appId === 'function') {
        cb = appId
        appId = undefined
      }

      var future
      if (appId) {
        future = this.component.appScheduler.suspendApp(appId)
          .then(() => this.component.appLoader.reload(appId))
          .then(() => {
            cb(null, JSON.stringify({ ok: true, result: this.component.appLoader.appManifests[appId] }))
          })
      } else {
        future = this.component.appScheduler.suspendAllApps()
          .then(() => this.component.appLoader.reload())
          .then(() => {
            cb(null, JSON.stringify({ ok: true, result: this.component.appLoader.appManifests }))
          })
      }
      future.catch(err => {
        logger.error('unexpected error on reload', err.stack)
        cb(null, JSON.stringify({ ok: false, message: err.message, stack: err.stack }))
      })
    }
  }
}

DBus.prototype.yodadebug = {
  GetLoader: {
    in: [],
    out: ['s'],
    fn: function (cb) {
      cb(null, JSON.stringify({
        ok: true,
        result: {
          hostAppIdMap: this.component.appLoader.hostAppIdMap,
          appManifests: this.component.appLoader.appManifests,
          broadcasts: this.component.appLoader.broadcasts
        }
      }))
    }
  },
  InspectComponent: {
    in: ['s'],
    out: ['s'],
    fn: function (name, cb) {
      if (typeof name === 'function') {
        cb = name
        name = null
        return cb(null, JSON.stringify({ ok: true, result: Object.keys(this.component) }))
      }
      var component = this.component[name]
      if (component == null) {
        return cb(null, JSON.stringify({ ok: false, message: `Component not found: '${name}'.` }))
      }
      var result = {}
      Object.getOwnPropertyNames(component).forEach(key => {
        var val = component[key]
        if (val === this.runtime || val === this.component) {
          return
        }
        try {
          JSON.stringify(val)
          result[key] = val
        } catch (e) {
          result[key] = '[Circular]'
        }
      })
      cb(null, JSON.stringify({ ok: true, result: result }))
    }
  },
  mockKeyboard: {
    in: ['s'],
    out: ['s'],
    fn: function fn (cmdStr, cb) {
      var cmd
      try {
        cmd = JSON.parse(cmdStr)
      } catch (err) {
        return cb(null, JSON.stringify({ ok: false, message: err.message, stack: err.stack }))
      }
      this.component.keyboard.input.emit(cmd.event, { keyCode: cmd.keyCode, keyTime: cmd.keyTime })
      return cb(null, JSON.stringify({ ok: true, result: null }))
    }
  },
  reportMemoryUsage: {
    in: [],
    out: ['s'],
    fn: function ReportMemoryUsage (cb) {
      cb(null, JSON.stringify(process.memoryUsage()))
    }
  }
}
