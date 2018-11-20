'use strict'

var EventEmitter = require('events')
var inherits = require('util').inherits
var childProcess = require('child_process')
var path = require('path')
var logger = require('logger')('ext-app')
var _ = require('@yoda/util')._
var ActivityDescriptor = require('./activity-descriptor').ActivityDescriptor

var entry = path.join(__dirname, '..', '..', 'client', 'ext-app-entry.js')

module.exports = createExtApp
/**
 *
 * @author Chengzhong Wu <chengzhong.wu@rokid.com>
 * @param {string} appId -
 * @param {string} target - app home directory
 * @param {AppRuntime} runtime -
 */
function createExtApp (appId, metadata, runtime) {
  var target = _.get(metadata, 'appHome')
  var descriptor = new ActivityDescriptor(appId, target, runtime)

  var cp = childProcess.fork(entry, [ target ], {
    cwd: target,
    env: Object.assign({}, process.env),
    stdio: 'inherit'
  })
  descriptor._childProcess = cp
  logger.info(`Forked child app ${target}(${cp.pid}).`)
  var send = cp.send
  cp.send = function sendProxy () {
    if (cp.killed) {
      logger.info(`${appId}(${cp.pid}) Child process has been killed, skip sending`)
      return
    }
    send.apply(cp, arguments)
  }

  var eventBus = new EventBus(descriptor, cp, appId)
  var onMessage = eventBus.onMessage.bind(eventBus)
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
    descriptor.emit('exit', code, signal)
    eventBus.removeAllListeners()
  })
  descriptor.once('destruct', () => {
    logger.info(`${appId}(${cp.pid}) Activity end of life, killing process.`)
    cp.kill()
  })
  eventBus.once('application-not-responding', () => {
    logger.error(`${appId}(${cp.pid}) application not responding`)
    cp.kill(/** SIGKILL */9)
  })

  return new Promise((resolve, reject) => {
    var timer = setTimeout(() => {
      cp.removeListener('message', onMessage)
      cp.kill()
      reject(new Error(` ExtApp '${target}'(${cp.pid}) failed to be ready in 5s.`))
      /** promise shall not be resolved/rejected multiple times */
      eventBus.removeAllListeners('status-report:error')
      eventBus.removeAllListeners('status-report:ready')
    }, 5000)

    eventBus.once('status-report:ready', () => {
      clearTimeout(timer)
      /** promise shall not be resolved/rejected multiple times */
      eventBus.removeAllListeners('status-report:error')
      /** initiate ping-pong */
      eventBus.ping()
      resolve(descriptor)
    })
    eventBus.once('status-report:error', error => {
      clearTimeout(timer)
      /** promise shall not be resolved/rejected multiple times */
      eventBus.removeAllListeners('status-report:ready')
      reject(error)
    })
  })
}

/**
 *
 * @param {ActivityDescriptor} descriptor
 * @param {childProcess.ChildProcess} socket
 * @param {string} appId
 */
function EventBus (descriptor, socket, appId, pid) {
  EventEmitter.call(this)
  this.descriptor = descriptor
  this.socket = socket
  this.appId = appId
  this.pid = socket.pid
  this.logger = require('logger')(`bus-${this.pid}`)
  this.pingTimer = null

  /**
   * keep records of subscribed events to deduplicate subscription requests.
   */
  this.subscriptionTable = {}

  this.eventSynTable = {}
  this.eventSyn = 0
}
inherits(EventBus, EventEmitter)

EventBus.prototype.eventTable = [ 'test', 'ping', 'status-report', 'subscribe', 'invoke',
  'subscribe-ack', 'event-ack' ]

EventBus.prototype.onMessage = function onMessage (message) {
  var type = message.type
  if (this.eventTable.indexOf(type) < 0) {
    this.logger.warn(`VuiDaemon received unknown ipc message type '${type}' from app.`)
    return
  }
  if (type !== 'ping') {
    this.logger.debug(`Received child message from ${this.appId}, type: ${type}`)
  }
  this[type](message)
}

EventBus.prototype.test = function onTest () { /** nothing to do with test */ }
EventBus.prototype.ping = function onPing () {
  clearTimeout(this.pingTimer)
  this.pingTimer = setTimeout(() => {
    this.emit('application-not-responding')
  }, /** 3 times not received */15 * 1000)
}

