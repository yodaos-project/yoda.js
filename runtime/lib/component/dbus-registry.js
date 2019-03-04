var dbus = require('dbus')
var EventEmitter = require('events')
var util = require('util')
var path = require('path')

var logger = require('logger')('dbus')
var _ = require('@yoda/util')._
var safeParse = require('@yoda/util').json.safeParse
var AudioManager = require('@yoda/audio').AudioManager

var DbusRemoteCall = require('../dbus-remote-call')
var dbusConfig = require('/etc/yoda/dbus-config.json')

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

  ;['extapp', 'prop', 'amsexport', 'yodadebug'].forEach(namespace => {
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

  var multimediaEvents = {
    'multimediadevent': function onMultimediaEvent (msg) {
      var channel = `callback:multimedia:${_.get(msg, 'args.0')}`
      logger.info(`VuiDaemon received multimediad event on channel(${channel}) msg(${JSON.stringify(msg)})`)
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
      if (!this.component.custodian.isPrepared()) {
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
      this.component.lifetime.createApp(appId)
        .then(() => {
          logger.info(`activating dbus app '${appId}'`)
          this.runtime.updateCloudStack(appId, 'cut')
          return this.component.lifetime.activateAppById(appId, form)
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
      if (appId !== this.component.lifetime.getCurrentAppId()) {
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
      if (this.component.appLoader.getAppManifest(appId) == null) {
        return cb(null, '-1')
      }
      var permit = this.component.permission.check(appId, 'ACCESS_TTS')
      if (!permit) {
        return cb(null, '-1')
      }
      this.runtime.ttsMethod('speak', [appId, text])
        .then((res) => {
          var ttsId = res.msg[0]
          cb(null, ttsId)
        })
    }
  },
  media: {
    in: ['s'],
    out: ['s'],
    fn: function media (appId, url, cb) {
      if (this.component.appLoader.getAppManifest(appId) == null) {
        return cb(null, '-1')
      }
      var permit = this.component.permission.check(appId, 'ACCESS_MULTIMEDIA')
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
          var app = this.component.appScheduler.getAppById(appId)
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
      var credential = this.runtime.getCopyOfCredential()
      cb(null, JSON.stringify(credential))
    }
  }
}

DBus.prototype.amsexport = {
  ReportSysStatus: {
    in: ['s'],
    out: ['b'],
    fn: function ReportSysStatus (status, cb) {
      if (this.runtime.hasBeenDisabled()) {
        logger.debug(`system disabled ${this.runtime.getDisabledReasons()}, ignoring sys status report`)
        return cb(null, false)
      }
      try {
        var data = JSON.parse(status)
        cb(null, true)

        if (this.component.custodian.isConfiguringNetwork()) {
          logger.info('recevice message with data', data)
          var filter = [
            'CTRL-EVENT-SCAN-STARTED',
            'CTRL-EVENT-SCAN-RESULTS',
            'CTRL-EVENT-SUBNET-STATUS-UPDATE'
          ]
          if (data.msg && filter.indexOf(data.msg) === -1) {
            this.runtime.openUrl(
              `yoda-skill://network/wifi_status?status=${data.msg}&value=${data.data}`, {
                preemptive: false
              })
          }
        }
        if (data['Network'] === true) {
          this.component.custodian.onNetworkConnect()
        } else if (data['Network'] === false || data['Wifi'] === false) {
          this.component.custodian.onNetworkDisconnect()
        }
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
      this.component.turen.handleEvent('nlp', {
        asr: asr,
        nlp: nlp,
        action: action
      })
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
      this.component.ota.forceUpdateAvailable = true
      cb(null)
    }
  },
  Relogin: {
    in: [],
    out: [],
    fn: function Relogin (cb) {
      this.component.custodian.onLogout()
      this.runtime.reconnect()
        .then(
          () => {
            cb()
          },
          err => {
            logger.error('unexpected error on re-login', err.stack)
            cb()
          }
        )
    }
  },
  Hibernate: {
    in: [],
    out: ['s'],
    fn: function Hibernate (cb) {
      // TODO: `Hibernate` is a published API. Should be updated on next major version.
      this.runtime.idle()
        .then(
          () => cb(null, '{"ok": true}'),
          err => {
            logger.error('unexpected error on deactivating apps in stack', err.stack)
            cb(null, JSON.stringify({ ok: false, error: err.message }))
          }
        )
    }
  },
  GetVolume: {
    in: [],
    out: ['s'],
    fn: function GetVolume (cb) {
      cb(null, JSON.stringify({ ok: true, result: AudioManager.getVolume() }))
    }
  },
  SetVolume: {
    in: ['d'],
    out: ['s'],
    fn: function SetVolume (val, cb) {
      this.runtime.openUrl(`yoda-skill://volume/set_volume?value=${val}`, { preemptive: false })
        .then(
          () => cb(null, JSON.stringify({ ok: true, result: AudioManager.getVolume() })),
          err => {
            logger.error('unexpected error on set volume', err.stack)
            cb(null, JSON.stringify({ ok: false, error: err.message }))
          }
        )
    }
  },
  IncreaseVolume: {
    in: [],
    out: ['s'],
    fn: function IncreaseVolume (cb) {
      this.runtime.openUrl('yoda-skill://volume/volume_up', { preemptive: false })
        .then(
          () => cb(null, JSON.stringify({ ok: true, result: AudioManager.getVolume() })),
          err => {
            logger.error('unexpected error on increase volume', err.stack)
            cb(null, JSON.stringify({ ok: false, error: err.message }))
          }
        )
    }
  },
  DecreaseVolume: {
    in: [],
    out: ['s'],
    fn: function DecreaseVolume (cb) {
      this.runtime.openUrl('yoda-skill://volume/volume_down', { preemptive: false })
        .then(
          () => cb(null, JSON.stringify({ ok: true, result: AudioManager.getVolume() })),
          err => {
            logger.error('unexpected error on decrease volume', err.stack)
            cb(null, JSON.stringify({ ok: false, error: err.message }))
          }
        )
    }
  },
  GetSpeakerMuted: {
    in: [],
    out: ['s'],
    fn: function GetSpeakerMuted (cb) {
      cb(null, JSON.stringify({
        ok: true,
        result: AudioManager.isMuted() || AudioManager.getVolume() === 0
      }))
    }
  },
  SetSpeakerMute: {
    in: ['b'],
    out: ['s'],
    fn: function SetSpeakerMute (mute, cb) {
      var url = mute ? 'yoda-skill://volume/mute' : 'yoda-skill://volume/unmute'
      this.runtime.openUrl(url, { preemptive: false })
        .then(
          () => cb(null, '{"ok": true}'),
          err => {
            logger.error('unexpected error on decrease volume', err.stack)
            cb(null, JSON.stringify({ ok: false, error: err.message }))
          }
        )
    }
  },
  GetMicrophoneMuted: {
    in: [],
    out: ['s'],
    fn: function GetMicrophoneMuted (cb) {
      cb(null, JSON.stringify({
        ok: true,
        result: this.component.turen.muted
      }))
    }
  },
  SetMicrophoneMute: {
    in: ['b'],
    out: ['s'],
    fn: function SetMicrophoneMute (mute, cb) {
      this.runtime.setMicMute(mute)
        .then(
          () => cb(null, '{"ok": true}'),
          err => {
            logger.error('unexpected error on set speaker mute', err.stack)
            cb(null, JSON.stringify({ ok: false, error: err.message }))
          }
        )
    }
  },
  TextNLP: {
    in: ['s'],
    out: ['s'],
    fn: function TextNLP (text, cb) {
      this.component.flora.getNlpResult(text)
        .then(res => {
          var nlp = res[0]
          var action = res[1]
          return this.runtime.handleNlpIntent(text, nlp, action)
            .then(() => cb(null, JSON.stringify({ ok: true, result: { nlp: nlp, action: action } })))
        })
        .catch(err => {
          logger.error('unexpected error on text command', err.stack)
          cb(null, JSON.stringify({ ok: false, error: err.message }))
        })
    }
  },
  NLPIntent: {
    in: ['s'],
    out: ['s'],
    fn: function NLPIntent (json, cb) {
      var input = safeParse(json)
      var text = input.text
      var nlp = input.nlp
      var action = input.action
      if (text == null || nlp == null || action == null) {
        return cb(null, JSON.stringify({ ok: false, message: 'Invalid Argument' }))
      }
      this.runtime.handleNlpIntent(text, nlp, action)
        .then(
          () => cb(null, JSON.stringify({ ok: true, result: { nlp: nlp, action: action } })),
          err => {
            logger.error('unexpected error on voice command', err.stack)
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
          logger.info('unexpected error on opening url', url, optionsJson, err.stack)
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
        future = this.component.appScheduler.suspendApp(appId, { force: true })
      }
      future
        .then(() => this.component.appScheduler.createApp(appId, mode))
        .then(() => {
          cb(null, JSON.stringify({ ok: true, result: { appId: appId, mode: mode } }))
        })
        .catch(err => {
          logger.info('unexpected error on launch app', appId, 'mode', mode, err.stack)
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
          logger.info('unexpected error on launch app', appId, err.stack)
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
        future = this.component.lifetime.destroyAppById(appId, { force: true })
          .then(() => this.component.appLoader.reload(appId))
          .then(() => {
            cb(null, JSON.stringify({ ok: true, result: this.component.appLoader.appManifests[appId] }))
          })
      } else {
        future = this.component.lifetime.destroyAll({ force: true })
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
  GetLifetime: {
    in: [],
    out: ['s'],
    fn: function (cb) {
      cb(null, JSON.stringify({
        ok: true,
        result: {
          activeSlots: this.component.lifetime.activeSlots,
          contextOptionsMap: this.component.lifetime.contextOptionsMap,
          backgroundAppIds: this.component.lifetime.backgroundAppIds,
          carrierId: this.component.lifetime.carrierId,
          monopolist: this.component.lifetime.monopolist,
          appIdOnPause: this.component.lifetime.appIdOnPause,
          cloudAppStack: this.runtime.domain,
          appStatus: this.component.appScheduler.appStatus,
          appRuntimeInfo: this.component.appScheduler.appRuntimeInfo
        }
      }))
    }
  },
  GetTurenState: {
    in: [],
    out: ['s'],
    fn: function (cb) {
      var ret = { ok: true, result: {} }
      var keys = [
        'muted',
        'awaken',
        'asrState',
        'pickingUp',
        'pickingUpDiscardNext'
      ]
      keys.forEach(key => {
        ret.result[key] = this.component.turen[key]
        if (ret.result[key] === undefined) {
          ret.result[key] = null
        }
      })
      cb(null, JSON.stringify(ret))
    }
  },
  GetLoader: {
    in: [],
    out: ['s'],
    fn: function (cb) {
      cb(null, JSON.stringify({
        ok: true,
        result: {
          skillIdAppIdMap: this.component.appLoader.skillIdAppIdMap,
          skillAttrsMap: this.component.appLoader.skillAttrsMap,
          hostSkillIdMap: this.component.appLoader.hostSkillIdMap,
          appManifests: this.component.appLoader.appManifests,
          notifications: this.component.appLoader.notifications
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
  mockAsr: {
    in: ['s'],
    out: ['s'],
    fn: function mockAsr (asr, cb) {
      if (typeof asr === 'function') {
        cb = asr
        asr = ''
      }
      var floraEmit = (channel, args, ms) => {
        setTimeout(() => {
          this.component.flora.post(channel, args)
        }, ms)
      }
      if (!asr) {
        floraEmit('rokid.turen.voice_coming', [], 0)
        floraEmit('rokid.turen.local_awake', [0], 100)
        floraEmit('rokid.speech.inter_asr', ['若琪'], 200)
        floraEmit('rokid.speech.extra', ['{"activation": "fake"}'], 600)
        return cb(null, JSON.stringify({ ok: true, result: null }))
      }
      this.component.flora.getNlpResult(asr)
        .then(
          res => {
            var nlp = res[0]
            var action = res[1]
            floraEmit('rokid.turen.voice_coming', [], 0)
            floraEmit('rokid.turen.local_awake', [0], 100)
            floraEmit('rokid.speech.inter_asr', ['若琪'], 200)
            floraEmit('rokid.speech.final_asr', [asr], 250)
            cb(null, JSON.stringify({ ok: true, result: { nlp: nlp, action: action } }))
            floraEmit('rokid.speech.nlp', [JSON.stringify(nlp), JSON.stringify(action)], 600)
          },
          err => {
            logger.error('Unexpected error on get nlp for asr', asr, err.stack)
            cb(null, JSON.stringify({ ok: false, message: err.message }))
          }
        )
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
  }
}
