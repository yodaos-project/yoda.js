var _ = require('@yoda/util')._
var logger = require('logger')('comp-de-voix')

module.exports = function compositionDeVoix (activity) {
  var currId

  var map = {
    execute_batch: (nlp, id) => {
      var execJson = _.get(nlp, 'slots.executions.value')
      var exec
      try {
        exec = JSON.parse(execJson)
      } catch (err) {
        activity.tts.speak('你想干蛤').then(() => activity.exit())
      }
      exec = exec.map(it => {
        if (_.startsWith(it.voice, 'tts')) {
          return {
            type: 'tts',
            text: it.voice.substring(3) + '<silence=1></silence>',
            delay: it.delay * 1000
          }
        }
        return {
          type: 'voice-command',
          text: it.voice,
          delay: it.delay * 1000
        }
      })
      execute(id, exec).catch(err => logger.error('Unexpected error on batch execution.', err))
    }
  }

  activity.on('request', (nlp, action) => {
    var id = _.get(action, 'response.respId')
    var handler = map[nlp.intent]
    if (handler == null) {
      return activity.speak('干蛤').then(() => activity.exit())
    }
    currId = id
    handler(nlp, id)
  })

  activity.on('destroy', () => {
    currId = null
    logger.info('app destroyed')
  })

  var execMap = {
    tts: text => {
      logger.info('executing tts:', text)
      return activity.tts.speak(text)
    },
    'voice-command': text => {
      logger.info('executing voice command:', text)
      return activity.voiceCommand(text)
    }
  }
  function execute (id, executions, idx) {
    if (currId !== id) {
      logger.info('Batch execution has been preempted, skipping.')
      return Promise.resolve()
    }
    activity.preemptTopOfStack()

    if (idx == null) {
      idx = 0
    }
    var exec = executions[idx]
    var handler = execMap[exec.type]
    if (handler == null) {
      return Promise.reject(new Error(`Unknown execution type ${exec.type} at index '${idx}'.`))
    }
    return handler(exec.text)
      .then(() => {
        if (exec.delay) {
          logger.info('delaying', exec.delay)
          return delay(exec.delay)
        }
      })
      .then(() => {
        if (idx < executions.length - 1) {
          logger.info('next step', idx + 1)
          return execute(id, executions, idx + 1)
        }
        /** execution done */
        activity.exit()
      })
  }

  function delay (ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms)
    })
  }
}
