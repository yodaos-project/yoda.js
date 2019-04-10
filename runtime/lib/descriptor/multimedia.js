'use strict'
/**
 * @namespace yodaRT.activity
 */

var logger = require('logger')('activity')
var Descriptor = require('../descriptor')

var yodaPath = require('@yoda/util').path
var _ = require('@yoda/util')._

var MEDIA_SOURCE = '/opt/media'

/**
 * @memberof yodaRT.activity.Activity
 * @class MediaClient
 * @hideconstructor
 * @extends EventEmitter
 */
class MultimediaDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'multimedia')
    this.registeredDbusSignals = []
  }

  listenMediaEvent (multimediaId, onEvent) {
    var self = this
    var channel = `callback:multimedia:${multimediaId}`
    var terminationEvents = ['playbackcomplete', 'cancel', 'error']
    self.registeredDbusSignals.push(channel)
    self.component.dbusRegistry.on(channel, function onDbusSignal (event) {
      logger.info('received multimedia event', channel, event)
      if (terminationEvents.indexOf(event) >= 0) {
        /** stop listening upcoming events for channel */
        // FIXME(Yorkie): `removeListener()` fails on check function causes a memory leak
        self.component.dbusRegistry.removeAllListeners(channel)
        var idx = self.registeredDbusSignals.indexOf(channel)
        self.registeredDbusSignals.splice(idx, 1)
      }
      onEvent.apply(self, arguments)
    })
  }

  prepare (ctx) {
    var url = ctx.args[0]
    var options = ctx.args[1] || { multiple: false }
    var self = this
    var streamType = _.get(options, 'streamType', 'playback')

    if (typeof streamType !== 'string') {
      return Promise.reject(new Error('Expect string on options.streamType.'))
    }

    url = yodaPath.transformPathScheme(url, MEDIA_SOURCE, ctx.appHome + '/media', {
      allowedScheme: [ 'http', 'https', 'file', 'icecast', 'rtp', 'tcp', 'udp' ]
    })

    logger.log('preparing multimedia', url)
    return self.runtime.multimediaMethod('prepare', [ctx.appId, url, streamType, JSON.stringify(options)])
      .then((result) => {
        var multimediaId = _.get(result, '0', '-1')
        logger.log('create media player', result)

        if (multimediaId === '-1') {
          throw new Error('Unexpected multimediad error.')
        }

        self.listenMediaEvent(multimediaId, function (event) {
          self.emitToApp(ctx.appId, event, [multimediaId].concat(Array.prototype.slice.call(arguments, 1)))
        })

        return multimediaId
      })
  }

  start (ctx) {
    var url = ctx.args[0]
    var options = ctx.args[1] || { multiple: false }
    var self = this
    var impatient = _.get(options, 'impatient', true)
    var streamType = _.get(options, 'streamType', 'playback')

    if (typeof streamType !== 'string') {
      return Promise.reject(new Error('Expect string on options.streamType.'))
    }

    url = yodaPath.transformPathScheme(url, MEDIA_SOURCE, ctx.appHome + '/media', {
      allowedScheme: [ 'http', 'https', 'file', 'icecast', 'rtp', 'tcp', 'udp' ]
    })

    logger.log('playing multimedia', url)
    return self.runtime.multimediaMethod('start', [ctx.appId, url, streamType, JSON.stringify(options)])
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
          self.listenMediaEvent(multimediaId, function (event) {
            if (impatient || event !== 'error') {
              self.emitToApp(ctx.appId, event, [multimediaId].concat(Array.prototype.slice.call(arguments, 1)))
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

  pause (ctx) {
    var pid = ctx.args[0] || '-1'
    return this.runtime.multimediaMethod('pause', [ctx.appId, pid])
  }

  resume (ctx) {
    var pid = ctx.args[0] || '-1'
    return this.runtime.multimediaMethod('resume', [ctx.appId, pid])
  }

  stop (ctx) {
    var pid = ctx.args[0] || '-1'
    return this.runtime.multimediaMethod('stop', [ctx.appId, pid])
  }

  getPosition (ctx) {
    var pid = ctx.args[0] || '-1'
    return this.runtime.multimediaMethod('getPosition', [ctx.appId, pid])
      .then((res) => {
        if (res && res[0] >= -1) {
          return res[0]
        }
        throw new Error('player instance not found')
      })
  }

  getLoopMode (ctx) {
    var playerId = ctx.args[0]
    return this.runtime.multimediaMethod('getLoopMode', [ctx.appId, playerId])
      .then((res) => {
        if (res && res[0] !== undefined) {
          return res[0]
        }
        throw new Error('multimediad error')
      })
  }

  setLoopMode (ctx) {
    var loop = ctx.args[0]
    var playerId = ctx.args[1]
    loop = loop === true ? 'true' : 'false'
    var pid = playerId || '-1'
    return this.runtime.multimediaMethod('setLoopMode', [ctx.appId, loop, pid])
      .then((res) => {
        if (res && res[0] !== undefined) {
          return res[0]
        }
        throw new Error('multimediad error')
      })
  }

  setEqMode (ctx) {
    var eqMode = ctx.args[0]
    var playerId = ctx.args[1]
    if (typeof eqMode !== 'number') {
      return Promise.reject(new Error(`Expect a number on setLoopMode, but got ${typeof eqMode}`))
    }
    var pid = playerId || '-1'
    return this.runtime.multimediaMethod('setEqMode', [ctx.appId, '' + eqMode, pid])
      .then((res) => {
        if (res && res[0] !== undefined) {
          return res[0]
        }
        throw new Error('multimediad error')
      })
  }

  getEqMode (ctx) {
    var pid = ctx.args[0] || '-1'
    return this.runtime.multimediaMethod('getEqMode', [ctx.appId, pid])
      .then((res) => {
        if (res && res[0] !== undefined) {
          return res[0]
        }
        throw new Error('multimediad error')
      })
  }

  seek (ctx) {
    var pos = ctx.args[0]
    var pid = ctx.args[1] || '-1'
    return this.runtime.multimediaMethod('seek', [ctx.appId, String(pos), pid])
      .then((res) => {
        if (res && res[0] === true) {
          return
        }
        throw new Error('player instance not found')
      })
  }

  getState (ctx) {
    var pid = ctx.args[0] || '-1'
    return this.runtime.multimediaMethod('getState', [ctx.appId, pid])
      .then((res) => {
        if (res && res[0] !== undefined) {
          return res[0]
        }
        throw new Error('multimediad error')
      })
  }

  setSpeed (ctx) {
    var speed = ctx.args[0]
    var playerId = ctx.args[1]
    if (typeof speed !== 'number') {
      return Promise.reject(new Error(`Expect a number on setSpeed, but got ${typeof speed}`))
    }
    var pid = playerId || '-1'
    return this.runtime.multimediaMethod('setSpeed', [ctx.appId, String(speed), pid])
      .then((res) => {
        if (res && res[0] === true) {
          return
        }
        throw new Error('player instance not found')
      })
  }
}

MultimediaDescriptor.events = {
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
   * When the `setSpeed()` operation is complete.
   * @event yodaRT.activity.Activity.MediaClient#speedchange
   * @param {string} id - multimedia player id
   * @param {number} duration -
   * @param {number} position -
   */
  speedchange: {
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
}
MultimediaDescriptor.methods = {
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
    returns: 'promise'
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
    returns: 'promise'
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
    returns: 'promise'
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
    returns: 'promise'
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
    returns: 'promise'
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
    returns: 'promise'
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
    returns: 'promise'
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
    returns: 'promise'
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
    returns: 'promise'
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
    returns: 'promise'
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
    returns: 'promise'
  },
  getState: {
    returns: 'promise'
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
    returns: 'promise'
  }
}

module.exports = MultimediaDescriptor
