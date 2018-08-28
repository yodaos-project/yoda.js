'use strict'

/**
 * @namespace yodaRT.activity
 */

var property = require('@yoda/property')
var logger = require('logger')('activity')
var EventEmitter = require('events').EventEmitter

var MEDIA_SOURCE = '/opt/media/'
var LIGHT_SOURCE = '/opt/light/'

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

function createDescriptor (appId, appHome, runtime) {
  var descriptor = new EventEmitter()
  /**
   * Continuously listened events, shall be removed on app destroy to prevent
   * memory leaks
   */
  descriptor.registeredDbusSignals = []

  var multimediaDescriptor = new EventEmitter()
  Object.assign(multimediaDescriptor,
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
       * @memberof yodaRT.activity.Activity
       * @class MediaClient
       * @augments EventEmitter
       */

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
        fn: function (url) {
          return runtime.multimediaMethod('start', [appId, url])
            .then((result) => {
              logger.log('create media player', result)
              var channel = `callback:multimedia:${result[0]}`
              runtime.dbusSignalRegistry.on(channel, function onDbusSignal (event) {
                if (event === 'playbackcomplete' || event === 'error') {
                  runtime.dbusSignalRegistry.removeListener(channel, onDbusSignal)
                  var idx = descriptor.registeredDbusSignals.indexOf(channel)
                  descriptor.registeredDbusSignals.splice(idx, 1)
                }

                multimediaDescriptor.emit.apply(arguments)
              })
              descriptor.registeredDbusSignals.push(channel)
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
        fn: function () {
          return runtime.multimediaMethod('pause', [appId])
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
        fn: function () {
          return runtime.multimediaMethod('resume', [appId])
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
        fn: function () {
          return runtime.multimediaMethod('stop', [appId])
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
        fn: function () {
          return runtime.multimediaMethod('getPosition', [appId])
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
        fn: function () {
          return runtime.multimediaMethod('getLoopMode', [appId])
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
        fn: function (loop) {
          loop = loop === true ? 'true' : 'false'
          return runtime.multimediaMethod('setLoopMode', [appId, loop])
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
        fn: function (pos) {
          return runtime.multimediaMethod('seek', [appId, pos])
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
   * @augments EventEmitter
   */

  return Object.assign(descriptor,
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
        fn: function (key) {
          return Promise.resolve(runtime.onGetPropAll())
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
          return runtime.exitAppById(appId)
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
          return runtime.destroyAll()
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
          return appId
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
          return runtime.setPickup(pickup, duration)
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
            runtime.setConfirm(appId, intent, slot, options || '[]', attrs || '', (error) => {
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
        fn: function () {
          return new Promise((resolve, reject) => {
            var result = runtime.setBackgroundByAppId(appId)
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
        fn: function () {
          return new Promise((resolve, reject) => {
            var result = runtime.setForegroundByAppId(appId)
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
        fn: function (stack) {
          runtime.syncCloudAppIdStack(stack || [])
        }
      },
      /**
       * The `TtsClient` is used to control TextToSpeech APIs.
       * @memberof yodaRT.activity.Activity
       * @instance
       * @type {yodaRT.activity.Activity.TtsClient}
       */
      tts: {
        type: 'namespace',
        /**
         * @memberof yodaRT.activity.Activity
         * @class TtsClient
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
          fn: function (text) {
            return runtime.ttsMethod('speak', [appId, text])
              .then((args) => {
                logger.log(`tts register ${args[0]}`)
                return new Promise(resolve => {
                  runtime.dbusSignalRegistry.once(`callback:tts:${args[0]}`, resolve)
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
          fn: function () {
            return runtime.ttsMethod('stop', [appId])
          }
        }
      },
      /**
       * The `MediaClient` is used to control multimedia APIs.
       * @memberof yodaRT.activity.Activity
       * @instance
       * @type {yodaRT.activity.Activity.MediaClient}
       */
      media: multimediaDescriptor,
      /**
       * @memberof yodaRT.activity.Activity
       * @instance
       * @type {yodaRT.activity.Activity.LightClient}
       */
      light: {
        type: 'namespace',
        /**
         * @memberof yodaRT.activity.Activity
         * @class LightClient
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
          fn: function (uri, args) {
            var argString = JSON.stringify(args || {})
            var absPath = pathTransform(uri, LIGHT_SOURCE, appHome + '/light')
            return runtime.lightMethod('play', [appId, absPath, argString])
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
          fn: function () {
            return runtime.lightMethod('stop', [appId])
          }
        }
      },
      /**
       * @memberof yodaRT.activity.Activity
       * @instance
       * @type {yodaRT.LocalStorage}
       */
      localStorage: {
        type: 'namespace',
        /**
         * @memberof yodaRT
         * @class LocalStorage
         */

        /**
         * @memberof yodaRT.LocalStorage
         * @instance
         * @function getItem
         * @returns {String}
         */
        getItem: {
          type: 'method',
          returns: 'direct',
          fn: function (key) {
            return property.get(key)
          }
        },
        /**
         * @memberof yodaRT.LocalStorage
         * @instance
         * @function setItem
         * @returns {Boolean}
         */
        setItem: {
          type: 'method',
          returns: 'direct',
          fn: function (key, value) {
            return property.set(key, value)
          }
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
        fn: function (uri) {
          var absPath = pathTransform(uri, MEDIA_SOURCE, appHome + '/media')
          return runtime.lightMethod('appSound', [appId, absPath])
        }
      }
    }
  )
}

module.exports.createDescriptor = createDescriptor
