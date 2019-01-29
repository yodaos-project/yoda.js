'use strict'
/**
 * @namespace yodaRT.activity
 */

var logger = require('logger')('activity')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var _ = require('@yoda/util')._

module.exports = TtsDescriptor

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

  this._requests = {}
}
inherits(TtsDescriptor, EventEmitter)
TtsDescriptor.prototype.toJSON = function toJSON () {
  return TtsDescriptor.prototype
}
TtsDescriptor.prototype.handleEvent = function handleEvent (event, ttsId, errno) {
  logger.info('tts signals', event, ttsId)
  var request = this._requests[ttsId]
  if (request == null) {
    logger.warn(`unknown tts(${ttsId}) event(${event})`)
    return
  }
  if (['error', 'end', 'cancel'].indexOf(event) >= 0) {
    delete this._requests[ttsId]
  }
  if (request.impatient || event !== 'error') {
    /**
     * impatient client cannot receive `error` event through Promise
     */
    this.emit.apply(this,
      Array.prototype.slice.call(arguments, 0))
  }

  if (request.impatient) {
    /** promise has been resolved early, shall not be resolve/reject again */
    return
  }

  if (['end', 'cancel'].indexOf(event) >= 0) {
    return request.resolve()
  }
  if (event === 'error') {
    var code = arguments[2]
    var err = new Error(`Unexpected ttsd error(${code})`)
    err.code = code
    return request.reject(err)
  }
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

        if (!self._runtime.component.permission.check(self._appId, 'ACCESS_TTS')) {
          return Promise.reject(new Error('Permission denied.'))
        }

        return self._runtime.ttsMethod('speak', [ self._appId, text ])
          .then(res => {
            var ttsId = res.msg[0]
            logger.log(`tts register ${ttsId}`)
            if (ttsId === '-1') {
              throw new Error('Unexpected ttsd error.')
            }
            return new Promise((resolve, reject) => {
              self._requests[ttsId] = { impatient: impatient, resolve: resolve, reject: reject }
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
        return this._runtime.ttsMethod('stop', [ this._appId ])
          .then(() => { /** do not return flora response to app */ })
      }
    }
  }
)
