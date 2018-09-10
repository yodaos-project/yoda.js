'use strict'

/**
 * @namespace yodaRT.activity
 */

var logger = require('logger')('activity')
var inherits = require('util').inherits
var _ = require('@yoda/util')._
var EventEmitter = require('events').EventEmitter

var MEDIA_SOURCE = '/opt/media/'
var LIGHT_SOURCE = '/opt/light/'

module.exports.ActivityDescriptor = ActivityDescriptor
module.exports.LightDescriptor = LightDescriptor
module.exports.MultimediaDescriptor = MultimediaDescriptor
module.exports.TtsDescriptor = TtsDescriptor

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
  this.light = new LightDescriptor(this, appId, runtime)

  /**
   * The `MediaClient` is used to control multimedia APIs.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.MediaClient} media
   */
  this.media = new MultimediaDescriptor(this, appId, runtime)

  /**
   * The `TtsClient` is used to control TextToSpeech APIs.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {yodaRT.activity.Activity.TtsClient} tts
   */
  this.tts = new TtsDescriptor(this, appId, runtime)

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
    this._runtime.dbusSignalRegistry.removeAllListeners(it)
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
     * @param {string} url
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
     * @returns {Promise<void>}
     */
    exit: {
      type: 'method',
      returns: 'promise',
      fn: function exit () {
        this._runtime.life.deactivateAppById(this._appId)
        return Promise.resolve()
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
        return this._runtime.life.destroyAll()
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
        if (!this._runtime.permission.check(this._appId, 'INTERRUPT')) {
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
     * @param {string} [form] - the running form of the activity, available value are: cut
     *                          or scene.
     * @return {Promise<void>}
     */
    setForeground: {
      type: 'method',
      returns: 'promise',
      fn: function setForeground (form) {
        if (!this._runtime.permission.check(this._appId, 'INTERRUPT')) {
          return Promise.reject(new Error('Permission denied.'))
        }
        if (form != null && (form !== 'cut' || form !== 'scene')) {
          return Promise.reject(new TypeError(`Expect 'cut' or 'scene' on first argument of setForeground.`))
        }
        return this._runtime.life.setForegroundById(this._appId, form).then(() => {})
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
        var absPath = pathTransform(uri, MEDIA_SOURCE, this._appHome + '/media')
        return this._runtime.lightMethod('appSound', [this._appId, absPath])
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
            self._runtime.speechT.getNlpResult(text, function (err, nlp, action) {
              if (err) {
                throw err
              }
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
     * @param {'cut' | 'scene'} form -
     * @returns {Promise<boolean>}
     */
    openUrl: {
      type: 'method',
      returns: 'promise',
      fn: function openUrl (url, form) {
        return this._runtime.openUrl(url, form)
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
function LightDescriptor (activityDescriptor, appId, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
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
     * @memberof yodaRT.activity.Activity.LightClient
     * @instance
     * @function play
     * @param {string} uri - the light resource uri.
     * @param {object} args - the args.
     * @returns {Promise<void>}
     */
    play: {
      type: 'method',
      returns: 'promise',
      fn: function play (uri, args) {
        var argString = JSON.stringify(args || {})
        var absPath = pathTransform(uri, LIGHT_SOURCE, this._appHome + '/light')
        logger.log('playing light effect', absPath)
        return this._runtime.lightMethod('play', [this._appId, absPath, argString])
          .then((res) => {
            if (res && res[0] === true) {
              return
            }
            throw new Error('lighting effect throw an error')
          })
      }
    },
    /**
     * @memberof yodaRT.activity.Activity.LightClient
     * @instance
     * @function stop
     * @returns {Promise<void>}
     */
    stop: {
      type: 'method',
      returns: 'promise',
      fn: function stop () {
        return this._runtime.lightMethod('setHide', [this._appId])
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
function MultimediaDescriptor (activityDescriptor, appId, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._runtime = runtime
}
inherits(MultimediaDescriptor, EventEmitter)
MultimediaDescriptor.prototype.toJSON = function toJSON () {
  return MultimediaDescriptor.prototype
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
     * Start playing your url.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function start
     * @param {string} uri
     * @returns {Promise<string>} multimedia player id
     */
    start: {
      type: 'method',
      returns: 'promise',
      fn: function start (url) {
        var self = this
        return self._runtime.multimediaMethod('start', [self._appId, url])
          .then((result) => {
            var multimediaId = result[0]
            logger.log('create media player', result)

            if (multimediaId === '-1') {
              throw new Error('Unexpected multimediad error.')
            }

            var channel = `callback:multimedia:${multimediaId}`
            self._activityDescriptor._registeredDbusSignals.push(channel)
            self._runtime.dbusSignalRegistry.on(channel, function onDbusSignal (event) {
              if (['playbackcomplete', 'error'].indexOf(event) >= 0) {
                /** stop listening upcoming events for channel */
                self._runtime.dbusSignalRegistry.removeListener(channel, onDbusSignal)
                var idx = self._activityDescriptor._registeredDbusSignals.indexOf(channel)
                self._activityDescriptor._registeredDbusSignals.splice(idx, 1)
              }

              EventEmitter.prototype.emit.apply(self,
                [event, multimediaId].concat(Array.prototype.slice.call(arguments, 1)))
            })

            return multimediaId
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
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function resume
     * @returns {Promise<void>}
     */
    resume: {
      type: 'method',
      returns: 'promise',
      fn: function resume () {
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
        return this._runtime.multimediaMethod('seek', [this._appId, pos])
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
function TtsDescriptor (activityDescriptor, appId, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
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
        return self._runtime.ttsMethod('speak', [self._appId, text])
          .then((args) => {
            var ttsId = args[0]
            logger.log(`tts register ${ttsId}`)

            if (ttsId === '-1') {
              return Promise.reject(new Error('Unexpected ttsd error.'))
            }
            return new Promise((resolve, reject) => {
              var channel = `callback:tts:${ttsId}`
              self._activityDescriptor._registeredDbusSignals.push(channel)
              self._runtime.dbusSignalRegistry.on(channel, function onDbusSignal (event) {
                logger.info('tts signals', channel, event)

                if (['cancel', 'end', 'error'].indexOf(event) >= 0) {
                  /** stop listening upcoming events for channel */
                  self._runtime.dbusSignalRegistry.removeListener(channel, onDbusSignal)
                  var idx = self._activityDescriptor._registeredDbusSignals.indexOf(channel)
                  self._activityDescriptor._registeredDbusSignals.splice(idx, 1)
                }
                EventEmitter.prototype.emit.apply(self,
                  [event, ttsId].concat(Array.prototype.slice.call(arguments, 1)))

                if (impatient) {
                  /** promise has been resolved early, shall not be resolve/reject again */
                  return
                }

                if (event === 'end') {
                  return resolve()
                }
                if (event === 'cancel') {
                  return reject(new Error('Tts canceled'))
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
 *
 * @private
 * @param {string} name
 * @param {string} prefix
 * @param {string} home
 */
function pathTransform (name, prefix, home) {
  var len = name.length
  var absPath = ''
  // etc.. system://path/to/sound.ogg
  if (len > 9 && name.substr(0, 9) === 'system://') {
    absPath = prefix + name.substr(9)
    // etc.. self://path/to/sound.ogg
  } else if (len > 7 && name.substr(0, 7) === 'self://') {
    absPath = home + '/' + name.substr(7)
    // etc.. path/to/sound.ogg
  } else {
    absPath = home + '/' + name
  }
  return absPath
}
