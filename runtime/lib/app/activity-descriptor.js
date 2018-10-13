'use strict'

/**
 * @namespace yodaRT.activity
 */

var logger = require('logger')('activity')
var inherits = require('util').inherits
var _ = require('@yoda/util')._
var yodaPath = require('@yoda/util').path
var EventEmitter = require('events').EventEmitter

var MEDIA_SOURCE = '/opt/media'
var LIGHT_SOURCE = '/opt/light'

module.exports.ActivityDescriptor = ActivityDescriptor
module.exports.LightDescriptor = LightDescriptor
module.exports.MultimediaDescriptor = MultimediaDescriptor
module.exports.TtsDescriptor = TtsDescriptor
module.exports.KeyboardDescriptor = KeyboardDescriptor
module.exports.WormholeDescriptor = WormholeDescriptor
module.exports.TurenDescriptor = TurenDescriptor

/**
 * @memberof yodaRT.activity
 * @classdesc The `Activity` is the APIs for apps developer.
 * ```js
 * module.exports = function(activity) {
 *   activity.on('ready', () => {
 *     console.log('activity is ready')
 *   })
 *   activity.on('create', () => {
 *     console.log('app is created')
 *   })
 *   activity.on('destroy', () => {
 *     console.log('app is destroyed')
 *   })
 *   activity.on('resume', () => {
 *     console.log('app is resumed')
 *   })
 *   activity.on('request', (nlp) => {
 *     // handle nlp
 *   })
 * }
 * ```
 * @class Activity
 * @hideconstructor
 * @extends EventEmitter
 */
function ActivityDescriptor (appId, appHome, runtime) {
  EventEmitter.call(this)
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime

  this._registeredDbusSignals = []

  /**
   * The `LightClient` is used to control LED APIs.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.LightClient} light
   */
  this.light = new LightDescriptor(this, appId, appHome, runtime)

  /**
   * The `MediaClient` is used to control multimedia APIs.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.MediaClient} media
   */
  this.media = new MultimediaDescriptor(this, appId, appHome, runtime)

  /**
   * The `TtsClient` is used to control TextToSpeech APIs.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.TtsClient} tts
   */
  this.tts = new TtsDescriptor(this, appId, appHome, runtime)

  /**
   * The `KeyboardClient` is used to control behaviors of key code events.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.KeyboardClient} keyboard
   */
  this.keyboard = new KeyboardDescriptor(this, appId, appHome, runtime)

  /**
   * The `WormholeClient` is used to send or receive mqtt message to/from Rokid.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.WormholeClient} wormhole
   */
  this.wormhole = new WormholeDescriptor(this, appId, appHome, runtime)

  /**
   * The `TurenClient` is used to communication with turen
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.TurenClient} turen
   */
  this.turen = new TurenDescriptor(this, appId, appHome, runtime)

  /**
   * Get current `appId`.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {string} appId - appId of current app.
   */
  this.appId = {
    type: 'value',
    value: this._appId
  }
  /**
   * Get home directory of current app.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {string} appHome - home directory of current app.
   */
  this.appHome = {
    type: 'value',
    value: this._appHome
  }
}
inherits(ActivityDescriptor, EventEmitter)
ActivityDescriptor.prototype.toJSON = function toJSON () {
  var publicKeys = Object.keys(this).filter(it => it[0] !== '_')
  return Object.assign(
    _.pick.apply(null, [ this ].concat(publicKeys)),
    ActivityDescriptor.prototype
  )
}
ActivityDescriptor.prototype.toString = function toString () {
  return `ActivityDescriptor(appId=>${this._appId}, appHome=>${this._appHome})`
}
ActivityDescriptor.prototype.destruct = function destruct () {
  this._registeredDbusSignals.forEach(it => {
    this._runtime.dbusRegistry.removeAllListeners(it)
  })
  this.emit('destruct')
}

