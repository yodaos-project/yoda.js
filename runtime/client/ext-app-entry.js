'use strict'

var logger = require('logger')('ext-app-client')

require('@yoda/oh-my-little-pony')

var translate = require('./translator-ipc').translate
var target = process.argv[2]

function getActivityDescriptor (appId) {
  return new Promise((resolve, reject) => {
    process.on('message', onMessage)
    process.send({
      type: 'status-report',
      status: 'initiating',
      appId: appId
    })

    function onMessage (message) {
      if (message.type !== 'descriptor') {
        return
      }
      if (typeof message.result !== 'object') {
        process.removeListener('message', onMessage)
        return reject(new Error('Nil result on message descriptor.'))
      }
      process.removeListener('message', onMessage)
      resolve(message.result)
    }
  })
}

function launchApp (handle, activity) {
  /** start a new clean context */
  handle(activity)
}

function keepAlive (appId) {
  /**
   * FIXME: though there do have listeners on process#message,
   * ShadowNode still exits on end of current context.
   * Yet this process should be kept alive and waiting for life
   * cycle events.
   */
  var timer = setInterval(() => {
    process.send({
      type: 'ping',
      appId: appId
    })
  }, 10 * 60 * 1000)
  process.on('message', message => {
    if (message.type === 'pong') {
      logger.info('Received pong from VuiDaemon, stop pinging.')
      clearInterval(timer)
    }
  })
}

function main () {
  if (!target) {
    logger.error('Target is required.')
    process.exit(-1)
  }
  process.title = `${process.argv[0]} yoda-app ${target}`
  var pkg = require(`${target}/package.json`)
  logger.log(`load target: ${target}/package.json`)

  var main = `${target}/${pkg.main || 'app.js'}`
  var handle = require(main)
  logger.log(`load main: ${main}`)

  var appId = pkg.name

  logger = require('logger')(`entry-${appId}`)
  keepAlive(appId)

  getActivityDescriptor(appId)
    .then(descriptor => {
      var activity = translate(descriptor)
      activity.appHome = target
      launchApp(handle, activity)

      process.send({
        type: 'status-report',
        status: 'ready'
      })
    }).catch(error => {
      process.send({
        type: 'status-report',
        status: 'error',
        error: error.message,
        stack: error.stack
      })
    })
}

module.exports = main
main()

process.once('disconnect', () => {
  logger.info('IPC disconnected, exiting self.')
  process.exit(233)
})
