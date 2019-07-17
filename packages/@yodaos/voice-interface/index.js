var EventEmitter = require('events')

var DEFAULT_TIMEOUT = 10000

var ENGINE_TARGET = 'launcher'
var ENGINE_PICKUP_CHANNEL = 'yodaos.voice-interface.engine.pickup'
var ENGINE_MUTED_CHANNEL = 'yodaos.voice-interface.engine.muted'
var ENGINE_VIGILANCE_CHANNEL = 'yodaos.voice-interface.engine.vigilance'

class VoiceEngine extends EventEmitter {
  constructor (agent) {
    super()
    this.agent = agent
  }

  /**
   * Make engine to begin to pickup voices if true. Close picking up if else.
   * @param {boolean} pickup
   * @returns {Promise<boolean>}
   */
  setPickup (pickup) {
    return this._call(ENGINE_PICKUP_CHANNEL, [ pickup ? 1 : 0 ])
      .then(msg => {
        return msg[0] === 1
      })
  }

  /**
   * Get if engine is picking up.
   * @returns {Promise<boolean>}
   */
  getPickup () {
    return this._call(ENGINE_PICKUP_CHANNEL, [])
      .then(msg => {
        return msg[0] === 1
      })
  }

  /**
   * Make engine to mute voice input. Muted engine would not be vigilant or picking up anymore.
   * @param {boolean} mute
   * @returns {Promise<boolean>}
   */
  setMuted (mute) {
    return this._call(ENGINE_MUTED_CHANNEL, [ mute ? 1 : 0 ])
      .then(msg => {
        return msg[0] === 1
      })
  }

  /**
   * Get if engine is muted.
   * @returns {Promise<boolean>}
   */
  getMuted () {
    return this._call(ENGINE_MUTED_CHANNEL, [])
      .then(msg => {
        return msg[0] === 1
      })
  }

  /**
   * Make engine to be vigilant or not. Not vigilant engine would not respond to wakeup words.
   * But engine still could be activated by setting pickup programmatically, i.e. push to talk.
   * @param {boolean} vigilant
   * @returns {Promise<boolean>}
   */
  setVigilance (vigilant) {
    return this._call(ENGINE_VIGILANCE_CHANNEL, [ vigilant ? 1 : 0 ])
      .then(msg => {
        return msg[0] === 1
      })
  }

  /**
   * Get if engine is vigilant.
   * @returns {Promise<boolean>}
   */
  getVigilance () {
    return this._call(ENGINE_VIGILANCE_CHANNEL, [])
      .then(msg => {
        return msg[0] === 1
      })
  }

  /**
   * @private
   */
  _call (channel, msg) {
    return this.agent.call(channel, msg, ENGINE_TARGET, DEFAULT_TIMEOUT)
      .then(reply => {
        if (reply.retCode !== 0) {
          throw new Error(`${channel}(${reply.retCode}) from ${ENGINE_TARGET}`)
        }
        return reply.msg || []
      })
  }
}

module.exports.VoiceEngine = VoiceEngine
var voiceEngine
Object.defineProperty(module.exports, 'voiceEngine', {
  enumerable: true,
  configurable: true,
  get: () => {
    if (voiceEngine == null) {
      var agent = global[Symbol.for('yoda#api')].agent
      voiceEngine = new VoiceEngine(agent)
    }
    return voiceEngine
  }
})
