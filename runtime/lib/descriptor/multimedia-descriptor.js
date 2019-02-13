'use strict'
/**
 * @namespace yodaRT.activity
 */

var logger = require('logger')('activity')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

var yodaPath = require('@yoda/util').path
var _ = require('@yoda/util')._

var MEDIA_SOURCE = '/opt/media'

module.exports = MultimediaDescriptor

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
  self._runtime.component.dbusRegistry.on(channel, function onDbusSignal (event) {
    logger.info('received multimedia event', channel, event)
    if (terminationEvents.indexOf(event) >= 0) {
      /** stop listening upcoming events for channel */
      // FIXME(Yorkie): `removeListener()` fails on check function causes a memory leak
      self._runtime.component.dbusRegistry.removeAllListeners(channel)
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
     * @param {number} duration -
     * @param {number} position -
     */
    prepared: {
      type: 'event'
    },
    /**
     * When the media resource is paused.
     * @event yodaRT.activity.Activity.MediaClient#paused
     * @param {string} id - multimedia player id
     * @param {number} duration -
     * @param {number} position -
     */
    paused: {
      type: 'event'
    },
    /**
     * When the media resource is resumed.
     * @event yodaRT.activity.Activity.MediaClient#resumed
     * @param {string} id - multimedia player id
     * @param {number} duration -
     * @param {number} position -
     */
    resumed: {
      type: 'event'
    },
    /**
     * When the media playback is complete.
     * @event yodaRT.activity.Activity.MediaClient#playbackcomplete
     * @param {string} id - multimedia player id
     * @param {number} duration -
     * @param {number} position -
     */
    playbackcomplete: {
      type: 'event'
    },
    /**
     * When the media playback is canceled.
     * @event yodaRT.activity.Activity.MediaClient#cancel
     * @param {string} id - multimedia player id
     * @param {number} duration -
     * @param {number} position -
     */
    cancel: {
      type: 'event'
    },
    /**
     * When buffering progress is updates.
     * @event yodaRT.activity.Activity.MediaClient#bufferingupdate
     * @param {string} id - multimedia player id
     * @param {number} duration -
     * @param {number} position -
     */
    bufferingupdate: {
      type: 'event'
    },
    /**
     * When the `seek()` operation is complete.
     * @event yodaRT.activity.Activity.MediaClient#seekcomplete
     * @param {string} id - multimedia player id
     * @param {number} duration -
     * @param {number} position -
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

        if (!self._runtime.component.permission.check(self._appId, 'ACCESS_MULTIMEDIA', {
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
        options = options || { multiple: false }
        return self._runtime.multimediaMethod('prepare', [self._appId, url, streamType, JSON.stringify(options)])
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

        if (!self._runtime.component.permission.check(self._appId, 'ACCESS_MULTIMEDIA')) {
          return Promise.reject(new Error('Permission denied.'))
        }

        if (typeof streamType !== 'string') {
          return Promise.reject(new Error('Expect string on options.streamType.'))
        }

        url = yodaPath.transformPathScheme(url, MEDIA_SOURCE, self._appHome + '/media', {
          allowedScheme: [ 'http', 'https', 'file', 'icecast', 'rtp', 'tcp', 'udp' ]
        })
        logger.log('playing multimedia', url)
        options = options || { multiple: false }
        return self._runtime.multimediaMethod('start', [self._appId, url, streamType, JSON.stringify(options)])
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
     * @param {string} [playerId]
     * @returns {Promise<void>}
     */
    pause: {
      type: 'method',
      returns: 'promise',
      fn: function pause (playerId) {
        var pid = playerId || '-1'
        return this._runtime.multimediaMethod('pause', [this._appId, pid])
      }
    },
    /**
     * Resume the playing.
     * Requires app to be the active app.
     *
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function resume
     * @param {string} playerId
     * @returns {Promise<void>}
     */
    resume: {
      type: 'method',
      returns: 'promise',
      fn: function resume (playerId) {
        var pid = playerId || '-1'
        if (!this._runtime.component.permission.check(this._appId, 'ACCESS_MULTIMEDIA')) {
          return Promise.reject(new Error('Permission denied.'))
        }
        return this._runtime.multimediaMethod('resume', [this._appId, pid])
      }
    },
    /**
     * Stop the playing.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function stop
     * @param {string} playerId
     * @returns {Promise<void>}
     */
    stop: {
      type: 'method',
      returns: 'promise',
      fn: function stop (playerId) {
        var pid = playerId || '-1'
        return this._runtime.multimediaMethod('stop', [this._appId, pid])
      }
    },
    /**
     * get position.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function getPosition
     * @param {string} playerId
     * @returns {Promise<number>}
     */
    getPosition: {
      type: 'method',
      returns: 'promise',
      fn: function getPosition (playerId) {
        var pid = playerId || '-1'
        return this._runtime.multimediaMethod('getPosition', [this._appId, pid])
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
     * @param {string} playerId
     * @returns {Promise<number>}
     */
    getLoopMode: {
      type: 'method',
      returns: 'promise',
      fn: function getLoopMode (playerId) {
        return this._runtime.multimediaMethod('getLoopMode', [this._appId, playerId])
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
     * @param {string} playerId
     * @returns {Promise<boolean>}
     */
    setLoopMode: {
      type: 'method',
      returns: 'promise',
      fn: function setLoopMode (loop, playerId) {
        loop = loop === true ? 'true' : 'false'
        var pid = playerId || '-1'
        return this._runtime.multimediaMethod('setLoopMode', [this._appId, loop, pid])
          .then((res) => {
            if (res && res[0] !== undefined) {
              return res[0]
            }
            throw new Error('multimediad error')
          })
      }
    },

    /**
     * return which EQ mode the player is.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function getEqMode
     * @param {string} playerId
     * @returns {Promise<number>}
     */
    getEqMode: {
      type: 'method',
      returns: 'promise',
      fn: function getLoopMode (playerId) {
        var pid = playerId || '-1'
        return this._runtime.multimediaMethod('getEqMode', [this._appId, pid])
          .then((res) => {
            if (res && res[0] !== undefined) {
              return res[0]
            }
            throw new Error('multimediad error')
          })
      }
    },
    /**
     * set player EQ mode.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function setEqMode
     * @param {number} eqMode
     * @param {string} playerId
     * @returns {Promise<boolean>}
     */
    setEqMode: {
      type: 'method',
      returns: 'promise',
      fn: function setEqMode (eqMode, playerId) {
        if (typeof eqMode !== 'number') {
          return Promise.reject(new Error(`Expect a number on setLoopMode, but got ${typeof eqMode}`))
        }
        var pid = playerId || '-1'
        return this._runtime.multimediaMethod('setEqMode', [this._appId, '' + eqMode, pid])
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
     * @param {string} playerId
     * @returns {Promise<void>}
     */
    seek: {
      type: 'method',
      returns: 'promise',
      fn: function seek (pos, playerId) {
        var pid = playerId || '-1'
        return this._runtime.multimediaMethod('seek', [this._appId, String(pos), pid])
          .then((res) => {
            if (res && res[0] === true) {
              return
            }
            throw new Error('player instance not found')
          })
      }
    },
    getState: {
      type: 'method',
      returns: 'promise',
      fn: function getState (playerId) {
        var pid = playerId || '-1'
        return this._runtime.multimediaMethod('getState', [this._appId, pid])
          .then((res) => {
            if (res && res[0] !== undefined) {
              return res[0]
            }
            throw new Error('multimediad error')
          })
      }
    },
    /**
     * set play speed.
     * @memberof yodaRT.activity.Activity.MediaClient
     * @instance
     * @function setSpeed
     * @param {number} speed
     * @param {string} playerId
     * @returns {Promise<void>}
     */
    setSpeed: {
      type: 'method',
      returns: 'promise',
      fn: function setSpeed (speed, playerId) {
        if (typeof speed !== 'number') {
          return Promise.reject(new Error(`Expect a number on setSpeed, but got ${typeof speed}`))
        }
        var pid = playerId || '-1'
        return this._runtime.multimediaMethod('setSpeed', [this._appId, String(speed), pid])
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
