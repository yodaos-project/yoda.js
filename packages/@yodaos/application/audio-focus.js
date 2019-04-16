/**
 * @module @yodaos/application
 */

var registrySymbol = Symbol('audio-focus#registry')

function setup (api) {
  var registry = api[registrySymbol] = {}
  api.on('gain', (id) => {
    var focus = api[registrySymbol][id]
    if (focus && typeof focus.onGain === 'function') {
      focus.onGain()
    }
  })
  api.on('loss', (id, transient, mayDuck) => {
    var focus = api[registrySymbol][id]
    if (focus && typeof focus.onLoss === 'function') {
      focus.onLoss(transient, mayDuck)
    }
  })
  return registry
}

function register (api, id, self) {
  var registry = api[registrySymbol]
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
    this.type = type
    register(this.api, this.id, this)
  }

  /**
   * @returns {Promise}
   */
  request () {
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

AudioFocus.Type = {
  DEFAULT: 0b000,
  TRANSIENT: 0b001,
  EXCLUSIVE: 0b010,
  MAY_DUCK: 0b100
}

module.exports = AudioFocus
