/**
 * @module @yodaos/speech-synthesis
 */

var EventEmitter = require('events')
var SpeechSynthesizer = require('./out/speech-synthesizer.node').SpeechSynthesizer

var SYNTH_LABEL = Symbol('synth#label')
var UTTER = Symbol('synth#utter')
var STATUS = Symbol('synth#status')
var QUEUE = Symbol('synth#queue')
var NATIVE = Symbol('synth#native')
var EFFECT = Symbol('synth#effect')

var SpeechSynthesisEffectUri = 'system://setSpeaking.js'

var Status = {
  none: 0,
  pending: 0b001,
  paused: 0b010,
  speaking: 0b100
}

var Events = ['start', 'end', 'cancel']

/**
 * @hideconstructor
 * @example
 * var speechSynthesis = require('@yodaos/speech-synthesis').speechSynthesis
 * speechSynthesis.speak('foo')
 *   .on('end', () => {
 *     console.log('speech ended')
 *   })
 */
class SpeechSynthesis {
  constructor (api) {
    api = api || global[Symbol.for('yoda#api')]
    this[SYNTH_LABEL] = api.appId
    this[EFFECT] = api.effect
    this[QUEUE] = []
    this[NATIVE] = new SpeechSynthesizer()
    this[NATIVE].setup(this.onevent.bind(this))

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
    if (!(utterance instanceof SpeechSynthesisUtterance)) {
      throw TypeError('Expect a string or SpeechSynthesisUtterance on SpeechSynthesis.speak')
    }
    var idx = this[QUEUE].indexOf(utterance)
    if (idx < 0) {
      utterance.setId(this[SYNTH_LABEL])
      this[QUEUE].push(utterance)
    }
    if (this[STATUS] === Status.none) {
      this[STATUS] = Status.pending
    }
    this.go()
    return utterance
  }

  /**
   * The `cancel()` method of the `SpeechSynthesis` interface removes all
   * utterances from the utterance queue.
   *
   * If an utterance is currently being spoken, speaking will stop immediately.
   */
  cancel () {
    if (this[STATUS] === Status.speaking) {
      this[NATIVE].cancel()
    }
  }

  playStream () {
    this[STATUS] = Status.pending
    var utterance = new SpeechSynthesisUtterance()
    utterance.setId(this[SYNTH_LABEL])
    this[QUEUE].push(utterance)
    if (this[STATUS] === Status.none) {
      this[STATUS] = Status.pending
    }
    this.go()
    return utterance
  }

  onevent (eve, errCode) {
    var utter = this[UTTER]
    if (eve === 0) {
      this[STATUS] = Status.speaking
    } else if (eve > 0) {
      this[STATUS] = Status.none
      this[UTTER] = null
      this[EFFECT].stop(SpeechSynthesisEffectUri)
    }
    if (utter == null) {
      return
    }
    var name = Events[eve]
    if (name === 'cancel' && errCode !== 0) {
      var err = new Error(`SpeechSynthesisError: code(${errCode})`)
      err.code = errCode
      utter.emit('error', err)
    } else {
      utter.emit(Events[eve])
    }
    this.go()
  }

  go () {
    if (this[UTTER]) {
      return
    }
    if (this[QUEUE].length <= 0) {
      return
    }
    var utter = this[QUEUE].shift()
    this[UTTER] = utter
    if (utter.text) {
      this[NATIVE].speak(utter)
    } else {
      this[NATIVE].playStream(utter)
    }
    this[EFFECT].play(SpeechSynthesisEffectUri)
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

  setId (label) {
    Object.defineProperty(this, 'id', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: `yodaos.speech-synthesis.${label}.${Date.now()}`
    })
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
      defaultInstance = new SpeechSynthesis(global[Symbol.for('yoda#api')])
    }
    return defaultInstance
  }
})
