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

  this.listeners = {
    click: {},
    dbclick: {},
    longpress: {}
  }
}

KeyboardHandler.prototype.init = function init () {
  this.input = Input()
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

KeyboardHandler.prototype.listen = function listen () {
  this.input.on('keydown', listenerWrap(event => {
    this.currentKeyCode = event.keyCode
    logger.info(`keydown: ${event.keyCode}`)

    var descriptor = _.get(this.config, `${event.keyCode}.keydown`)
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for keydown '${event.keyCode}'.`)
      return
    }
    this.execute(descriptor)
  }))

  this.input.on('keyup', listenerWrap(event => {
    logger.info(`keyup: ${event.keyCode}, currentKeyCode: ${this.currentKeyCode}`)
    if (this.currentKeyCode !== event.keyCode) {
      logger.info(`Keyup a difference key '${event.keyCode}'.`)
      return
    }
    if (this.preventSubsequent) {
      this.preventSubsequent = false
      logger.info(`Event keyup prevented '${event.keyCode}'.`)
      return
    }
    if (this.firstLongPressTime != null) {
      this.firstLongPressTime = null
      logger.info(`Keyup a long pressed key '${event.keyCode}'.`)
    }

    var descriptor = _.get(this.config, `${event.keyCode}.keyup`)
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for keyup '${event.keyCode}'.`)
      return
    }
    this.execute(descriptor)
  }))

  this.input.on('click', listenerWrap(event => {
    logger.info(`click: ${event.keyCode}`)

    var listener = this.listeners.click[String(event.keyCode)]
    if (listener != null && listener === this.runtime.life.getCurrentAppId()) {
      var app = this.runtime.loader.getAppById(listener)
      if (app) {
        logger.info(`Delegating click '${event.keyCode}' to app ${listener}.`)
        app.keyboard.emit('click', event)
        return
      }
      logger.info(`App ${listener} is not active, skip click '${event.keyCode}' delegation.`)
    }

    var descriptor = _.get(this.config, `${event.keyCode}.click`)
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for click '${event.keyCode}'.`)
      return
    }
    this.execute(descriptor)
  }))

  this.input.on('dbclick', listenerWrap(event => {
    logger.info(`dbclick: ${event.keyCode}, currentKeyCode: ${this.currentKeyCode}`)

    var listener = this.listeners.dbclick[String(event.keyCode)]
    if (listener != null && listener === this.runtime.life.getCurrentAppId()) {
      var app = this.runtime.loader.getAppById(listener)
      if (app) {
        logger.info(`Delegating dbclick '${event.keyCode}' to app ${listener}.`)
        app.keyboard.emit('dbclick', event)
        return
      }
      logger.info(`App ${listener} is not active, skip dbclick '${event.keyCode}' delegation.`)
    }

    var descriptor = _.get(this.config, `${event.keyCode}.dbclick`)
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for dbclick '${event.keyCode}'.`)
      return
    }
    this.execute(descriptor)
  }))

  this.input.on('longpress', listenerWrap(event => {
    if (this.currentKeyCode !== event.keyCode) {
      this.firstLongPressTime = null
      return
    }
    if (this.firstLongPressTime == null) {
      this.firstLongPressTime = event.keyTime
    }
    var timeDelta = event.keyTime - this.firstLongPressTime
    logger.info(`longpress: ${event.keyCode}, time: ${timeDelta}`)

    if (this.preventSubsequent) {
      logger.info(`Event longpress prevented '${event.keyCode}'.`)
      return
    }

    var listener = this.listeners.longpress[String(event.keyCode)]
    if (listener != null && listener === this.runtime.life.getCurrentAppId()) {
      var app = this.runtime.loader.getAppById(listener)
      if (app) {
        logger.info(`Delegating longpress '${event.keyCode}' to app ${listener}.`)
        this.preventSubsequent = true
        app.keyboard.emit('longpress', event)
        return
      }
      logger.info(`App ${listener} is not active, skip longpress '${event.keyCode}' delegation.`)
    }

    var descriptor = _.get(this.config, `${event.keyCode}.longpress`)
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
    this.execute(descriptor)
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
