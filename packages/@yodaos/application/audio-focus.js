var symbol = require('./symbol').audioFocus

function setup (api) {
  var registry = api[symbol.registry] = {}
  api.on('gain', (id) => {
    var focus = api[symbol.registry][id]
    focus[symbol.state] = AudioFocus.State.ACTIVE

    var hook = registry[symbol.hook]
    if (hook) {
      hook('gain', focus)
    }
    if (focus && typeof focus.onGain === 'function') {
      focus.onGain()
    }
    if (hook) {
      hook('gained', focus)
    }
  })
  api.on('loss', (id, transient, mayDuck) => {
    var focus = api[symbol.registry][id]
    if (transient) {
      focus[symbol.state] = AudioFocus.State.SUSPENDED
    } else {
      delete api[symbol.registry][id]
      focus[symbol.state] = AudioFocus.State.INACTIVE
    }

    var hook = registry[symbol.hook]
    if (hook) {
      hook('loss', focus, transient, mayDuck)
    }
    if (focus && typeof focus.onLoss === 'function') {
      focus.onLoss(transient, mayDuck)
    }
    if (hook) {
      hook('lost', focus)
    }
  })
  return registry
}

function register (api, id, self) {
  var registry = api[symbol.registry]
  if (registry == null) {
    registry = setup(api)
  }
  registry[id] = self
}

var _id = 0
class AudioFocus {
  /**
   * AudioFocus
   *
   * @memberof module:@yodaos/application
   * @param {number} type
   * @example
   * var focus = new AudioFocus(AudioFocus.Type.TRANSIENT)
   * focus.resumeOnGain = false
   * focus.onGain = () => {
   *   focus.resumeOnGain = false
   *   var player = focus.player
   *   if (player == null) {
   *     player = focus.player = new MediaPlayer()
   *   }
   *   if (focus.resumeOnGain) {
   *     player.resume()
   *   } else {
   *     player.start('/opt/media/music.ogg')
   *   }
   * }
   * focus.onLoss = (transient, mayDuck) => {
   *   var player = focus.player
   *   if (transient) {
   *     player.pause()
   *     focus.resumeOnGain = true
   *   } else {
   *     player.stop()
   *   }
   * }
   *
   * focus.request()
   */
  constructor (type, api) {
    if (api == null) {
      api = global[Symbol.for('yoda#api')].audioFocus
    }
    this.api = api
    this.id = ++_id
    this.type = type || AudioFocus.Type.DEFAULT
    this[symbol.state] = AudioFocus.State.INACTIVE
  }

  /**
   * @returns {AudioFocus.State}
   */
  get state () {
    return this[symbol.state]
  }

  /**
   * @returns {Promise}
   */
  request () {
    if (this[symbol.state] === AudioFocus.State.ACTIVE) {
      return Promise.resolve()
    }
    register(this.api, this.id, this)
    return this.api.request({ id: this.id, gain: this.type })
  }

  /**
   * @returns {Promise}
   */
  abandon () {
    return this.api.abandon(this.id)
  }

  /**
   * replace `onGain` listener to get notified on focus changes.
   */
  onGain () {}

  /**
   * replace `onLoss` listener to get notified on focus changes.
   * @param {boolean} transient
   * @param {boolean} mayDuck
   */
  onLoss () {}
}

/**
 * @memberof module:@yodaos/application~AudioFocus
 * @static
 * @readonly
 * @enum {number}
 *
 * Enum for AudioFocus types.
 */
AudioFocus.Type = {
  DEFAULT: 0b000,
  TRANSIENT: 0b001,
  TRANSIENT_EXCLUSIVE: 0b011,
  TRANSIENT_MAY_DUCK: 0b101
}
Object.freeze(AudioFocus.Type)

/**
 * @memberof module:@yodaos/application~AudioFocus
 * @static
 * @readonly
 * @enum {string}
 */
AudioFocus.State = {
  /**
   * the AudioFocus is allowed to play sound.
   */
  ACTIVE: 'active',
  /**
   * the AudioFocus is not allowed to play sound, but can resume when it regains focus.
   */
  SUSPENDED: 'suspended',
  /**
   * the AudioFocus is not allowed to play sound, and will not regain focus unless it
   * requests audio focus again.
   */
  INACTIVE: 'inactive'
}
Object.freeze(AudioFocus.State)

module.exports = AudioFocus
module.exports.setup = setup
