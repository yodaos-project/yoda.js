var _ = require('@yoda/util')._
var logger = require('logger')('comp-de-voix')

module.exports = function compositionDeVoix (activity) {
  var currId
  var fastResolveId

  var map = {
    execute_batch: (nlp, id) => {
      var execJson = _.get(nlp, 'slots.executions.value')
      var exec
      try {
        exec = JSON.parse(execJson)
      } catch (err) {
        activity.tts.speak('你想干蛤').then(() => activity.exit())
      }
      exec = exec.map(it => ({
        type: 'voice-command',
        text: it.voice,
        delay: it.delay * 1000
      }))
      execute(id, exec).catch(err => logger.error(`Unexpected error on batch execution(${id}).`, err))
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

  activity.on('active', userData => {
    var reason = _.get(userData, 'reason')
    if (reason !== 'carrier') {
      logger.info('doesn\'t activated for carrier, nothing to do.')
    }
    fastResolveDelay()
  })

  var execMap = {
    'voice-command': text => {
      return activity.voiceCommand(text, { isTriggered: true })
    }
  }
  function execute (id, executions, idx) {
    if (currId !== id) {
      logger.info(`Batch execution(${id}) has been preempted, skipping.`)
      return Promise.resolve()
    }
    fastResolveId = null
    return activity.setForeground()
      .then(() => {
        if (idx == null) {
          idx = 0
        }
        var exec = executions[idx]
        var handler = execMap[exec.type]
        if (handler == null) {
          return Promise.reject(new Error(`Unknown execution(${id}) type ${exec.type} at index '${idx}'.`))
        }
        logger.info(`executing execution(${id}) ${exec.type}(${exec.text})`)
        return handler(exec.text)
          .then(() => {
            var timeout = exec.delay
            if (timeout === 0) {
              fastResolveId = id
              timeout = 5000
            }
            logger.info(`delaying execution(${id}) ${timeout}ms, actual setting ${exec.delay}ms`)
            return delay(timeout)
          })
          .then(() => {
            if (idx < executions.length - 1) {
              logger.info(`execution(${id}) next step`, idx + 1)
              return execute(id, executions, idx + 1)
            }
            /** execution done */
            activity.exit()
          })
      })
  }

  var timer
  var resolver
  var rejector
  function delay (ms) {
    if (rejector) {
      rejector(new Error('delay canceled'))
    }
    return new Promise((resolve, reject) => {
      resolver = resolve
      rejector = reject
      timer = setTimeout(() => {
        timer = undefined
        resolver = undefined
        resolve()
      }, ms)
    })
  }

  function fastResolveDelay () {
    if (timer == null) {
      logger.info('no timer found, skipping fast resolving.')
      return
    }
    if (fastResolveId !== currId) {
      logger.info('fast resolve id not match, skipping fast resolving.')
      return
    }
    logger.info('fast resolving, continue work queue.')
    clearTimeout(timer)
    resolver()
    timer = undefined
    resolver = undefined
    rejector = undefined
  }
}
