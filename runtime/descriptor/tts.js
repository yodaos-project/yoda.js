'use strict'
/**
 * @namespace yodaRT.activity
 */

var logger = require('logger')('activity')
var _ = require('@yoda/util')._
var Descriptor = require('../lib/descriptor')

/**
 * @memberof yodaRT.activity.Activity
 * @class TtsClient
 * @hideconstructor
 * @extends EventEmitter
 */
class TtsDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'tts')
    this.requests = {}
  }

  /**
   *
   * @param {*} event
   * @param {*} ttsId
   * @param {*} appId
   * @param {*} errno
   */
  handleEvent (event, ttsId, appId, errno) {
    var request = this.requests[ttsId]
    if (request == null) {
      logger.warn(`unknown tts(${ttsId}) event(${event})`)
      return
    }
    if (['error', 'end', 'cancel'].indexOf(event) >= 0) {
      delete this.requests[ttsId]
    }
    if (request.impatient || event !== 'error') {
      /**
       * impatient client cannot receive `error` event through Promise
       */
      var args = [ ttsId, errno ]
      this.emitToApp(appId, event, args)
    }
    if (request.impatient) {
      /** promise has been resolved early, shall not be resolve/reject again */
      return
    }
    if (['end', 'cancel'].indexOf(event) >= 0) {
      return request.resolve()
    }
    if (event === 'error') {
      var err = new Error(`Unexpected ttsd error(${errno})`)
      err.code = errno
      return request.reject(err)
    }
  }

  speak (ctx) {
    var text = ctx.args[0]
    var options = ctx.args[1]

    var self = this
    var impatient = _.get(options, 'impatient', false)

    return self.runtime.ttsMethod('speak', [ ctx.appId, text ])
      .then(res => {
        var ttsId = res.msg[0]
        logger.log(`tts register ${ttsId}`)
        if (ttsId === '-1') {
          throw new Error('Unexpected ttsd error.')
        }
        return new Promise((resolve, reject) => {
          self.requests[ttsId] = { impatient: impatient, resolve: resolve, reject: reject }
          if (impatient) {
            resolve(ttsId)
          }
        })
      })
  }

  stop (ctx) {
    return this.runtime.ttsMethod('stop', [ ctx.appId ])
      .then(() => { /** do not return flora response to app */ })
  }
}

TtsDescriptor.events = {
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
}
TtsDescriptor.methods = {
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
    returns: 'promise'
  },
  /**
   * Stop the current task.
   * @memberof yodaRT.activity.Activity.TtsClient
   * @instance
   * @function stop
   * @returns {Promise<void>}
   */
  stop: {
    returns: 'promise'
  }
}

module.exports = TtsDescriptor
