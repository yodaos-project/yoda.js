'use strict'

/**
 * @module @yodaos/application/vui
 */

var EventEmitter = require('events')
var AudioFocus = require('../audio-focus')

/**
 * @callback FlowMonad
 * @param {Function} callback - normal arbitrary callback function
 * @param {*} previous - result from previous monad
 * @returns {void} return value is discarded
 */

/**
 * Usage:
 *
 * ```javascript
 * var sf = new SequentialFlow([
 *   // Automatically handles SpeechSynthesisUtterance resolution/cancellation
 *   () => synth.speak('Playback down'),
 *   // Automatically handles MediaPlayer resolution/cancellation
 *   () => new MediaPlayer().start('/data/media/music.mp3'),
 *   (done, onCancel) => {
 *     var customPlayer = new SomePlayer()
 *       .on('end', () => done())
 *     onCancel(() => player.stop())
 *   }
 * ])
 * sf.start() // Acquires audio focus
 * setTimeout(() => sf.cancel(), 1000) // Abandons audio focus
 * ```
 *
 * @param {module:@yodaos/application/vui~FlowMonad[]} monads
 * @param {Function} [callback] - finale callback, if no callback is specified,
 * result would be discarded, and error would be thrown
 */
class SequentialFlow extends EventEmitter {
  constructor (monads) {
    super()
    if (!Array.isArray(monads)) {
      throw TypeError('Expect array of functions on first argument of compose.')
    }
    monads.forEach((monad, idx) => {
      if (typeof monad !== 'function') {
        throw TypeError(`Expect functions on compose, but got ${typeof monad} on index ${idx}.`)
      }
    })
    this.monads = monads
    this.step = null
    this.focus = null
    this.cancellations = []

    this.defaultPlaybackControls = SequentialFlow.defaultPlaybackControls
  }

  start () {
    if (this.step != null) {
      this.cancel()
    }
    this.focus = new AudioFocus()
    this.focus.onGain = () => {
      this.step = -1
      this.routine(++this.step)
    }
    this.focus.onLoss = () => {
      this.cancel()
    }
    this.focus.request()
  }

  cancel () {
    if (this.step == null) {
      return
    }
    this.cancellations.forEach(it => {
      if (typeof it === 'function') {
        it()
      }
    })
    this.emit('cancel')
  }

  routine (idx) {
    var self = this
    if (idx >= self.monads.length) {
      self.emit('end')
      return
    }
    self.cancellations = []

    function next (err) {
      if (err) {
        self.emit('error', err)
        return
      }
      self.routine(idx + 1)
    }
    function onCancel (fn) {
      self.cancellations.push(fn)
    }

    var monad = self.monads[idx]
    var ret = monad(next, onCancel)

    for (var ii = 0; ii < this.defaultPlaybackControls.length; ++ii) {
      var control = this.defaultPlaybackControls[ii]
      if (ret instanceof control[0]) {
        control[1].call(self, ret, next, onCancel)
      }
    }
  }
}

SequentialFlow.defaultPlaybackControls = [
  /**
   * @example
   * [
   *   require('@yodaos/speech-synthesis').SpeechSynthesisUtterance,
   *   function (it, next, onCancel) {
   *     it.on('end', next).on('error', next).on('cancel', () => this.cancel())
   *     onCancel(() => it.cancel())
   *   }
   * ]
  */
]

module.exports = SequentialFlow
