var logger = require('logger')('keyboard')
var Input = require('@yoda/input')
var config = require('../../keyboard.json')
var wifi = require('@yoda/wifi')

module.exports = KeyboardHandler
function KeyboardHandler (runtime) {
  this.currentKeyCode = null
  this.firstLongPressTime = null
  this.preventSubsequent = false
  this.runtime = runtime

  this.listeners = {}
}

KeyboardHandler.prototype.init = function init () {
  this.input = Input()
  this.listen()
}

KeyboardHandler.prototype.destruct = function destruct () {
  this.input.disconnect()
}

KeyboardHandler.prototype.listen = function listen () {
  this.input.on('keydown', listenerWrap(event => {
    this.currentKeyCode = event.keyCode
    logger.info(`keydown: ${event.keyCode}`)

    var listener = this.listeners[String(event.keyCode)]
    if (listener != null && listener === this.runtime.life.getCurrentAppId()) {
      logger.info(`Delegating keydown '${event.keyCode}' to app ${listener}.`)
      var app = this.runtime.loader.getAppById(listener)
      app && app.emit('keydown', event)
      return
    }

    var map = config.keydown
    var descriptor = map[String(event.keyCode)]
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for keydown '${event.keyCode}'.`)
      return
    }
    this.openUrl(descriptor.url, descriptor.options)
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

    var listener = this.listeners[String(event.keyCode)]
    if (listener != null && listener === this.runtime.life.getCurrentAppId()) {
      logger.info(`Delegating keyup '${event.keyCode}' to app ${listener}.`)
      var app = this.runtime.loader.getAppById(listener)
      app && app.emit('keyup', event)
      return
    }

    /** Click Events */
    var map = {
      113: () => {
        this.runtime.setMicMute(/** switch microphone state */)
      },
      116: () => {
        if (this.runtime.online !== true) {
          // start @network app
          this.runtime.sendNLPToApp('@network', {
            intent: 'into_sleep'
          }, {})
          return
        }
        if (this.runtime.life.getCurrentAppId()) {
          /** exit all app */
          this.runtime.startApp('ROKID.SYSTEM', { intent: 'ROKID.SYSTEM.EXIT' }, {})
          return
        }
        this.runtime.setPickup(true)
      }
    }

    var handler = map[event.keyCode]
    if (typeof handler !== 'function') {
      logger.info(`No handler registered for keyup '${event.keyCode}'.`)
      return
    }
    handler()
  }))

  this.input.on('click', listenerWrap(event => {
    logger.info(`click: ${event.keyCode}`)

    var listener = this.listeners[String(event.keyCode)]
    if (listener != null && listener === this.runtime.life.getCurrentAppId()) {
      logger.info(`Delegating click '${event.keyCode}' to app ${listener}.`)
      var app = this.runtime.loader.getAppById(listener)
      app && app.emit('click', event)
    }
  }))

  this.input.on('dbclick', listenerWrap(event => {
    logger.info(`double click: ${event.keyCode}, currentKeyCode: ${this.currentKeyCode}`)

    var listener = this.listeners[String(event.keyCode)]
    if (listener != null && listener === this.runtime.life.getCurrentAppId()) {
      logger.info(`Delegating dbclick '${event.keyCode}' to app ${listener}.`)
      var app = this.runtime.loader.getAppById(listener)
      app && app.emit('dbclick', event)
      return
    }

    var map = {
      116: () => {
        // user manually clear WIFI
        wifi.disableAll()
        logger.log('user manually clear WIFI')
        this.runtime.waitingForAwake = undefined // for identify startup
        this.runtime.online = undefined
        this.runtime.login = undefined
        this.runtime.startApp('@network', {
          intent: 'system_setup'
        }, {})
      }
    }
    var handler = map[event.keyCode]
    if (handler) {
      logger.info(`No handler registered for dbclick '${event.keyCode}'.`)
      handler()
    }
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

    var listener = this.listeners[String(event.keyCode)]
    if (listener != null && listener === this.runtime.life.getCurrentAppId()) {
      logger.info(`Delegating longpress '${event.keyCode}' to app ${listener}.`)
      var app = this.runtime.loader.getAppById(listener)
      app && app.emit('longpress', event)
      return
    }

    var map = config.longpress
    var descriptor = map[String(event.keyCode)]
    if (typeof descriptor !== 'object') {
      logger.info(`No handler registered for longpress '${event.keyCode}'.`)
      return
    }
    if (!descriptor.repeat && timeDelta > descriptor.timeDelta) {
      logger.info(`Handler is not repetitive for key longpress '${event.keyCode}'.`)
      return
    }
    if (timeDelta < descriptor.timeDelta) {
      logger.info(`Time delta is not ready for key longpress '${event.keyCode}'.`)
      return
    }
    if (descriptor.preventSubsequent) {
      this.preventSubsequent = true
    }
    this.openUrl(descriptor.url, descriptor.options)
  }))
}

KeyboardHandler.prototype.openUrl = function openUrl (url, options) {
  this.runtime.openUrl(url, options)
    .catch(err => {
      logger.error(`Unexpected error on opening url '${url}'`, err && err.message, err && err.stack)
    })
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
