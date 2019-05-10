'use strict'

var EventEmitter = require('events')
var inherits = require('util').inherits
var childProcess = require('child_process')
var path = require('path')
var logger = require('logger')('ext-app')
var _ = require('@yoda/util')._

var kAppModesTest = require('../constants').AppScheduler.modes.test

var entriesDir = path.join(__dirname, '..', 'client')
var defaultEntry = path.join(entriesDir, 'ext-app-entry.js')
var testEntry = path.join(entriesDir, 'ext-test-entry.js')

module.exports = createExtApp
/**
 *
 * @author Chengzhong Wu <chengzhong.wu@rokid.com>
 * @param {string} appId -
 * @param {string} target - app home directory
 * @param {AppRuntime} runtime -
 */
function createExtApp (appId, metadata, bridge, mode, options) {
  var target = _.get(metadata, 'appHome')
  options = options || {}
  var entry = defaultEntry
  if (mode & kAppModesTest) {
    entry = testEntry
  }

  if (options.descriptorPath == null) {
    options.descriptorPath = path.join(__dirname, '../client/api/default.json')
  }

  var cp = childProcess.fork(entry, [ target, mode ], {
    cwd: target,
    env: Object.assign({}, process.env),
    // rklog would redirect process log to logd if stdout is not a tty
    stdio: [ 'ignore', 'ignore', 'ignore', 'ipc' ]
  })
  bridge.childProcess = cp
  logger.info(`Forked child app ${target}(${cp.pid}).`)
  var send = cp.send
  cp.send = function sendProxy () {
    if (cp.killed) {
      logger.info(`${appId}(${cp.pid}) Child process has been killed, skip sending`)
      return
    }
    send.apply(cp, arguments)
  }

  var eventBus = new EventBus(bridge, cp, appId, options)
  var onMessage = eventBus.onMessage.bind(eventBus)
  var onSuspend = () => {
    logger.info(`${appId}(${cp.pid}) Activity end of life, killing process after 1s.`)
    setTimeout(() => cp.kill(), 1000)
  }
  bridge.onSuspend = onSuspend
  cp.on('message', onMessage)
  cp.once('disconnect', function onDisconnected () {
    logger.info(`${appId}(${cp.pid}) Child process disconnected from VuiDaemon.`)
    cp.kill()
  })
  cp.once('error', function onError (err) {
    logger.error(`${appId}(${cp.pid}) Unexpected error on child process '${target}'`, err.message, err.stack)
    cp.kill(/** SIGKILL */9)
  })
  cp.once('exit', (code, signal) => {
    logger.info(`${appId}(${cp.pid}) exited with code ${code}, signal ${signal}, disconnected? ${!cp.connected}`)
    bridge.exit(code, signal)
    eventBus.emit('status-report:exit')
    eventBus.removeAllListeners()
  })
  eventBus.once('application-not-responding', () => {
    logger.error(`${appId}(${cp.pid}) application not responding`)
    cp.kill(/** SIGKILL */9)
  })

  return new Promise((resolve, reject) => {
    var timer = setTimeout(() => {
      cp.removeListener('message', onMessage)
      cp.kill()
      cleanup()
      reject(new Error(` ExtApp '${target}'(${cp.pid}) failed to be ready in 15s.`))
    }, 15 * 1000)

    eventBus.once('status-report:ready', () => {
      cleanup()
      /** initiate ANR */
      eventBus.alive()
      resolve(bridge)
    })

    eventBus.once('status-report:exit', () => {
      cleanup()
      reject(new Error('App exits on startup'))
    })
    eventBus.once('status-report:error', error => {
      cleanup()
      reject(error)
    })

    function cleanup () {
      clearTimeout(timer)
      /** promise shall not be resolved/rejected multiple times */
      ;['status-report:ready', 'status-report:error', 'status-report:exit'].forEach(e => {
        eventBus.removeAllListeners(e)
      })
    }
  })
}

/**
 *
 * @param {ActivityDescriptor} appBridge
 * @param {childProcess.ChildProcess} socket
 * @param {string} appId
 */
function EventBus (appBridge, socket, appId, options) {
  EventEmitter.call(this)
  this.bridge = appBridge
  this.socket = socket
  this.appId = appId
  this.pid = socket.pid
  this.logger = require('logger')(`bus-${this.pid}`)
  this.options = options
  this.aliveTimer = null

  /**
   * keep records of subscribed events to deduplicate subscription requests.
   */
  this.subscriptionTable = {}

  this.eventSynTable = {}
  this.eventSyn = 0

  // TODO:
  // appBridge.on('internal:network-connected', () => {
  //   this.socket.send({
  //     type: 'internal',
  //     topic: 'network-connected'
  //   })
  // })
}
inherits(EventBus, EventEmitter)

EventBus.prototype.eventTable = [ 'test', 'alive', 'status-report', 'subscribe', 'invoke' ]

EventBus.prototype.onMessage = function onMessage (message) {
  var type = message.type
  if (this.eventTable.indexOf(type) < 0) {
    this.logger.warn(`VuiDaemon received unknown ipc message type '${type}' from app.`)
    return
  }
  if (type !== 'alive') {
    this.logger.debug(`Received child message from ${this.appId}, type: ${type}`)
  }
  this[type](message)
}

EventBus.prototype.test = function onTest () { /** nothing to do with test */ }
EventBus.prototype.alive = function onAlive () {
  clearTimeout(this.aliveTimer)
  this.aliveTimer = setTimeout(() => {
    this.emit('application-not-responding')
  }, /** 3 times not received */15 * 1000)
}

EventBus.prototype['status-report'] = function onStatusReport (message) {
  this.logger.debug(`Received child ${this.appId} status report: ${message.status}`)
  switch (message.status) {
    case 'initiating': {
      this.socket.send({
        type: 'descriptor',
        result: _.get(this.options, 'descriptorPath')
      })
      break
    }
    case 'ready': {
      this.emit('status-report:ready')
      break
    }
    case 'error': {
      this.emit('status-report:error', new Error(message.error))
      break
    }
    default: {
      this.logger.info(`Unknown status report type '${message.status}'.`)
    }
  }
}

EventBus.prototype.subscribe = function onSubscribe (message) {
  var self = this
  var event = message.event
  var namespace = message.namespace
  this.bridge.subscribe(namespace, event, function OnEvent () {
    if (!self.socket.connected) {
      throw new Error('Child process disconnected')
    }
    self.socket.send({
      type: 'event',
      namespace: namespace,
      event: event,
      params: Array.prototype.slice.call(arguments, 0)
    })
  })
}

EventBus.prototype.invoke = function onInvoke (message) {
  var invocationId = message.invocationId
  var namespace = message.namespace
  var method = message.method
  var params = message.params
  this.logger.debug(`Received child invocation(${invocationId}) ${namespace || 'activity'}.${method}`)
  this.bridge.invoke(namespace, method, params)
    .then(
      res => this.socket.send({
        type: 'invoke',
        action: 'resolve',
        invocationId: invocationId,
        result: res
      }),
      err => this.socket.send({
        type: 'invoke',
        action: 'reject',
        invocationId: invocationId,
        error: Object.assign({}, err, _.pick(err, 'name', 'message', 'stack'))
      })
    )
}
