'use strict'

var AudioFocus = require('@yodaos/application').AudioFocus
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var SpeechSynthesis = require('@yodaos/speech-synthesis').SpeechSynthesis

/**
 * @description Atomic task class is a utility which wrap some sub tasks as an atomic task.
 * - It means if any sub task is interrupted, the whole atomic task is interrupted.
 * - All sub tasks will be executed by sequence of original pass to constructor.
 * @memberof module:`@yodaos/application/vui`
 * @param {function|null} onPrepareTask The indicator function before task is executed.
 * @param {function|null} onPostTask The indicator function after task is finished.
 * @param {Array} tasks The quark tasks function array.
 * @param {string} [name] The task name.
 * @throws `TypeError` if arguments are not qualified.
 * @example
 ```
  // An atomic task example which include 4 quark tasks: first speak a text, then play a piece of ringtone and then noop for a while and play ringtone again at last.
  var AtomicTask = require('@yodaos/application').vui.AtomicTask
  var MediaPlayer = require('@yoda/multimedia').MediaPlayer
  var tts = require('@yodaos/speech-synthesis').speechSynthesis
  var mp = null
  function playRingtone (cb, step, url) {
    logger.debug(`step ${step}: play ringtone`)
    mp = new MediaPlayer()
    mp.on('playbackcomplete', cb)
    mp.on('error', cb)
    mp.start(url)
    return (onInterruptedCallabck) => {
      logger.debug(`step ${step} interrupted.`)
      mp.stop()
      onInterruptedCallabck()
    }
  }
  var task = new AtomicTask(
    (onTaskPreparedCallback) => {
      logger.debug('onPrepare')
      onTaskPreparedCallback()
    },
    (isInterrupted) => {
      logger.debug(`Task over, isInterrupted = ${isInterrupted}`)
    },
    [
      (onQuarkTaskExecutedCallback) => {
        logger.debug('step 1: play tts')
        tts.once('end', onQuarkTaskExecutedCallback)
        tts.once('error', onQuarkTaskExecutedCallback)
        tts.speak('你的计时到了。')
        return (onInterruptedCallabck) => {
          logger.debug('step 1 interrupted.')
          tts.cancel()
          onInterruptedCallabck()
        }
      },
      (onQuarkTaskExecutedCallback) => {
        playRingtone(onQuarkTaskExecutedCallback, 2, 'system://alarm_default_ringtone.mp3')
      },
      (onQuarkTaskExecutedCallback) => {
        logger.debug('step 3: noop for a while')
        setTimeout(onQuarkTaskExecutedCallback, 4000)
      },
      (onQuarkTaskExecutedCallback) => {
        playRingtone(onQuarkTaskExecutedCallback, 4, 'system://alarm_default_ringtone.mp3')
      }
    ], 'timer-timeup-task'
  )
  task.execute()
  ...
  setTimeout(() => {
    task.interrupt()
  }, 9000)
  ```
 */
class AtomicTask {
  constructor (onPrepareTask, onPostTask, tasks, name) {
    if (onPrepareTask !== null && typeof onPrepareTask !== 'function') {
      throw TypeError('Expected a function type of `onPrepareTask` or give me null if you dont care about it.')
    }
    this.onPrepareTask = onPrepareTask
    if (onPostTask !== null && typeof onPostTask !== 'function') {
      throw TypeError('Expected a function type of `onPostTask` or give me null if you dont care about it.')
    }
    this.onPostTask = onPostTask
    if (!Array.isArray(tasks)) {
      throw TypeError('Expected an array of `tasks`.')
    }
    tasks.forEach((t, i) => {
      if (typeof t !== 'function') {
        throw TypeError(`Expected a function type of task, but got ${typeof t} on index ${i}.`)
      }
    })
    this.quarkTasks = tasks
    if (typeof name !== 'string') {
      this.name = 'anonymous-task'
    } else {
      this.name = name
    }
    this.logger = require('logger')(this.name)
    this.interruptHandlers = new Array(this.quarkTasks.length)
    this.index = -1
    this.focus = null
    this._end = false
    this.isInterrupted = false
    this.logger.debug(`[atomic-task] Construct ${this.name}`)
  }

