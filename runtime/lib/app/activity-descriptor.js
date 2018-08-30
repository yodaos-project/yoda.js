'use strict'

/**
 * @namespace yodaRT.activity
 */

var logger = require('logger')('activity')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

var MEDIA_SOURCE = '/opt/media/'
var LIGHT_SOURCE = '/opt/light/'

module.exports.ActivityDescriptor = ActivityDescriptor
module.exports.LightDescriptor = LightDescriptor
module.exports.MultimediaDescriptor = MultimediaDescriptor
module.exports.TtsDescriptor = TtsDescriptor

/**
 * @memberof yodaRT.activity
 * @classdesc The `Activity` instance is that developer will use in often.
 * ```js
 * module.exports = function(activity) {
 *   activity.on('ready', () => {
 *     console.log('activity is ready')
 *   })
 *   activity.on('created', () => {
 *     console.log('app is created')
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
  this.appId = appId
  this.appHome = appHome
  this.runtime = runtime

  this.registeredDbusSignals = []

  /**
   * @memberof yodaRT.activity.Activity
   * @instance
   * @type {yodaRT.activity.Activity.LightClient}
   */
  this.light = new LightDescriptor(this, appId, runtime)

  /**
   * The `MediaClient` is used to control multimedia APIs.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @type {yodaRT.activity.Activity.MediaClient}
   */
  this.media = new MultimediaDescriptor(this, appId, runtime)

  /**
   * The `TtsClient` is used to control TextToSpeech APIs.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @type {yodaRT.activity.Activity.TtsClient}
   */
  this.tts = new TtsDescriptor(this, appId, runtime)
}
inherits(ActivityDescriptor, EventEmitter)
ActivityDescriptor.prototype.toJSON = function toJSON () {
  return Object.assign({}, ActivityDescriptor.prototype, {
    light: this.light,
    media: this.media,
    tts: this.tts
  })
}
ActivityDescriptor.prototype.toString = function toString () {
  return `ActivityDescriptor(appId=>${this.appId}, appHome=>${this.appHome})`
}
ActivityDescriptor.prototype.destruct = function destruct () {
  this.registeredDbusSignals.forEach(it => {
    this.runtime.dbusSignalRegistry.removeAllListeners(it)
  })
  this.emit('destruct')
}