Object.assign(ActivityDescriptor.prototype,
  {
    /**
     * When the app is ready.
     * @event yodaRT.activity.Activity#ready
     */
    ready: {
      type: 'event'
    },
    /**
     * When an activity is created.
     * @event yodaRT.activity.Activity#create
     */
    create: {
      type: 'event'
    },
    /**
     * When an activity is about been paused.
     * @event yodaRT.activity.Activity#pause
     */
    pause: {
      type: 'event'
    },
    /**
     * When an activity is resumed.
     * @event yodaRT.activity.Activity#resume
     */
    resume: {
      type: 'event'
    },
    /**
     * When an activity is about been destroyed.
     * @event yodaRT.activity.Activity#destroy
     */
    destroy: {
      type: 'event'
    },
    /**
     * Handle your nlp request in this lifecycle.
     * @event yodaRT.activity.Activity#request
     * @param {object} data
     * @param {string} data.intent - your nlp intent.
     * @param {object} data.slots  - your nlp slots.
     * @param {string} data.asr    - the asr text.
     * @param {object} action      - the cloud postprocessed data.
     */
    request: {
      type: 'event'
    },
    /**
     * Handle url requests.
     *
     * > URL offer a potential attack vector into your app, so make
     * > sure to validate all URL parameters and discard any malformed
     * > URLs. In addition, limit the available actions to those that
     * > do not risk the user’s data. For example, do not allow other
     * > apps to directly delete content or access sensitive information
     * > about the user. When testing your URL-handling code, make sure
     * > your test cases include improperly formatted URLs.
     *
     * @event yodaRT.activity.Activity#url
     * @param {module:url~UrlWithParsedQuery} url
     */
    url: {
      type: 'event'
    }
  },
  {
    /**
     * Get all properties, it contains the following fields:
     * - `deviceId` the device id.
     * - `deviceTypeId` the device type id.
     * - `key` the cloud key.
     * - `secret` the cloud secret.
     * - `masterId` the userId or masterId.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function get
     * @returns {Promise<object>}
     * @example
     * module.exports = function (activity) {
     *   activity.on('ready', () => {
     *     activity.get().then((props) => console.log(props))
     *   })
     * }
     */
    get: {
      type: 'method',
      returns: 'promise',
      fn: function get () {
        // TODO(Yorkie): check permission.
        return Promise.resolve(this._runtime.onGetPropAll())
      }
    },
    /**
     * Exits the current application.
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function exit
     * @param {object} [options] -
     * @param {boolean} [options.clearContext] - also clears contexts
     * @returns {Promise<void>}
     */
    exit: {
      type: 'method',
      returns: 'promise',
      fn: function exit (options) {
        return this._runtime.exitAppById(this._appId, options)
      }
    },
    /**
     * Exits the current application and clean up others.
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function destroyAll
     * @returns {Promise<void>}
     */
    destroyAll: {
      type: 'method',
      returns: 'promise',
      fn: function destroyAll () {
        return this._runtime.destroyAll({ force: false })
      }
    },
    /**
     * Open the mics for continuely listenning for your users
     * without activation.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function setPickup
     * @param {boolean} pickup
     * @param {number} [duration=6000]
     * @returns {Promise<void>}
     */
    setPickup: {
      type: 'method',
      returns: 'promise',
      fn: function setPickup (pickup, duration) {
        this._runtime.setPickup(pickup, duration)
        return Promise.resolve()
      }
    },
    /**
     * Set the app is confirmed.
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function setConfirm
     * @param {string} intent
     * @param {string} slot
     * @param {object} [options]
     * @param {object} [attrs]
     * @return {Promise<void>}
     */
    setConfirm: {
      type: 'method',
      returns: 'promise',
      fn: function setConfirm (intent, slot, options, attrs) {
        if (intent === undefined || intent === '') {
          return Promise.reject(new Error('intent required'))
        }
        if (slot === undefined) {
          return Promise.reject(new Error('slot required'))
        }
        return this._runtime.setConfirm(this._appId, intent, slot, options || '[]', attrs || '')
          .then(() => { /** stop pass through results */ })
      }
    },
    /**
     * Set your application in background mode, in this mode, the application still could keep alive,
     * and listen other events, but no ablitity to control TTS, light and multimedia.
     *
     * To use this API, you must specify the permission `INTERRUPT` in your application manifest.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function setBackground
     * @return {Promise<void>}
     */
    setBackground: {
      type: 'method',
      returns: 'promise',
      fn: function setBackground () {
        if (!this._runtime.permission.check(this._appId, 'INTERRUPT', { acquiresActive: false })) {
          return Promise.reject(new Error('Permission denied.'))
        }
        return this._runtime.life.setBackgroundById(this._appId).then(() => {})
      }
    },
    /**
     * Push the app in foreground, the reverse slide to `setBackground()`, it requires the `INTERRUPT`
     * permission, either.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function setForeground
     * @param {'cut' | 'scene' | object} [options]
     * @param {'cut' | 'scene'} [options.form] - the running form of the activity, available value are: cut
     *                          or scene.
     * @param {string} [options.skillId] - update cloud skill stack if specified.
     * @return {Promise<void>}
     */
    setForeground: {
      type: 'method',
      returns: 'promise',
      fn: function setForeground (options) {
        if (!this._runtime.permission.check(this._appId, 'INTERRUPT', { acquiresActive: false })) {
          return Promise.reject(new Error('Permission denied.'))
        }
        var form
        if (typeof options === 'string') {
          form = options
          options = null
        } else {
          form = _.get(options, 'form')
        }
        if (form != null && (form !== 'cut' && form !== 'scene')) {
          return Promise.reject(new TypeError(`Expect 'cut' or 'scene' on first argument of setForeground.`))
        }
        return this._runtime.setForegroundById(this._appId, Object.assign({ form: form }, options)).then(() => {})
      }
    },
    /**
     * sync cloudappclient appid stack
     * @memberof yodaRT.activity.Activity
     * @instance
     * @private
     * @function syncCloudAppIdStack
     * @param {string[]} stack cloud skills id
     * @returns {Promise<void>}
     */
    syncCloudAppIdStack: {
      type: 'method',
      returns: 'promise',
      fn: function syncCloudAppIdStack (stack) {
        return this._runtime.syncCloudAppIdStack(stack || [])
      }
    },
    /**
     * Play the sound effect, support the following schemas: `system://` and `self://`.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function playSound
     * @param {string} uri - the sound resource uri.
     * @returns {Promise<void>}
     */
    playSound: {
      type: 'method',
      returns: 'promise',
      fn: function playSound (uri) {
        var absPath = yodaPath.transformPathScheme(uri, MEDIA_SOURCE, this._appHome + '/media')
        return this._runtime.light.appSound(this._appId, absPath)
      }
    },
    /**
     * Send a voice command to the main process. It requires the permission `ACCESS_VOICE_COMMAND`.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function voiceCommand
     * @param {string} text - voice asr/text command to be parsed and executed.
     * @returns {Promise<void>}
     */
    voiceCommand: {
      type: 'method',
      returns: 'promise',
      fn: function voiceCommand (text) {
        var self = this
        if (!self._runtime.permission.check(self._appId, 'ACCESS_VOICE_COMMAND')) {
          return Promise.reject(new Error('Permission denied.'))
        }
        return Promise.resolve()
          .then(() => {
            self._runtime.flora.getNlpResult(text, function (err, nlp, action) {
              if (err) { throw err }
              logger.info('get nlp result for asr', text, nlp, action)
              /**
               * retreat self-app into background, then promote the upcoming app
               * to prevent self being destroy in stack preemption.
               */
              return self._runtime.life.setBackgroundById(self._appId)
                .then(() => {
                  return self._runtime.onVoiceCommand(text, nlp, action, {
                    carrierId: self._appId
                  })
                })
            })
          })
      }
    },
    /**
     * Start a session of monologue. In session of monologue, no other apps could preempt top of stack.
     *
     * It requires the permission `ACCESS_MONOPOLIZATION`.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function startMonologue
     * @returns {Promise<void>}
     */
    startMonologue: {
      type: 'method',
      returns: 'promise',
      fn: function startMonologue () {
        if (!this._runtime.permission.check(this._appId, 'ACCESS_MONOPOLIZATION')) {
          return Promise.reject(new Error('Permission denied.'))
        }
        return this._runtime.startMonologue(this._appId)
      }
    },
    /**
     * Stop a session of monologue started previously.
     *
     * It requires the permission `ACCESS_MONOPOLIZATION`.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function stopMonologue
     * @returns {Promise<void>}
     */
    stopMonologue: {
      type: 'method',
      returns: 'promise',
      fn: function stopMonologue () {
        if (!this._runtime.permission.check(this._appId, 'ACCESS_MONOPOLIZATION')) {
          return Promise.reject(new Error('Permission denied.'))
        }
        return this._runtime.stopMonologue(this._appId)
      }
    },
    /**
     * Use this method to open the specified resource. If the specified URL could
     * be handled by another app, YodaOS launches that app and passes the URL to it.
     * (Launching the app brings the other app to the foreground.) If no app is
     * capable of handling the specified scheme, the returning promise is resolved
     * with false.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function openUrl
     * @param {string} url -
     * @param {'cut' | 'scene' | object} [options]
     * @param {boolean} [options.preemptive=true] -
     * @returns {Promise<boolean>}
     */
    openUrl: {
      type: 'method',
      returns: 'promise',
      fn: function openUrl (url, options) {
        if (typeof options === 'string') {
          options = { form: options }
        }
        return this._runtime.openUrl(url, options)
      }
    },
    /**
     * Mute microphone if `mute` is true, or unmute microphone if `mute` is false.
     * Switch microphone mute state if `mute` is not set.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function setMicMute
     * @param {boolean} [mute] - set mic to mute, switch mute if not given.
     * @returns {Promise<boolean>} Promise of mic muted
     */
    setMicMute: {
      type: 'method',
      returns: 'promise',
      fn: function setMicMute (mute) {
        return this._runtime.setMicMute(mute)
      }
    },
    /**
     * Get microphone is muted.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function getMicMute
     * @returns {Promise<boolean>} Promise of mic muted
     */
    getMicMute: {
      type: 'method',
      returns: 'promise',
      fn: function getMicMute () {
        return Promise.resolve(this._runtime.turen.muted)
      }
    }
  }
)