EventBus.prototype['status-report'] = function onStatusReport (message) {
  this.logger.debug(`Received child ${this.appId} status report: ${message.status}`)
  switch (message.status) {
    case 'initiating': {
      this.socket.send({
        type: 'descriptor',
        result: this.descriptor
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

  var eventStr = `Activity.${namespace ? namespace + '.' : ''}${event}`
  this.logger.debug(`Received child ${this.appId} subscription: ${eventStr}`)
  if (this.subscriptionTable[eventStr]) {
    this.logger.debug(`Event '${eventStr}' has already been subscribed, skipping.`)
    return
  }
  this.subscriptionTable[eventStr] = true

  var nsObj = this.descriptor
  if (namespace != null) {
    nsObj = nsObj[namespace]
  }
  nsObj.on(message.event, onEvent)

  function onEvent () {
    if (!self.socket.connected) {
      throw new Error('Child process disconnected')
    }
    self.socket.send({
      type: 'event',
      namespace: namespace,
      event: event,
      params: Array.prototype.slice.call(arguments, 0)
    })
  }
}

EventBus.prototype.invoke = function onInvoke (message) {
  var invocationId = message.invocationId
  var namespace = message.namespace
  var method = message.method
  var params = message.params

  var methodStr = `Activity.${namespace ? namespace + '.' : ''}${method}`
  this.logger.debug(`Received child ${this.appId} invocation(${invocationId}): ${methodStr}`)

  var nsObj = this.descriptor
  if (namespace != null) {
    nsObj = nsObj[namespace]
  }
  var fnDescriptor = nsObj[method]
  if (fnDescriptor == null &&
      fnDescriptor.type !== 'method') {
    return this.socket.send({
      type: 'fatal-error',
      message: `Unknown method '${methodStr}' invoked.`
    })
  }

  // TODO: returns type handler, currently only 'promise' is supported.
  if (fnDescriptor.returns !== 'promise') {
    throw new Error(`Not implemented return type '${fnDescriptor.returns}' for method '${methodStr}'`)
  }
  var fn = fnDescriptor.fn
  fn.apply(nsObj, params)
    .then(result => this.socket.send({
      type: 'promise',
      action: 'resolve',
      invocationId: invocationId,
      result: result
    }), err => this.socket.send({
      type: 'promise',
      action: 'reject',
      invocationId: invocationId,
      error: err.message,
      stack: err.stack
    }))
}

EventBus.prototype['subscribe-ack'] = function onSubscribeAck (message) {
  var self = this
  var event = message.event
  var namespace = message.namespace

  var eventStr = `Activity.${namespace ? namespace + '.' : ''}${event}`
  this.logger.debug(`Received child ${this.appId} ack-subscription: ${eventStr}`)

  if (this.subscriptionTable[eventStr]) {
    this.logger.debug(`Event '${eventStr}' has already been subscribed, skipping.`)
    return
  }
  this.subscriptionTable[eventStr] = true

  var nsObj = this.descriptor
  if (namespace != null) {
    nsObj = nsObj[namespace]
  }
  var eventDescriptor = nsObj[event]
  if (eventDescriptor.type !== 'event-ack') {
    return self.socket.send({
      type: 'fatal-error',
      message: `Subscribed non event-ack descriptor '${event}'.`
    })
  }

  if (nsObj[eventDescriptor.trigger]) {
    return self.socket.send({
      type: 'fatal-error',
      message: `Double subscription on event-ack descriptor '${event}'.`
    })
  }
  var timeout = eventDescriptor.timeout || 1000
  nsObj[eventDescriptor.trigger] = function onEventTrigger () {
    if (!self.socket.connected) {
      throw new Error('Child process disconnected')
    }

    var eventId = self.eventSyn
    self.eventSyn += 1
    self.socket.send({
      type: 'event-syn',
      event: event,
      eventId: eventId,
      params: Array.prototype.slice.call(arguments, 0)
    })
    return new Promise((resolve, reject) => {
      var timer = setTimeout(
        () => {
          this.logger.info('onEventTrigger timedout', eventId)
          delete self.eventSynTable[eventId]
          reject(new Error(`EventAck '${event}' timed out for ${timeout}`))
        },
        timeout)
      self.eventSynTable[eventId] = function onAck () {
        self.logger.info('onEventTrigger resolved', eventId)
        clearTimeout(timer)
        resolve()
      }
    })
  }
}

EventBus.prototype['event-ack'] = function onEventAck (message) {
  var namespace = message.namespace
  var event = message.event
  var eventId = message.eventId

  var eventStr = `Activity.${namespace ? namespace + '.' : ''}${event}.${eventId}`

  var callback = this.eventSynTable[eventId]
  if (callback == null) {
    this.logger.info(`Unregistered or timed out event-ack for event '${eventStr}'`)
    return
  }
  this.logger.info(`Callback event-ack for event '${eventStr}'`)
  callback(message)
}
