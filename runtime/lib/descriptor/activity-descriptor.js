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
var AudioFocusDescriptor = require('./audio-focus-descriptor')
var EffectDescriptor = require('./effect-descriptor')
var MultimediaDescriptor = require('./multimedia-descriptor')
var TtsDescriptor = require('./tts-descriptor')
var RuntimeDescriptor = require('./runtime-descriptor')
var NotificationDescriptor = require('./notification-descriptor')

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
  this._destructed = false

  /**
   * The `EffectClient` is used to control hardware effects.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.EffectClient} effect
   */
  this.effect = new EffectDescriptor(this, appId, appHome, runtime)

  /**
   * The `AudioFocusClient` is used to control hardware effects.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.AudioFocusClient} audioFocus
   */
  this.audioFocus = new AudioFocusDescriptor(this, appId, appHome, runtime)

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
   * The `RuntimeClient` is used to control runtime behaviors.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.RuntimeClient} runtime
   */
  this.runtime = new RuntimeDescriptor(this, appId, appHome, runtime)

  /**
   * The `NotificationClient` is used to control notification behaviors.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.NotificationClient} notification
   */
  this.notification = new NotificationDescriptor(this, appId, appHome, runtime);

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
  if (this._destructed) {
    return
  }
  this._destructed = true

  this._registeredDbusSignals.forEach(it => {
    this._runtime.component.dbusRegistry.removeAllListeners(it)
  })
  this.emit('destruct')
}

Object.assign(ActivityDescriptor.prototype,
  {
    /**
     * When an activity is created.
     * @event yodaRT.activity.Activity#created
     */
    created: {
      type: 'event'
    },
    /**
     * When an activity is about been paused.
     * @event yodaRT.activity.Activity#paused
     */
    paused: {
      type: 'event'
    },
    /**
     * When an activity is resumed.
     * @event yodaRT.activity.Activity#resumed
     */
    resumed: {
      type: 'event'
    },
    /**
     * When an activity is about been destroyed.
     * @event yodaRT.activity.Activity#destroyed
     */
    destroyed: {
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
     * @param {string} event - the event of oppressed app which would had
     * activated the app if not in monologue mode.
     */
    oppressing: {
      type: 'event'
    },
    /**
     * Fires on events.
     * @event yodaRT.activity.Activity#broadcast
     * @param {string} name - the broadcast name.
     * @param {object} data - the broadcast data.
     */
    broadcast: {
      type: 'event'
    }
  },
  {
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
        return this._runtime.exitAppById(this._appId, Object.assign({}, options, { ignoreKeptAlive: true }))
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
     * @param {string} url - the YodaOS url to open.
     * @param {object} [options]
     * @param {boolean} [options.preemptive=true] -
     * @returns {Promise<boolean>}
     */
    openUrl: {
      type: 'method',
      returns: 'promise',
      fn: function open (url, options) {
        if (typeof options === 'string') {
          options = { form: options }
        }
        return this._runtime.openUrl(url, options)
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
     * Set context options to current context.
     *
     * Options would be merged to current options so that it's not required
     *  to provide a full set of options each time.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function setContextOptions
     * @param {object} options - context options to be set.
     * @param {boolean} [options.keepAlive] - if app is preferring entering
     * background instead of being destroyed on preemption
     * @returns {Promise<object>}
     */
    setContextOptions: {
      type: 'method',
      returns: 'promise',
      fn: function setContextOptions (options) {
        options = _.pick(options, 'keepAlive')
        return this._runtime.component.lifetime.setContextOptionsById(this._appId, options)
      }
    },
    /**
     * Get current context options previously set.
     *
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function getContextOptions
     * @returns {Promise<object>}
     */
    getContextOptions: {
      type: 'method',
      returns: 'promise',
      fn: function getContextOptions () {
        return this._runtime.component.lifetime.getContextOptionsById(this._appId)
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
        if (!this._runtime.component.permission.check(this._appId, 'ACCESS_VOICE_COMMAND')) {
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
        if (!this._runtime.component.permission.check(this._appId, 'ACCESS_MONOPOLIZATION')) {
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
        if (!this._runtime.component.permission.check(this._appId, 'ACCESS_MONOPOLIZATION')) {
          return Promise.reject(new Error('Permission denied.'))
        }
        return this._runtime.stopMonologue(this._appId)
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
        return Promise.resolve(this._runtime.component.turen.muted)
      }
    }
  }
)
