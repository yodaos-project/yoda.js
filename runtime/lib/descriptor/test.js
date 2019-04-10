
/**
 * @namespace yodaRT.activity.test
 */

var Descriptor = require('../descriptor')

/**
 * @memberof yodaRT.activity.Activity
 * @class TestClient
 * @hideconstructor
 * @extends EventEmitter
 */
class TestDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'test')
  }

  voiceCommand (text, options) {
    return this._runtime.voiceCommand(text, Object.assign({}, options, { appId: null }))
  }
  nlpCommand (nlp, action) {
    return this._runtime.handleNlpIntent('@test', nlp, action)
  }
}

TestDescriptor.methods = {
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
    returns: 'promise'
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
    returns: 'promise'
  }
}

module.exports = TestDescriptor
