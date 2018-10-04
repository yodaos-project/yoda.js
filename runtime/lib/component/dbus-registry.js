var dbus = require('dbus')
var EventEmitter = require('events')
var util = require('util')
var path = require('path')

var logger = require('logger')('dbus')
var _ = require('@yoda/util')._

var DbusRemoteCall = require('../dbus-remote-call')
var dbusConfig = require('../../dbus-config.json')

module.exports = DBus
function DBus (runtime) {
  EventEmitter.call(this)
  this.runtime = runtime
}
util.inherits(DBus, EventEmitter)

DBus.prototype.init = function init () {
  var service = dbus.registerService('session', dbusConfig.service)
  this.service = service

  ;['extapp', 'prop', 'permission', 'amsexport', 'yodadebug'].forEach(namespace => {
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

  this.listenSignals()
}

DBus.prototype.destruct = function destruct () {

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

DBus.prototype.listenSignals = function listenSignals () {
  var self = this
  var proxy = new DbusRemoteCall(this.service._bus)
  var ttsEvents = {
    'ttsdevent': function onTtsEvent (msg) {
      var channel = `callback:tts:${_.get(msg, 'args.0')}`
      EventEmitter.prototype.emit.apply(
        self,
        [ channel ].concat(msg.args.slice(1))
      )
    }
  }
  proxy.listen(
    'com.service.tts',
    '/tts/service',
    'tts.service',
    function onTtsEvent (msg) {
      var handler = ttsEvents[msg && msg.name]
      if (handler == null) {
        logger.warn(`Unknown ttsd event type '${msg && msg.name}'.`)
        return
      }
      handler(msg)
    }
  )

  var multimediaEvents = {
    'multimediadevent': function onMultimediaEvent (msg) {
      var channel = `callback:multimedia:${_.get(msg, 'args.0')}`
      EventEmitter.prototype.emit.apply(
        self,
        [ channel ].concat(msg.args.slice(1))
      )
    }
  }
  proxy.listen(
    'com.service.multimedia',
    '/multimedia/service',
    'multimedia.service',
    function onMultimediaEvent (msg) {
      var handler = multimediaEvents[msg && msg.name]
      if (handler == null) {
        logger.warn(`Unknown multimediad event type '${msg && msg.name}'.`)
        return
      }
      handler(msg)
    }
  )
}

DBus.prototype.extapp = {
  register: {
    in: ['s', 's', 's'],
    out: ['b'],
    fn: function register (appId, objectPath, ifaceName, cb) {
      logger.info('dbus registering app', appId, objectPath, ifaceName)
      if (!this.runtime.custodian.isPrepared()) {
        /** prevent app to invoke runtime methods if runtime is not logged in yet */
        return cb(null, false)
      }
      try {
        this.runtime.registerDbusApp(appId, objectPath, ifaceName)
      } catch (err) {
        logger.error('Unexpected error on registering dbus app', appId, err && err.stack)
        return cb(null, false)
      }
      cb(null, true)
    }
  },
  destroy: {
    in: ['s'],
    out: [],
    fn: function destroy (appId, cb) {
      this.runtime.deleteDbusApp(appId)
      cb(null)
    }
  },
  start: {
    in: ['s', 's'],
    out: [],
    fn: function start (appId, form, cb) {
      if (typeof form === 'function') {
        cb = form
        form = null
      }
      logger.info('on start', Array.prototype.slice.call(arguments, 0))
      this.runtime.life.createApp(appId)
        .then(() => {
          logger.info(`activating dbus app '${appId}'`)
          this.runtime.updateCloudStack(appId, 'cut')
          return this.runtime.life.activateAppById(appId, form)
        })
        .then(
          () => cb(null),
          err => logger.error(`Unexpected error on foregrounding app '${appId}'`, err.stack)
        )
    }
  },
  exit: {
    in: ['s'],
    out: [],
    fn: function exit (appId, cb) {
      if (appId !== this.runtime.life.getCurrentAppId()) {
        logger.log('exit app permission deny')
        return cb(null)
      }
      this.runtime.exitAppById(appId)
      cb(null)
    }
  },
  tts: {
    in: ['s', 's'],
    out: ['s'],
    fn: function tts (appId, text, cb) {
      if (this.runtime.loader.getExecutorByAppId(appId) == null) {
        return cb(null, '-1')
      }
      var permit = this.runtime.permission.check(appId, 'ACCESS_TTS')
      if (!permit) {
        return cb(null, '-1')
      }
      this.runtime.ttsMethod('speak', [appId, text])
        .then((res) => {
          var ttsId = res[0]
          cb(null, ttsId)
          if (ttsId === '-1') {
            return
          }

          var channel = `callback:tts:${ttsId}`
          var app = this.runtime.loader.getAppById(appId)
          this.on(channel, event => {
            if (['end', 'cancel', 'error'].indexOf(event) < 0) {
              return
            }
            this.removeAllListeners(channel)
            this.service._dbus.emitSignal(
              app.objectPath,
              app.ifaceName,
              'onTtsComplete',
              's',
              [ttsId]
            )
          })
        })
    }
  },
  media: {
    in: ['s'],
    out: ['s'],
    fn: function media (appId, url, cb) {
      if (this.runtime.loader.getExecutorByAppId(appId) == null) {
        return cb(null, '-1')
      }
      var permit = this.runtime.permission.check(appId, 'ACCESS_MULTIMEDIA')
      if (!permit) {
        return cb(null, '-1')
      }
      this.runtime.multimediaMethod('start', [appId, url, 'playback'])
        .then((result) => {
          var multimediaId = _.get(result, '0', '-1')
          logger.log('create media player', multimediaId)

          cb(null, multimediaId)
          if (multimediaId === '-1') {
            return
          }

          var channel = `callback:multimedia:${multimediaId}`
          var app = this.runtime.loader.getAppById(appId)
          this.on(channel, event => {
            if (['playbackcomplete', 'cancel', 'error'].indexOf(event) < 0) {
              return
            }
            this.removeAllListeners(channel)
            this.service._dbus.emitSignal(
              app.objectPath,
              app.ifaceName,
              'onMediaComplete',
              's',
              [multimediaId]
            )
          })
        })
    }
  }
}

DBus.prototype.prop = {
  all: {
    in: ['s'],
    out: ['s'],
    fn: function all (appId, cb) {
      var config = this.runtime.onGetPropAll()
      cb(null, JSON.stringify(config))
    }
  }
}

DBus.prototype.permission = {
  check: {
    in: ['s', 's'],
    out: ['s'],
    fn: function check (appId, name, cb) {
      var permit = this.runtime.permission.check(appId, name)
      logger.log('vui.permit', permit, appId, name)
      if (!permit) {
        return cb(null, 'false')
      }
      cb(null, 'true')
    }
  }
}

DBus.prototype.amsexport = {
  ReportSysStatus: {
    in: ['s'],
    out: ['b'],
    fn: function ReportSysStatus (status, cb) {
      if (this.runtime.loadAppComplete === false) {
        // waiting for the app load complete
        return cb(null, false)
      }
      try {
        var data = JSON.parse(status)
        if (data.upgrade === true) {
          this.runtime.startApp('@upgrade', {}, {})
        } else if (this.runtime.life.getCurrentAppId() === '@yoda/network') {
          if (data.msg) {
            this.runtime.openUrl(
              `yoda-skill://network/wifi_status?status=${data.msg}&value=${data.data}`, {
                preemptive: false
              })
          }
        }

        if (data['Wifi'] === false || data['Network'] === false) {
          this.runtime.custodian.onNetworkDisconnect()
        } else if (data['Wifi'] === true || data['Network']) {
          this.runtime.custodian.onNetworkConnect()
        }
        cb(null, true)
      } catch (err) {
        logger.error(err && err.stack)
        cb(null, false)
      }
    }
  },
  SetTesting: {
    in: ['s'],
    out: ['b'],
    fn: function SetTesting (testing, cb) {
      logger.log('set testing' + testing)
      cb(null, true)
    }
  },
  SendIntentRequest: {
    in: ['s', 's', 's'],
    out: ['b'],
    fn: function SendIntentRequest (asr, nlp, action, cb) {
      console.log('sendintent', asr, nlp, action)
      this.runtime.onTurenEvent('nlp', {
        asr: asr,
        nlp: nlp,
        action: action
      })
      cb(null, true)
    }
  },
  Reload: {
    in: [],
    out: ['b'],
    fn: function Reload (cb) {
      cb(null, true)
    }
  },
  Ping: {
    in: [],
    out: ['b'],
    fn: function PIng (cb) {
      logger.log('YodaOS is alive')
      cb(null, true)
    }
  },
  ForceUpdateAvailable: {
    in: [],
    out: [],
    fn: function ForceUpdateAvailable (cb) {
      logger.info('force update available, waiting for incoming voice')
      this.runtime.forceUpdateAvailable = true
      cb(null)
    }
  }
}

DBus.prototype.yodadebug = {
  GetLifetime: {
    in: [],
    out: ['s'],
    fn: function (cb) {
      cb(null, JSON.stringify({
        ok: true,
        result: {
          activeAppStack: this.runtime.life.activeAppStack,
          appDataMap: this.runtime.life.appDataMap,
          inactiveAppIds: this.runtime.life.inactiveAppIds,
          carrierId: this.runtime.life.carrierId,
          monopolist: this.runtime.life.monopolist,
          appIdOnPause: this.runtime.life.appIdOnPause,
          cloudAppStack: this.runtime.domain,
          aliveApps: Object.keys(this.runtime.loader.executors).filter(appId => {
            return this.runtime.loader.getAppById(appId) != null
          })
        }
      }))
    }
  },
  mockAsr: {
    in: ['s'],
    out: ['s'],
    fn: function mockAsr (text, cb) {
      this.runtime.mockAsr(text)
        .then(
          res => cb(null, JSON.stringify({ ok: true, nlp: res[0], action: res[1] })),
          err => cb(null, JSON.stringify({ ok: false, message: err.message, stack: err.stack }))
        )
    }
  },
  doProfile: {
    in: ['s', 'n'],
    out: ['s'],
    fn: function DoProfile (storePath, duration, cb) {
      if (!path.isAbsolute(storePath)) {
        cb(null, `store path ${storePath} should be absolute`)
        return
      }
      try {
        var profiler = require('profiler')
        profiler.startProfiling(storePath, duration)
        setTimeout(function () {
          cb(null, `finished, store path ${storePath}`)
        }, duration * 1000)
      } catch (err) {
        cb(err)
      }
    }
  },
  reportMemoryUsage: {
    in: [],
    out: ['s'],
    fn: function ReportMemoryUsage (cb) {
      cb(null, JSON.stringify(process.memoryUsage()))
    }
  },
  takeSnapshot: {
    in: ['s'],
    out: ['s'],
    fn: function ReportSnapshot (storePath, cb) {
      try {
        if (!path.isAbsolute(storePath)) {
          cb(null, `store path ${storePath} should be absolute`)
          return
        }
        var profiler = require('profiler')
        profiler.takeSnapshot(storePath)
        cb(null, `finished, store path ${storePath}`)
      } catch (err) {
        cb(err)
      }
    }
  }
}
