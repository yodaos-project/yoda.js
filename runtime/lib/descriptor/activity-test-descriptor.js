
/**
 * @namespace yodaRT.activity.test
 */

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = ActivityTestDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class ActivityTestClient
 * @hideconstructor
 * @extends EventEmitter
 */
function ActivityTestDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(ActivityTestDescriptor, EventEmitter)
ActivityTestDescriptor.prototype.toJSON = function toJSON () {
  return ActivityTestDescriptor.prototype
}
Object.assign(ActivityTestDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * Send a voice command to the main process.
     *
     * @memberof yodaRT.activity.Activity.ActivityTestClient
     * @instance
     * @function voiceCommand
     * @param {string} text - voice asr/text command to be parsed and executed.
     * @returns {Promise<void>}
     */
    voiceCommand: {
      type: 'method',
      returns: 'promise',
      fn: function voiceCommand (text, options) {
        return this._runtime.voiceCommand(text, Object.assign({}, options, { appId: null }))
      }
    },
    /**
     * Send a nlp command to the main process.
     *
     * @memberof yodaRT.activity.Activity.ActivityTestClient
     * @instance
     * @function voiceCommand
     * @param {object} nlp - nlp command object.
     * @param {object} action - parsed nlp command to be executed.
     * @returns {Promise<void>}
     */
    nlpCommand: {
      type: 'method',
      returns: 'promise',
      fn: function nlpCommand (nlp, action) {
        return this._runtime.onVoiceCommand('@test', nlp, action)
      }
    }
  }
)
