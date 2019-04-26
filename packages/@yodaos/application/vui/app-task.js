'use strict'

var AtomicTask = require('./atomic-task').AtomicTask
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var tts = require('@yodaos/speech-synthesis').speechSynthesis
var util = require('util')
var math = require('@yoda/util').math

/**
 * @description App task class is a wrapper of atomic task class which provide much easier usage by only define several task type and resource value.
 * @memberof module:`@yodaos/application/vui`
 * @param {Array} tasks The quark tasks description object array.
 * @param {string} [name] The task name.
 * @throws `TypeError` if arguments are not qualified.
 * @example
 ```
  // An atomic app task example which include 4 quark tasks: first speak a text, then play a piece of ringtone and then noop for a while and play ringtone again at last.
  var AppTask = require('@yodaos/application').vui.AppTask
  var task = new AppTask([
      { tts: '你的计时到了。' },
      { media: 'system://alarm_default_ringtone.mp3' },
      { timeout: 4000 },
      { media: 'system://alarm_default_ringtone.mp3' }
    ], 'timer-timeup-task')
  task.execute()
  ...
  setTimeout(() => {
    task.interrupt()
  }, 9000)
  ```
 */
class AppTask {
  constructor (tasks, name) {
    if (typeof name !== 'string') {
      this.name = 'anonymous-task'
    } else {
      this.name = name
    }
    this.logger = require('logger')(this.name)
    this.logger.log(`[app-task] Construct ${this.name}`)
    if (!Array.isArray(tasks)) {
      throw TypeError('Expected an array of `tasks`.')
    }
    this.quarkTasks = new Array(tasks.length)
    tasks.forEach((t, i) => {
      if (t == null || typeof t !== 'object') {
        throw TypeError(`Expected an object type of task, but got ${typeof t} on index ${i}.`)
      }
      this.quarkTasks[i] = (onQuarkTaskExecutedCallback) => {
        if (t.hasOwnProperty('tts')) {
          var text = t.tts
          if (Array.isArray(text)) {
            var i = math.randInt(text.length)
            text = text[i]
          }
          if (typeof t.args === 'string') {
            text = util.format(text, t.args)
          }
          this.logger.debug(`[app-task] step ${i + 1}: speak '${text}'`)
          tts.once('end', onQuarkTaskExecutedCallback)
          tts.once('error', onQuarkTaskExecutedCallback)
          tts.speak(text)
          return tts
        } else if (t.hasOwnProperty('media')) {
          this.logger.debug(`[app-task] step ${i + 1}: play '${t.media}'`)
          var mp = new MediaPlayer()
          mp.once('playbackcomplete', onQuarkTaskExecutedCallback)
          mp.once('error', onQuarkTaskExecutedCallback)
          mp.start(t.media)
          return mp
        } else if (t.hasOwnProperty('timeout')) {
          this.logger.debug(`[app-task] step ${i + 1}: noop for ${t.timeout} ms`)
          return setTimeout(onQuarkTaskExecutedCallback, t.timeout)
        } else {
          throw TypeError(`Only support tts|media|timeout for index ${i}.`)
        }
      }
    })
    this.atomicTask = new AtomicTask(
      (onTaskPreparedCallback) => {
        this.logger.debug('[app-task] onPrepare')
        onTaskPreparedCallback()
      },
      (isInterrupted) => {
        this.logger.debug(`[app-task] Task over, isInterrupted = ${isInterrupted}`)
      },
      this.quarkTasks,
      this.name
    )
  }

  execute () {
    this.atomicTask.execute()
  }

  interrupt () {
    this.atomicTask.interrupt()
  }
}

exports.AppTask = AppTask