/**
 * @memberof yodaRT.activity.Activity
 * @class LightClient
 * @hideconstructor
 * @extends EventEmitter
 */
function LightDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(LightDescriptor, EventEmitter)
LightDescriptor.prototype.toJSON = function toJSON () {
  return LightDescriptor.prototype
}

Object.assign(LightDescriptor.prototype,
  {
    type: 'namespace'
  },
  {

    /**
     * play the given light effect
     * @memberof yodaRT.activity.Activity.LightClient
     * @instance
     * @function play
     * @param {string} uri - the light resource uri.
     * @param {object} args - the args.
     * @param {number} [args.zIndex] number of layers to play. default minimum layer
     * @param {object} [options]
     * @param {boolean} [options.shouldResume]
     * @returns {Promise<void>}
     */
    play: {
      type: 'method',
      returns: 'promise',
      fn: function play (uri, args, options) {
        var absPath = yodaPath.transformPathScheme(uri, LIGHT_SOURCE, this._appHome + '/light')
        logger.log('playing light effect', absPath)
        return this._runtime.light.play(this._appId, absPath, args || {}, options || {})
          .then((res) => {
            if (res && res[0] === true) {
              return
            }
            throw new Error('unknown light error')
          })
      }
    },
    /**
     * stop the given light effect and clear from the recovery queue
     * @memberof yodaRT.activity.Activity.LightClient
     * @instance
     * @function stop
     * @param {string} uri - the light resource uri.
     * @returns {Promise<void>}
     */
    stop: {
      type: 'method',
      returns: 'promise',
      fn: function stop (uri) {
        if (uri && typeof uri === 'string') {
          var absPath = yodaPath.transformPathScheme(uri, LIGHT_SOURCE, this._appHome + '/light')
          return this._runtime.light.stop(this._appId, absPath)
            .then((res) => {
              if (res && res[0] === true) {
                return
              }
              throw new Error('stop light failed')
            })
        } else {
          return Promise.reject(new Error('the args of uri must be a string'))
        }
      }
    }
  }
)

