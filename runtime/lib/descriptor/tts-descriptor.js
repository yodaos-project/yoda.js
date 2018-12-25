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
                  var code = arguments[1]
                  var err = new Error(`Unexpected ttsd error(${code})`)
                  err.code = code
                  return reject(err)
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
