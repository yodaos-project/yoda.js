/**
 * @module @yodaos/speech-synthesis
 */

var EventEmitter = require('events')

var REGISTRY = Symbol('synth#registry')
var API = Symbol('synth#api')
var SYNTH_ID = Symbol('synth#id')
var UTTER = Symbol('synth#utter')
var STATUS = Symbol('synth#status')

function setup (api, speechSynthesis) {
  var registry = api[REGISTRY] = {}
  api.on('start', (id) => {
    var utter = api[REGISTRY][id]
    if (utter != null) {
      if (speechSynthesis[UTTER] && speechSynthesis[UTTER][SYNTH_ID] === id) {
        speechSynthesis[STATUS] = Status.speaking
      }
      utter.emit('start')
    }
  })
  ;['end', 'error', 'cancel'].forEach(eve => {
    api.on(eve, (id) => {
      var utter = api[REGISTRY][id]
      if (utter == null) {
        return
      }
      delete api[REGISTRY][id]

      if (speechSynthesis[UTTER] && speechSynthesis[UTTER][SYNTH_ID] === id) {
        speechSynthesis[STATUS] = Status.none
      }
      utter.emit(eve)
    })
  })
  return registry
}

function register (api, id, self) {
  var registry = api[REGISTRY]
  registry[id] = self
}

var Status = {
  none: 0,
  pending: 0b001,
  paused: 0b010,
  speaking: 0b100
}

/**
 * @hideconstructor
 * @example
 * var speechSynthesis = require('@yodaos/speech-synthesis').speechSynthesis
 * speechSynthesis.speak('foo')
 *   .on('end', () => {
 *     console.log('speech ended')
 *   })
 */
class SpeechSynthesis extends EventEmitter {
  constructor (api) {
    super()

    this[API] = api || global[Symbol.for('yoda#api')].tts
    setup(api, this)

    this[UTTER] = null
    this[STATUS] = Status.none
  }

  get paused () {
    return (this[STATUS] & Status.paused) > 0
  }

  get pending () {
    return (this[STATUS] & Status.pending) > 0
  }

  get speaking () {
    return (this[STATUS] & Status.speaking) > 0
  }

  /**
   * The `speak()` method of the `SpeechSynthesis` interface adds an utterance
   * to the utterance queue; it will be spoken when any other utterances queued
   * before it have been spoken.
   *
   * @param {string|SpeechSynthesisUtterance} utterance
   * @returns {SpeechSynthesisUtterance} the utterance
   */
  speak (utterance) {
    this[STATUS] = Status.pending
    if (typeof utterance === 'string') {
      utterance = new SpeechSynthesisUtterance(utterance)
    }
    this[API].speak(utterance.text)
      .then(id => {
        this[UTTER] = utterance
        utterance[SYNTH_ID] = id
        register(this[API], id, utterance)
      })
    return utterance
  }

  /**
   * The `cancel()` method of the `SpeechSynthesis` interface removes all
   * utterances from the utterance queue.
   *
   * If an utterance is currently being spoken, speaking will stop immediately.
   */
  cancel () {
    this[API].stop()
  }
}

/**
 * The `SpeechSynthesisUtterance` interface of the Speech API represents a speech
 * request. It contains the content the speech service should read and information
 * about how to read it (e.g. language, pitch and volume.)
 *
 * @param {string} text
 */
class SpeechSynthesisUtterance extends EventEmitter {
  constructor (text) {
    super()
    this.text = text
  }
}

module.exports.SpeechSynthesis = SpeechSynthesis
module.exports.SpeechSynthesisUtterance = SpeechSynthesisUtterance

var defaultInstance = null
Object.defineProperty(module.exports, 'speechSynthesis', {
  enumerable: true,
  configurable: true,
  get: () => {
    if (defaultInstance == null) {
      defaultInstance = new SpeechSynthesis(global[Symbol.for('yoda#api')].tts)
    }
    return defaultInstance
  }
})