/**
 * @memberof yodaRT.activity.Activity
 * @class MediaClient
 * @hideconstructor
 * @extends EventEmitter
 */
function MultimediaDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(MultimediaDescriptor, EventEmitter)
MultimediaDescriptor.prototype.toJSON = function toJSON () {
  return MultimediaDescriptor.prototype
}
MultimediaDescriptor.prototype._listenMediaEvent = function _listenMediaEvent (multimediaId, onEvent) {
  var self = this
  var channel = `callback:multimedia:${multimediaId}`
  var terminationEvents = ['playbackcomplete', 'cancel', 'error']
  self._activityDescriptor._registeredDbusSignals.push(channel)
  self._runtime.dbusRegistry.on(channel, function onDbusSignal (event) {
    if (terminationEvents.indexOf(event) >= 0) {
      /** stop listening upcoming events for channel */
      // FIXME(Yorkie): `removeListener()` fails on check function causes a memory leak
      self._runtime.dbusRegistry.removeAllListeners(channel)
      var idx = self._activityDescriptor._registeredDbusSignals.indexOf(channel)
      self._activityDescriptor._registeredDbusSignals.splice(idx, 1)
    }

    onEvent.apply(self, arguments)
  })
}

Object.assign(MultimediaDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * When the media resource is prepared.
     * @event yodaRT.activity.Activity.MediaClient#prepared
     * @param {string} id - multimedia player id
     * @param {string} duration -
     * @param {string} position -
     */
    prepared: {
      type: 'event'
    },
    /**
     * When the media playback is complete.
     * @event yodaRT.activity.Activity.MediaClient#playbackcomplete
     * @param {string} id - multimedia player id
     */
    playbackcomplete: {
      type: 'event'
    },
    /**
     * When the media playback is canceled.
     * @event yodaRT.activity.Activity.MediaClient#cancel
     * @param {string} id - multimedia player id
     */
    cancel: {
      type: 'event'
    },
    /**
     * When buffering progress is updates.
     * @event yodaRT.activity.Activity.MediaClient#bufferingupdate
     * @param {string} id - multimedia player id
     */
    bufferingupdate: {
      type: 'event'
    },
    /**
     * When the `seek()` operation is complete.
     * @event yodaRT.activity.Activity.MediaClient#seekcomplete
     * @param {string} id - multimedia player id
     */
    seekcomplete: {
      type: 'event'
    },
    /**
     * Something went wrong
     * @event yodaRT.activity.Activity.MediaClient#error
     * @param {string} id - multimedia player id
     * @type {Error}
     */
    error: {
      type: 'event'
    }
  },
  {
    /**
     * Prepare a multimedia player for url, yet doesn't play it.
     * Doesn't requires app to be the active app.
     *
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function start
     * @param {string} uri
     * @param {object} [options]
     * @param {'alarm' | 'playback'} [options.streamType='playback']
     * @returns {Promise<string>} multimedia player id
     */
    prepare: {
      type: 'method',
      returns: 'promise',
      fn: function prepare (url, options) {
        var self = this
        var streamType = _.get(options, 'streamType', 'playback')

        if (!self._runtime.permission.check(self._appId, 'ACCESS_MULTIMEDIA', {
          acquiresActive: false
        })) {
          return Promise.reject(new Error('Permission denied.'))
        }

        if (typeof streamType !== 'string') {
          return Promise.reject(new Error('Expect string on options.streamType.'))
        }

        url = yodaPath.transformPathScheme(url, MEDIA_SOURCE, self._appHome + '/media', {
          allowedScheme: [ 'http', 'https', 'file', 'icecast', 'rtp', 'tcp', 'udp' ]
        })
        logger.log('preparing multimedia', url)
        return self._runtime.multimediaMethod('prepare', [self._appId, url, streamType])
          .then((result) => {
            var multimediaId = _.get(result, '0', '-1')
            logger.log('create media player', result)

            if (multimediaId === '-1') {
              throw new Error('Unexpected multimediad error.')
            }

            self._listenMediaEvent(multimediaId, function (event) {
              EventEmitter.prototype.emit.apply(self,
                [event, multimediaId].concat(Array.prototype.slice.call(arguments, 1)))
            })

            return multimediaId
          })
      }
    },
    /**
     * Start playing your url.
     * Requires app to be the active app.
     *
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function start
     * @param {string} uri
     * @param {object} [options]
     * @param {boolean} [options.impatient=true]
     * @param {'alarm' | 'playback'} [options.streamType='playback']
     * @returns {Promise<string>} multimedia player id
     */
    start: {
      type: 'method',
      returns: 'promise',
      fn: function start (url, options) {
        var self = this
        var impatient = _.get(options, 'impatient', true)
        var streamType = _.get(options, 'streamType', 'playback')

        if (!self._runtime.permission.check(self._appId, 'ACCESS_MULTIMEDIA')) {
          return Promise.reject(new Error('Permission denied.'))
        }

        if (typeof streamType !== 'string') {
          return Promise.reject(new Error('Expect string on options.streamType.'))
        }

        url = yodaPath.transformPathScheme(url, MEDIA_SOURCE, self._appHome + '/media', {
          allowedScheme: [ 'http', 'https', 'file', 'icecast', 'rtp', 'tcp', 'udp' ]
        })
        logger.log('playing multimedia', url)
        return self._runtime.multimediaMethod('start', [self._appId, url, streamType])
          .then((result) => {
            var multimediaId = _.get(result, '0', '-1')
            logger.log('create media player', result)

            if (multimediaId === '-1') {
              throw new Error('Unexpected multimediad error.')
            }

            return new Promise((resolve, reject) => {
              if (impatient) {
                resolve(multimediaId)
              }
              self._listenMediaEvent(multimediaId, function (event) {
                if (impatient || event !== 'error') {
                  EventEmitter.prototype.emit.apply(self,
                    [event, multimediaId].concat(Array.prototype.slice.call(arguments, 1)))
                }

                if (impatient) {
                  return
                }

                if (event === 'playbackcomplete') {
                  return resolve()
                }
                if (event === 'cancel') {
                  return reject(new Error('Media has been canceled'))
                }
                if (event === 'error') {
                  return reject(new Error('Unexpected ttsd error'))
                }
              })
            })
          })
      }
    },
    /**
     * Pause the playing.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function pause
     * @returns {Promise<void>}
     */
    pause: {
      type: 'method',
      returns: 'promise',
      fn: function pause () {
        return this._runtime.multimediaMethod('pause', [this._appId])
      }
    },
    /**
     * Resume the playing.
     * Requires app to be the active app.
     *
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function resume
     * @returns {Promise<void>}
     */
    resume: {
      type: 'method',
      returns: 'promise',
      fn: function resume () {
        if (!this._runtime.permission.check(this._appId, 'ACCESS_MULTIMEDIA')) {
          return Promise.reject(new Error('Permission denied.'))
        }
        return this._runtime.multimediaMethod('resume', [this._appId])
      }
    },
    /**
     * Stop the playing.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function stop
     * @returns {Promise<void>}
     */
    stop: {
      type: 'method',
      returns: 'promise',
      fn: function stop () {
        return this._runtime.multimediaMethod('stop', [this._appId])
      }
    },
    /**
     * get position.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function getPosition
     * @returns {Promise<number>}
     */
    getPosition: {
      type: 'method',
      returns: 'promise',
      fn: function getPosition () {
        return this._runtime.multimediaMethod('getPosition', [this._appId])
          .then((res) => {
            if (res && res[0] >= -1) {
              return res[0]
            }
            throw new Error('player instance not found')
          })
      }
    },
    /**
     * return whether to loop
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function getLoopMode
     * @returns {Promise<number>}
     */
    getLoopMode: {
      type: 'method',
      returns: 'promise',
      fn: function getLoopMode () {
        return this._runtime.multimediaMethod('getLoopMode', [this._appId])
          .then((res) => {
            if (res && res[0] !== undefined) {
              return res[0]
            }
            throw new Error('multimediad error')
          })
      }
    },
    /**
     * set loop playback if you pass true.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function setLoopMode
     * @param {boolean} loop
     * @returns {Promise<boolean>}
     */
    setLoopMode: {
      type: 'method',
      returns: 'promise',
      fn: function setLoopMode (loop) {
        loop = loop === true ? 'true' : 'false'
        return this._runtime.multimediaMethod('setLoopMode', [this._appId, loop])
          .then((res) => {
            if (res && res[0] !== undefined) {
              return res[0]
            }
            throw new Error('multimediad error')
          })
      }
    },
    /**
     * Seek the given position.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function seek
     * @param {number} pos
     * @returns {Promise<void>}
     */
    seek: {
      type: 'method',
      returns: 'promise',
      fn: function seek (pos) {
        return this._runtime.multimediaMethod('seek', [this._appId, String(pos)])
          .then((res) => {
            if (res && res[0] === true) {
              return
            }
            throw new Error('player instance not found')
          })
      }
    }
  }
)

