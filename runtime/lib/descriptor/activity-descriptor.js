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

var KeyboardDescriptor = require('./keyboard-descriptor')
var LightDescriptor = require('./light-descriptor')
var MultimediaDescriptor = require('./multimedia-descriptor')
var TtsDescriptor = require('./tts-descriptor')
var TurenDescriptor = require('./turen-descriptor')
var WormholeDescriptor = require('./wormhole-descriptor')

module.exports = ActivityDescriptor

/**
 * @memberof yodaRT.activity
 * @classdesc The `Activity` is the APIs for apps developer.
 * ```js
 * module.exports = activity => {
 *   activity.on('create', () => {
 *     console.log('app is created')
 *   })
 *   activity.on('destroy', () => {
 *     console.log('app is destroyed')
 *   })
 *   activity.on('request', nlp => {
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
     * When the app is active.
     * @event yodaRT.activity.Activity#active
     */
    active: {
      type: 'event'
    },
    /**
     * When the Activity API is ready.
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
     * Fires on nlp requests.
     * @event yodaRT.activity.Activity#request
     * @param {object} data
     * @param {string} data.intent - your nlp intent.
     * @param {object} data.slots  - your nlp slots.
     * @param {string} data.asr    - the asr text.
     * @param {object} action      - the cloud post-processed data.
     */
    request: {
      type: 'event'
    },
    /**
     * Fires on url requests.
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
    },
    /**
     * Fires on oppressing of other apps in monologue mode.
     *
     * > Only fires to apps in monologue mode.
     *
     * @event yodaRT.activity.Activity#oppressing
     * @param {'request' | 'url'} event - the event of oppressed app which would had
     * activated the app if not in monologue mode.
     */
    oppressing: {
      type: 'event'
    },
    /**
     * Fires on notification requests.
     * @event yodaRT.activity.Activity#notification
     * @param {string} channel
     */
    notification: {
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
     * Put device into hibernation. Terminates apps in stack (i.e. apps in active and paused).
     *
     * Also clears apps' contexts.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function hibernate
     * @returns {Promise<void>}
     */
    hibernate: {
      type: 'method',
      returns: 'promise',
      fn: function hibernate () {
        return this._runtime.hibernate()
      }
    },
    /**
     * Starts the login flow.
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function login
     * @param {object} [options] - the options to login
     * @param {string} [options.masterId] - the masterId to bind.
     * @returns {Promise<void>}
     */
    login: {
      type: 'method',
      returns: 'promise',
      fn: function startLogin (options) {
        return this._runtime.login(options).catch((err) => {
          if (err.code !== 'FUNCTION_IS_LOCKED') {
            throw err
          }
          logger.warn('call `startLogin` when its working, just skip it')
        })
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
        if (this._runtime.life.getCurrentAppId() !== this._appId) {
          return Promise.reject(new Error('currently app is not active'))
        }
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
      fn: function voiceCommand (text, options) {
        if (!this._runtime.permission.check(this._appId, 'ACCESS_VOICE_COMMAND')) {
          return Promise.reject(new Error('Permission denied.'))
        }
        return this._runtime.voiceCommand(text, Object.assign({}, options, { appId: this._appId }))
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