  /**
   * @private
   */
  _onTaskPreparedCallback () {
    if (this._end) {
      this.logger.warn(`[atomic-task] When prepared, 'end' flag is true! stop all.`)
      return
    }
    this.index = 0
    this._executeQuarkTask()
  }

  /**
   * @private
   */
  _onTaskInterruptedCallback () {
    if (typeof this.onPostTask === 'function') {
      this.onPostTask(this.isInterrupted)
    }
    this.logger.debug(`[atomic-task] Atomic task execution end. (interrupted = ${this.isInterrupted})`)
  }

  /**
   * @private
   */
  _onAudioFocusGained () {
    if (this._end) {
      this.logger.warn(`[atomic-task] When audio focus gained, 'end' flag is true! stop all.`)
      return
    }
    if (typeof this.onPrepareTask === 'function') {
      this.onPrepareTask(this._onTaskPreparedCallback.bind(this))
    } else {
      this._onTaskPreparedCallback()
    }
  }

  /**
   * @private
   */
  _onQuarkTaskExecuted () {
    if (this._end) {
      this.logger.warn(`[atomic-task] When quark task executed, 'end' flag is true! stop all.`)
      return
    }
    this.index++
    if (this.index >= this.quarkTasks.length) {
      this._end = true
      this.isInterrupted = false
      this.focus.onGain = null
      this.focus.onLoss = null
      this.focus.abandon()
      if (typeof this.onPostTask === 'function') {
        this.onPostTask(this.isInterrupted)
      }
      this.logger.debug(`[atomic-task] Atomic task execution end. (interrupted = ${this.isInterrupted})`)
    } else {
      this.logger.debug(`[atomic-task] Continue next quark task...`)
      this._executeQuarkTask()
    }
  }

  /**
   * @private
   */
  _executeQuarkTask () {
    var task = this.quarkTasks[this.index]
    this.interruptHandlers[this.index] = task(this._onQuarkTaskExecuted.bind(this))
  }

  /**
   * Start executing of the atomic task.
   * @public
   */
  execute () {
    if (this._end) {
      this.logger.warn(`[atomic-task] Atomic task already stopped. Please create a new one and execute it for purpose of restart.`)
      return
    }

    if (this.index >= 0) {
      this.logger.warn(`[atomic-task] Task already started, ignore 'execute again'.`)
      return
    }
    this.focus = new AudioFocus(AudioFocus.Type.TRANSIENT)
    this.focus.onGain = this._onAudioFocusGained.bind(this)
    this.focus.onLoss = this._interrupt.bind(this)
    this.focus.request()
  }

  /**
   * When atomic task is executing, call this API to interrupt it.
   */
  interrupt () {
    this._interrupt(true)
  }

  /**
   * @private
   */
  _interrupt (userInterrupt) {
    if (this._end) {
      this.logger.warn(`[atomic-task] Task already stopped, ignore 'interrupt again'.`)
      return
    }
    this._end = true
    this.isInterrupted = true
    this.focus.onGain = null
    this.focus.onLoss = null
    this.focus.abandon()
    var interruptHandler = this.interruptHandlers[this.index]
    this.logger.info(`[atomic-task] Interrupting task by '${userInterrupt ? 'user actively' : 'lost of focus'}'... handler = ${typeof interruptHandler}`)
    if (typeof interruptHandler === 'function') {
      // Invoke user callback to handle interruption.
      interruptHandler(this._onTaskInterruptedCallback.bind(this))
      return
    }
    if (typeof interruptHandler === 'object') {
      if (interruptHandler instanceof MediaPlayer) {
        this.logger.warn(`[atomic-task] step ${this.index + 1}: media player interrupted`)
        var mp = interruptHandler
        mp.stop()
      } else if (interruptHandler instanceof SpeechSynthesis) {
        this.logger.warn(`[atomic-task] step ${this.index + 1} tts interrupted`)
        var tts = interruptHandler
        tts.cancel()
      } else {
        this.logger.warn(`[atomic-task] step ${this.index + 1} timeout interrupted`)
        var timerId = interruptHandler
        clearTimeout(timerId)
      }
    }
    this._onTaskInterruptedCallback()
  }
}

module.exports = AtomicTask