/**
 * @memberof yodaRT.activity.Activity
 * @class TtsClient
 * @hideconstructor
 * @extends EventEmitter
 */
function TtsDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(TtsDescriptor, EventEmitter)
TtsDescriptor.prototype.toJSON = function toJSON () {
  return TtsDescriptor.prototype
}

Object.assign(TtsDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * The TTS job is started.
     * @event yodaRT.activity.Activity.TtsClient#start
     * @param {string} id - tts player id
     */
    start: {
      type: 'event'
    },
    /**
     * The TTS job is cancelled.
     * @event yodaRT.activity.Activity.TtsClient#cancel
     * @param {string} id - tts player id
     */
    cancel: {
      type: 'event'
    },
    /**
     * The TTS job is ended.
     * @event yodaRT.activity.Activity.TtsClient#end
     * @param {string} id - tts player id
     */
    end: {
      type: 'event'
    },
    /**
     * The TTS job went wrong.
     * @event yodaRT.activity.Activity.TtsClient#error
     * @param {string} id - tts player id
     */
    error: {
      type: 'event'
    }
  },
  {
    /**
     * Speak the given text.
     * @memberof yodaRT.activity.Activity.TtsClient
     * @instance
     * @function speak
     * @param {string} text
     * @param {object} [options]
     * @param {boolean} [options.impatient=false] wait for end of tts speech, set false to resolve once tts are scheduled
     * @returns {Promise<void>} Resolved on end of speech
     */
    speak: {
      type: 'method',
      returns: 'promise',
      fn: function speak (text, options) {
        var self = this
        var impatient = _.get(options, 'impatient', false)

        if (!self._runtime.permission.check(self._appId, 'ACCESS_TTS')) {
          return Promise.reject(new Error('Permission denied.'))
        }

        return self._runtime.ttsMethod('speak', [self._appId, text])
          .then((args) => {
            var ttsId = _.get(args, '0', '-1')
            logger.log(`tts register ${ttsId}`)

            if (ttsId === '-1') {
              return Promise.reject(new Error('Unexpected ttsd error.'))
            }
            return new Promise((resolve, reject) => {
              var channel = `callback:tts:${ttsId}`
              var terminationEvents = ['cancel', 'end', 'error']
              self._activityDescriptor._registeredDbusSignals.push(channel)

              self._runtime.dbusRegistry.on(channel, function onDbusSignal (event) {
                logger.info('tts signals', channel, event)

                if (terminationEvents.indexOf(event) >= 0) {
                  /** stop listening upcoming events for channel */
                  // FIXME(Yorkie): `removeListener()` fails on check function causes a memory leak
                  self._runtime.dbusRegistry.removeAllListeners(channel)
                  var idx = self._activityDescriptor._registeredDbusSignals.indexOf(channel)
                  self._activityDescriptor._registeredDbusSignals.splice(idx, 1)
                }
                if (impatient || event !== 'error') {
                  /**
                   * impatient client cannot receive `error` event through Promise
                   */
                  EventEmitter.prototype.emit.apply(self,
                    [event, ttsId].concat(Array.prototype.slice.call(arguments, 1)))
                }

                if (impatient) {
                  /** promise has been resolved early, shall not be resolve/reject again */
                  return
                }

                if (['end', 'cancel'].indexOf(event) >= 0) {
                  return resolve()
                }
                if (event === 'error') {
                  return reject(new Error('Unexpected ttsd error'))
                }
              })

              if (impatient) {
                resolve(ttsId)
              }
            })
          })
      }
    },
    /**
     * Stop the current task.
     * @memberof yodaRT.activity.Activity.TtsClient
     * @instance
     * @function stop
     * @returns {Promise<void>}
     */
    stop: {
      type: 'method',
      returns: 'promise',
      fn: function stop () {
        return this._runtime.ttsMethod('stop', [this._appId])
      }
    }
  }
)

