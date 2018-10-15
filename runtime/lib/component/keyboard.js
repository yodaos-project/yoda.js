var logger = require('logger')('keyboard')
var Input = require('@yoda/input')
var _ = require('@yoda/util')._

var config = require('../../keyboard.json')

module.exports = KeyboardHandler
function KeyboardHandler (runtime) {
  this.currentKeyCode = null
  this.firstLongPressTime = null
  this.preventSubsequent = false
  this.runtime = runtime
  this.config = config

  this.longpressWindow = _.get(this.config, 'config.longpressWindow', 500)
  this.debounce = _.get(this.config, 'config.debounce', 0)

  this.listeners = {
    keydown: {},
    keyup: {},
    click: {},
    dbclick: {},
    longpress: {}
  }
}

KeyboardHandler.prototype.init = function init () {
  this.input = Input(_.get(this.config, 'config', {}))
  this.listen()
}

KeyboardHandler.prototype.destruct = function destruct () {
  this.input.disconnect()
}

KeyboardHandler.prototype.execute = function execute (descriptor) {
  if (descriptor.url) {
    if (typeof descriptor.url !== 'string') {
      logger.error('Malformed descriptor, url is not a string.', descriptor)
      return
    }
    var options = _.get(descriptor, 'options', {})
    if (typeof options !== 'object') {
      logger.error('Malformed descriptor, options is not an object.', descriptor)
      return
    }
    return this.runtime.openUrl(descriptor.url, options)
      .catch(err => {
        logger.error(`Unexpected error on opening url '${descriptor.url}'`, err && err.message, err && err.stack)
      })
  }
  if (descriptor.runtimeMethod) {
    var method = this.runtime[descriptor.runtimeMethod]
    var params = _.get(descriptor, 'params', [])
    if (typeof method !== 'function') {
      logger.error('Malformed descriptor, runtime method not found.', descriptor)
      return
    }
    if (!Array.isArray(params)) {
      logger.error('Malformed descriptor, params is not an array.', descriptor)
      return
    }

    return method.apply(this.runtime, params)
  }
  logger.error('Unknown descriptor', descriptor)
}

KeyboardHandler.prototype.handleAppListener = function handleAppListener (type, event) {
  var listener = _.get(this.listeners, `${type}.${event.keyCode}`)
  if (listener != null && listener === this.runtime.life.getCurrentAppId()) {
    var app = this.runtime.loader.getAppById(listener)
    if (app) {
      logger.info(`Delegating ${type} '${event.keyCode}' to app ${listener}.`)
      app.keyboard.emit(type, event)
      return true
    }
    logger.info(`App ${listener} is not active, skip ${type} '${event.keyCode}' delegation.`)
  }
  return false
}