Object.assign(ActivityDescriptor.prototype,
  {
    /**
     * When the app is ready
     * @event yodaRT.activity.Activity#ready
     */
    ready: {
      type: 'event'
    },
    /**
     * When the app is create
     * @event yodaRT.activity.Activity#created
     */
    created: {
      type: 'event'
    },
    /**
     * When the app is pause
     * @event yodaRT.activity.Activity#paused
     */
    paused: {
      type: 'event'
    },
    /**
     * When the app is resume
     * @event yodaRT.activity.Activity#resumed
     */
    resumed: {
      type: 'event'
    },
    /**
     * When the app is destroy
     * @event yodaRT.activity.Activity#destroyed
     */
    destroyed: {
      type: 'event'
    },
    /**
     * When the app is received a command request
     * @event yodaRT.activity.Activity#onrequest
     */
    onrequest: {
      type: 'event'
    }
  },
  {
    /**
     * get property value by key
     * @function get
     * @param {String} key
     * @memberof yodaRT.activity.Activity
     * @instance
     * @returns {Promise}
     */
    get: {
      type: 'method',
      returns: 'promise',
      fn: function get (key) {
        return Promise.resolve(this.runtime.onGetPropAll())
      }
    },
    /**
     * Exits the current application.
     * @function exit
     * @memberof yodaRT.activity.Activity
     * @instance
     */
    exit: {
      type: 'method',
      returns: 'promise',
      fn: function exit () {
        return this.runtime.exitAppById(this.appId)
      }
    },
    /**
     * Exits the current application and clean up others.
     * @function destroyAll
     * @memberof yodaRT.activity.Activity
     * @instance
     */
    destroyAll: {
      type: 'method',
      returns: 'promise',
      fn: function destroyAll () {
        return this.runtime.destroyAll()
      }
    },
    /**
     * Get the current `appId`.
     * @function getAppId
     * @memberof yodaRT.activity.Activity
     * @instance
     * @returns {String} the current `appId`.
     */
    getAppId: {
      type: 'method',
      returns: 'promise',
      fn: function getAppId () {
        return this.appId
      }
    },
    /**
     * Set the current app is pickup
     * @function setPickup
     * @param {Boolean} pickup
     * @param {Number} [duration=6000]
     * @memberof yodaRT.activity.Activity
     * @instance
     */
    setPickup: {
      type: 'method',
      returns: 'promise',
      fn: function setPickup (pickup, duration) {
        return this.runtime.setPickup(pickup, duration)
      }
    },
    /**
     * Set the app is confirmed
     * @function setConfirm
     * @param {String} intent
     * @param {String} slot
     * @param {Object} options
     * @param {Object} attrs
     * @memberof yodaRT.activity.Activity
     * @instance
     * @return {Promise}
     */
    setConfirm: {
      type: 'method',
      returns: 'promise',
      fn: function setConfirm (intent, slot, options, attrs) {
        return new Promise((resolve, reject) => {
          if (intent === undefined || intent === '') {
            reject(new Error('intent required'))
            return
          }
          if (slot === undefined) {
            reject(new Error('slot required'))
            return
          }
          this.runtime.setConfirm(this.appId, intent, slot, options || '[]', attrs || '', (error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
      }
    },
    /**
     * push the app in background
     * @function setBackground
     * @memberof yodaRT.activity.Activity
     * @instance
     * @return {Promise}
     */
    setBackground: {
      type: 'method',
      returns: 'promise',
      fn: function setBackground () {
        return new Promise((resolve, reject) => {
          var result = this.runtime.setBackgroundByAppId(this.appId)
          if (result === true) {
            resolve()
          } else {
            reject(new Error('push the app in background error'))
          }
        })
      }
    },
    /**
     * push the app in foreground
     * @function setForeground
     * @memberof yodaRT.activity.Activity
     * @instance
     * @return {Promise}
     */
    setForeground: {
      type: 'method',
      returns: 'promise',
      fn: function setForeground () {
        return new Promise((resolve, reject) => {
          var result = this.runtime.setForegroundByAppId(this.appId)
          if (result === true) {
            resolve()
          } else {
            reject(new Error('push the app in foreground error'))
          }
        })
      }
    },
    /**
     * sync cloudappclient appid stack
     * @function syncCloudAppIdStack
     * @memberof yodaRT.activity.Activity
     * @param {Array} stack cloud skills id
     * @instance
     * @private
     */
    syncCloudAppIdStack: {
      type: 'method',
      returns: 'promise',
      fn: function syncCloudAppIdStack (stack) {
        this.runtime.syncCloudAppIdStack(stack || [])
      }
    },
    /**
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function playSound
     * @param {String} uri - the sound resource uri.
     * @returns {Promise}
     */
    playSound: {
      type: 'method',
      returns: 'promise',
      fn: function playSound (uri) {
        var absPath = pathTransform(uri, MEDIA_SOURCE, this.appHome + '/media')
        return this.runtime.lightMethod('appSound', [this.appId, absPath])
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
function LightDescriptor (activityDescriptor, appId, runtime) {
  EventEmitter.call(this)
  this.activityDescriptor = activityDescriptor
  this.appId = appId
  this.runtime = runtime
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
     * @memberof yodaRT.activity.Activity
     * @class LightClient
     * @hideconstructor
     */

    /**
     * @memberof yodaRT.activity.Activity.LightClient
     * @instance
     * @function play
     * @param {String} uri - the light resource uri.
     * @param {Object} args - the args.
     * @returns {Promise}
     */
    play: {
      type: 'method',
      returns: 'promise',
      fn: function play (uri, args) {
        var argString = JSON.stringify(args || {})
        var absPath = pathTransform(uri, LIGHT_SOURCE, this.appHome + '/light')
        return this.runtime.lightMethod('play', [this.appId, absPath, argString])
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
     * @returns {Promise}
     */
    stop: {
      type: 'method',
      returns: 'promise',
      fn: function stop () {
        return this.runtime.lightMethod('stop', [this.appId])
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
  this.activityDescriptor = activityDescriptor
  this.appId = appId
  this.runtime = runtime
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
     * @event yodaRT.activity.multimedia#prepared
     */
    prepared: {
      type: 'event'
    },
    /**
     * @event yodaRT.activity.multimedia#playbackcomplete
     */
    playbackcomplete: {
      type: 'event'
    },
    /**
     * @event yodaRT.activity.multimedia#bufferingupdate
     */
    bufferingupdate: {
      type: 'event'
    },
    /**
     * @event yodaRT.activity.multimedia#seekcomplete
     */
    seekcomplete: {
      type: 'event'
    },
    /**
     * @event yodaRT.activity.multimedia#error
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
     * @param {String} uri
     * @returns {Promise}
     */
    start: {
      type: 'method',
      returns: 'promise',
      fn: function start (url) {
        return this.runtime.multimediaMethod('start', [this.appId, url])
          .then((result) => {
            logger.log('create media player', result)
            var channel = `callback:multimedia:${result[0]}`
            this.runtime.dbusSignalRegistry.on(channel, function onDbusSignal (event) {
              if (event === 'playbackcomplete' || event === 'error') {
                this.runtime.dbusSignalRegistry.removeListener(channel, onDbusSignal)
                var idx = this.activityDescriptor.registeredDbusSignals.indexOf(channel)
                this.activityDescriptor.registeredDbusSignals.splice(idx, 1)
              }

              EventEmitter.property.emit.apply(this, arguments)
            })
            this.activityDescriptor.registeredDbusSignals.push(channel)
          })
      }
    },
    /**
     * Pause the playing.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function pause
     * @returns {Promise}
     */
    pause: {
      type: 'method',
      returns: 'promise',
      fn: function pause () {
        return this.runtime.multimediaMethod('pause', [this.appId])
      }
    },
    /**
     * Resume the playing.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function resume
     * @returns {Promise}
     */
    resume: {
      type: 'method',
      returns: 'promise',
      fn: function resume () {
        return this.runtime.multimediaMethod('resume', [this.appId])
      }
    },
    /**
     * Stop the playing.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function stop
     * @returns {Promise}
     */
    stop: {
      type: 'method',
      returns: 'promise',
      fn: function stop () {
        return this.runtime.multimediaMethod('stop', [this.appId])
      }
    },
    /**
     * get position.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function getPosition
     * @returns {Promise}
     */
    getPosition: {
      type: 'method',
      returns: 'promise',
      fn: function getPosition () {
        return this.runtime.multimediaMethod('getPosition', [this.appId])
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
     * @returns {Promise}
     */
    getLoopMode: {
      type: 'method',
      returns: 'promise',
      fn: function getLoopMode () {
        return this.runtime.multimediaMethod('getLoopMode', [this.appId])
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
     * @param {Boolean} loop
     * @returns {Promise}
     */
    setLoopMode: {
      type: 'method',
      returns: 'promise',
      fn: function setLoopMode (loop) {
        loop = loop === true ? 'true' : 'false'
        return this.runtime.multimediaMethod('setLoopMode', [this.appId, loop])
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
     * @param {Number} pos
     * @returns {Promise}
     */
    seek: {
      type: 'method',
      returns: 'promise',
      fn: function seek (pos) {
        return this.runtime.multimediaMethod('seek', [this.appId, pos])
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
  this.activityDescriptor = activityDescriptor
  this.appId = appId
  this.runtime = runtime
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
     * @memberof yodaRT.activity.Activity
     * @class TtsClient
     * @hideconstructor
     */

    /**
     * Speak the given text.
     * @memberof yodaRT.activity.Activity.TtsClient
     * @instance
     * @function speak
     * @param {String} text
     * @returns {Promise}
     */
    speak: {
      type: 'method',
      returns: 'promise',
      fn: function speak (text) {
        console.log(this)
        return this.runtime.ttsMethod('speak', [this.appId, text])
          .then((args) => {
            logger.log(`tts register ${args[0]}`)
            return new Promise(resolve => {
              this.runtime.dbusSignalRegistry.once(`callback:tts:${args[0]}`, resolve)
            })
          })
      }
    },
    /**
     * Stop the current task.
     * @memberof yodaRT.activity.Activity.TtsClient
     * @instance
     * @function stop
     * @returns {Promise}
     */
    stop: {
      type: 'method',
      returns: 'promise',
      fn: function stop () {
        return this.runtime.ttsMethod('stop', [this.appId])
      }
    }
  }
)

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