/**
 * > stability: experimental
 * @memberof yodaRT.activity.Activity
 * @class KeyboardClient
 * @hideconstructor
 * @extends EventEmitter
 */
function KeyboardDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(KeyboardDescriptor, EventEmitter)
KeyboardDescriptor.prototype.toJSON = function toJSON () {
  return KeyboardDescriptor.prototype
}

Object.assign(KeyboardDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * > stability: experimental
     * @event yodaRT.activity.Activity.KeyboardClient#click
     * @param {object} event -
     * @param {number} event.keyCode -
     */
    click: {
      type: 'event'
    },
    /**
     * > stability: experimental
     * @event yodaRT.activity.Activity.KeyboardClient#dbclick
     * @param {object} event -
     * @param {number} event.keyCode -
     */
    dbclick: {
      type: 'event'
    },
    /**
     * > stability: experimental
     * @event yodaRT.activity.Activity.KeyboardClient#longpress
     * @param {object} event -
     * @param {number} event.keyCode -
     */
    longpress: {
      type: 'event'
    }
  },
  {
    /**
     * Intercepts all events for key code until restores default behavior by KeyboardClient.restoreDefaults
     *
     * > stability: experimental
     * @memberof yodaRT.activity.Activity.KeyboardClient
     * @instance
     * @function preventDefaults
     * @param {number} keyCode -
     * @returns {Promise<void>}
     */
    preventDefaults: {
      type: 'method',
      returns: 'promise',
      fn: function preventDefaults (keyCode, event) {
        if (typeof keyCode !== 'number') {
          return Promise.reject(new Error('Expect a number on first argument of keyboard.preventDefaults.'))
        }
        if (event != null && typeof event !== 'string') {
          return Promise.reject(new Error('Expect a string on second argument of keyboard.preventDefaults.'))
        }
        return this._runtime.keyboard.preventKeyDefaults(this._appId, keyCode, event)
      }
    },
    /**
     * Restore default behavior of key code.
     *
     * > stability: experimental
     * @memberof yodaRT.activity.Activity.KeyboardClient
     * @instance
     * @function restoreDefaults
     * @param {number} keyCode -
     * @returns {Promise<void>}
     */
    restoreDefaults: {
      type: 'method',
      returns: 'promise',
      fn: function restoreDefaults (keyCode, event) {
        if (typeof keyCode !== 'number') {
          return Promise.reject(new Error('Expect a string on first argument of keyboard.restoreDefaults.'))
        }
        if (event != null && typeof event !== 'string') {
          return Promise.reject(new Error('Expect a string on second argument of keyboard.restoreDefaults.'))
        }
        return this._runtime.keyboard.restoreKeyDefaults(this._appId, keyCode, event)
      }
    }
  })

function TurenDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(TurenDescriptor, EventEmitter)
TurenDescriptor.prototype.toJSON = function toJSON () {
  return TurenDescriptor.prototype
}

Object.assign(TurenDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * add an activation word.
     * @memberof yodaRT.activity.Activity.TurenClient
     * @instance
     * @function addVtWord
     * @param {string} activationTxt -
     * @param {string} activationPy -
     * @returns {Promise<void>}
     */
    addVtWord: {
      type: 'method',
      returns: 'promise',
      fn: function addVtWord (activationTxt, activationPy) {
        return this._runtime.turen.addVtWord(activationTxt, activationPy)
      }
    },

    /**
     * delete an activation word.
     * @memberof yodaRT.activity.Activity.TurenClient
     * @instance
     * @function deleteVtWord
     * @param {string} activationTxt -
     * @returns {Promise<void>}
     */
    deleteVtWord: {
      type: 'method',
      returns: 'promise',
      fn: function deleteVtWord (activationTxt) {
        return this._runtime.turen.deleteVtWord(activationTxt)
      }
    }
  }
)

/**
 * @memberof yodaRT.activity.Activity
 * @class WormholeClient
 * @hideconstructor
 * @extends EventEmitter
 */
function WormholeDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(WormholeDescriptor, EventEmitter)
WormholeDescriptor.prototype.toJSON = function toJSON () {
  return WormholeDescriptor.prototype
}

Object.assign(WormholeDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * Send message to Rokid App.
     * @memberof yodaRT.activity.Activity.WormholeClient
     * @instance
     * @function sendToApp
     * @param {string} topic -
     * @param {any} data -
     * @returns {Promise<void>}
     */
    sendToApp: {
      type: 'method',
      returns: 'promise',
      fn: function sendToApp (topic, data) {
        return this._runtime.wormhole.sendToApp(topic, data)
      }
    }
  }
)