KeyboardHandler.prototype.listen = function listen () {
  this.input.on('keydown', listenerWrap(event => {
    this.currentKeyCode = event.keyCode
    logger.info(`keydown: ${event.keyCode}`)
    if (this.firstLongPressTime == null) {
      this.firstLongPressTime = event.keyTime
    }

    if (this.handleAppListener('keydown', event)) {
      logger.info(`Delegated keydown to app.`)
      return
    }

    var descriptor = _.get(this.config, `${event.keyCode}.keydown`)
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for keydown '${event.keyCode}'.`)
      return
    }
    var debounce = _.get(descriptor, 'debounce', this.debounce)
    if (debounce) {
      if (descriptor.guard) {
        logger.info(`discarding event keydown ${event.keyCode}`)
        return
      }
      descriptor.guard = true
      setTimeout(() => {
        descriptor.guard = false
      }, debounce)
    }
    return this.execute(descriptor)
  }))

  this.input.on('keyup', listenerWrap(event => {
    logger.info(`keyup: ${event.keyCode}, currentKeyCode: ${this.currentKeyCode}`)
    if (this.currentKeyCode !== event.keyCode) {
      logger.info(`Keyup a difference key '${event.keyCode}'.`)
      return
    }

    if (this.firstLongPressTime != null) {
      this.firstLongPressTime = null
      logger.info(`Keyup a long pressed key '${event.keyCode}'.`)
    }

    if (this.preventSubsequent) {
      this.preventSubsequent = false
      logger.info(`Event keyup prevented '${event.keyCode}'.`)
      return
    }
    if (this.handleAppListener('keyup', event)) {
      logger.info(`Delegated keyup to app.`)
      return
    }

    var descriptor = _.get(this.config, `${event.keyCode}.keyup`)
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for keyup '${event.keyCode}'.`)
      return
    }
    var debounce = _.get(descriptor, 'debounce', this.debounce)
    if (debounce) {
      if (descriptor.guard) {
        logger.info(`discarding event keyup ${event.keyCode}`)
        return
      }
      descriptor.guard = true
      setTimeout(() => {
        descriptor.guard = false
      }, debounce)
    }
    return this.execute(descriptor)
  }))

  this.input.on('click', listenerWrap(event => {
    logger.info(`click: ${event.keyCode}`)

    if (this.handleAppListener('click', event)) {
      logger.info(`Delegated click to app.`)
      return
    }

    var descriptor = _.get(this.config, `${event.keyCode}.click`)
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for click '${event.keyCode}'.`)
      return
    }
    var debounce = _.get(descriptor, 'debounce', this.debounce)
    if (debounce) {
      if (descriptor.guard) {
        logger.info(`discarding event click ${event.keyCode}`)
        return
      }
      descriptor.guard = true
      setTimeout(() => {
        descriptor.guard = false
      }, debounce)
    }
    return this.execute(descriptor)
  }))

  this.input.on('dbclick', listenerWrap(event => {
    logger.info(`dbclick: ${event.keyCode}, currentKeyCode: ${this.currentKeyCode}`)

    if (this.handleAppListener('dbclick', event)) {
      logger.info(`Delegated dbclick to app.`)
      return
    }

    var descriptor = _.get(this.config, `${event.keyCode}.dbclick`)
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for dbclick '${event.keyCode}'.`)
      return
    }
    var debounce = _.get(descriptor, 'debounce', this.debounce)
    if (debounce) {
      if (descriptor.guard) {
        logger.info(`discarding event dbclick ${event.keyCode}`)
        return
      }
      descriptor.guard = true
      setTimeout(() => {
        descriptor.guard = false
      }, debounce)
    }
    return this.execute(descriptor)
  }))

  this.input.on('longpress', listenerWrap(event => {
    if (this.currentKeyCode !== event.keyCode) {
      this.firstLongPressTime = null
      return
    }
    var timeDelta = event.keyTime - this.firstLongPressTime
    timeDelta = Math.round(timeDelta / this.longpressWindow) * this.longpressWindow
    logger.info(`longpress: ${event.keyCode}, time: ${timeDelta}`)

    if (this.preventSubsequent) {
      logger.info(`Event longpress prevented '${event.keyCode}'.`)
      return
    }

    if (this.handleAppListener('longpress', event)) {
      logger.info(`Delegated longpress to app.`)
      return
    }

    var descriptor = _.get(this.config, `${event.keyCode}.longpress`)
    if (descriptor == null) {
      descriptor = _.get(this.config, `${event.keyCode}.longpress-${timeDelta}`)
    }
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for longpress '${event.keyCode}'.`)
      return
    }
    var expectedTimeDelta = _.get(descriptor, 'timeDelta', 0)
    if (!descriptor.repeat && timeDelta > expectedTimeDelta) {
      logger.info(`Handler is not repetitive for key longpress '${event.keyCode}'.`)
      return
    }
    if (timeDelta < expectedTimeDelta) {
      logger.info(`Time delta is not ready for key longpress '${event.keyCode}'.`)
      return
    }
    if (descriptor.preventSubsequent) {
      this.preventSubsequent = true
    }
    return this.execute(descriptor)
  }))
}

KeyboardHandler.prototype.preventKeyDefaults = function preventKeyDefaults (appId, keyCode, event) {
  var key = String(keyCode)
  var events = Object.keys(this.listeners)
  if (event != null && events.indexOf(event) >= 0) {
    events = [ event ]
  }
  events.forEach(it => {
    this.listeners[it][key] = appId
  })
  return Promise.resolve()
}

KeyboardHandler.prototype.restoreKeyDefaults = function restoreKeyDefaults (appId, keyCode, event) {
  var key = String(keyCode)
  var events = Object.keys(this.listeners)
  if (event != null && events.indexOf(event) >= 0) {
    events = [ event ]
  }
  events.forEach(it => {
    if (this.listeners[it][key] === appId) {
      this.listeners[it][key] = null
    }
  })
  return Promise.resolve()
}

function listenerWrap (fn, receiver) {
  return function () {
    try {
      fn.apply(receiver, arguments)
    } catch (err) {
      logger.error('Unexpected error on handling key events', err && err.message, err && err.stack)
    }
  }
}
