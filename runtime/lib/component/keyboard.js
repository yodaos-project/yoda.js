var logger = require('logger')('keyboard')
var Input = require('@yoda/input')
var _ = require('@yoda/util')._

var config = require('/etc/yoda/keyboard.json')

module.exports = KeyboardHandler
function KeyboardHandler (runtime) {
  this.currentKeyCode = null
  this.firstLongPressTime = null
  this.preventSubsequent = false
  this.runtime = runtime
  this.component = runtime.component
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

KeyboardHandler.prototype.deinit = function deinit () {
  this.input && this.input.disconnect()
  this.input = null
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
  var target
  var method
  var params
  if (descriptor.runtimeMethod) {
    target = this.runtime
    method = this.runtime[descriptor.runtimeMethod]
    params = _.get(descriptor, 'params', [])
  } else if (typeof descriptor.componentMethod === 'string') {
    var match = descriptor.componentMethod.split('.', 2)
    logger.info('match', match)
    var componentName = match[0]
    var methodName = match[1]
    target = this.component[componentName]
    if (target == null) {
      logger.error('Malformed descriptor, component not found.', descriptor)
      return
    }
    method = target[methodName]
    params = _.get(descriptor, 'params', [])
  }

  if (target == null) {
    logger.error('Unknown descriptor', descriptor)
    return
  }
  if (typeof method !== 'function') {
    logger.error('Malformed descriptor, method not found', descriptor)
    return
  }
  if (!Array.isArray(params)) {
    logger.error('Malformed descriptor, params is not an array.', descriptor)
    return
  }
  return method.apply(target, params)
}

KeyboardHandler.prototype.handleAppListener = function handleAppListener (type, event) {
  var listener = _.get(this.listeners, `${type}.${event.keyCode}`)
  if (listener == null) {
    logger.info(`No app registered for ${type}.${event.keyCode}, skipping`)
    return false
  }
  var app = this.component.appScheduler.getAppById(listener)
  if (listener !== this.component.lifetime.getCurrentAppId() || app == null) {
    logger.info(`App ${listener} is not active, skip ${type} '${event.keyCode}' delegation.`)
    return false
  }
  logger.info(`Delegating ${type} '${event.keyCode}' to app ${listener}.`)
  app.keyboard.emit(type, event)
  return true
}

KeyboardHandler.prototype.listen = function listen () {
  this.input.on('keydown', this.listenerWrap('keydown', this.onKeydown))
  this.input.on('keyup', this.listenerWrap('keyup', this.onKeyup))
  this.input.on('longpress', this.listenerWrap('longpress', this.onLongpress))

  ;['click', 'dbclick', 'slide-clockwise', 'slide-counter-clockwise'].forEach(gesture => {
    this.input.on(gesture, this.listenerWrap(gesture, this.onGesture, [ gesture ]))
  })
}

KeyboardHandler.prototype.onKeydown = function onKeydown (event) {
  this.currentKeyCode = event.keyCode
  logger.info(`keydown: ${event.keyCode}, keyTime: ${event.keyTime}`)
  this.firstLongPressTime = event.keyTime

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
}

KeyboardHandler.prototype.onKeyup = function onKeyup (event) {
  logger.info(`keyup: ${event.keyCode}, currentKeyCode: ${this.currentKeyCode}, keyTime: ${event.keyTime}`)
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
}

KeyboardHandler.prototype.onLongpress = function onLongpress (event) {
  if (this.currentKeyCode !== event.keyCode) {
    this.firstLongPressTime = null
    return
  }
  var timeDelta = event.keyTime - this.firstLongPressTime
  timeDelta = Math.round(timeDelta / this.longpressWindow) * this.longpressWindow
  logger.info(`longpress: ${event.keyCode}, keyTime: ${event.keyTime}, timeDelta: ${timeDelta}, rounded time delta: ${timeDelta}`)

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
}

KeyboardHandler.prototype.onSlide = function onSlide (event) {
  logger.info(`slide: ${event.orientation}, keyTime: ${event.keyTime}, currentKeyCode: ${this.currentKeyCode}`)

  if (this.handleAppListener('slide', event)) {
    logger.info(`Delegated slide to app.`)
    return
  }

  var descriptor = _.get(this.config, `${event.keyCode}.slide`)
  if (typeof descriptor !== 'object') {
    logger.info(`No handler registered for slide'${event.keyCode}'.`)
    return
  }
  if (descriptor == null) {
    descriptor = _.get(this.config, `${event.keyCode}.slide-${event.orientation}`)
  }
  var debounce = _.get(descriptor, 'debounce', this.debounce)
  if (debounce) {
    if (descriptor.guard) {
      logger.info(`discarding slide ${event.keyCode}`)
      return
    }
    descriptor.guard = true
    setTimeout(() => {
      descriptor.guard = false
    }, debounce)
  }
  return this.execute(descriptor)
}

KeyboardHandler.prototype.onGesture = function onGesture (gesture, event) {
  logger.info(`gesture(${gesture}): ${event.keyCode}, keyTime: ${event.keyTime}, currentKeyCode: ${this.currentKeyCode}`)

  if (this.handleAppListener(gesture, event)) {
    logger.info(`Delegated gesture(${gesture}) to app.`)
    return
  }

  var descriptor = _.get(this.config, `${event.keyCode}.${gesture}`)
  if (typeof descriptor !== 'object') {
    descriptor = _.get(this.config, `fallbacks.${gesture}`)
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for gesture(${gesture}) '${event.keyCode}'.`)
      return
    }
    logger.info(`Using fallback handler for gesture(${gesture}) '${event.keyCode}'.`)
  }
  var debounce = _.get(descriptor, 'debounce', this.debounce)
  if (debounce) {
    if (descriptor.guard) {
      logger.info(`discarding gesture(${gesture}) ${event.keyCode}`)
      return
    }
    descriptor.guard = true
    setTimeout(() => {
      descriptor.guard = false
    }, debounce)
  }
  return this.execute(descriptor)
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

KeyboardHandler.prototype.listenerWrap = function listenerWrap (eventName, fn, args) {
  var self = this
  return function (event) {
    var fnArgs = arguments
    self.component.dispatcher.delegate('keyboardWillRespond', [ event.keyCode, eventName ])
      .then(delegation => {
        if (delegation) {
          return
        }
        try {
          fn.apply(self, (args || []).concat(Array.prototype.slice.call(fnArgs, 0)))
        } catch (err) {
          logger.error('Unexpected error on handling key events', err && err.message, err && err.stack)
        }
      })
  }
}
