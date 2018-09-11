var logger = require('logger')('keyboard')
var Input = require('@yoda/input')
var config = require('../../keyboard.json')

module.exports = KeyboardHandler
function KeyboardHandler (runtime) {
  this.currentKeyCode = null
  this.firstLongPressTime = null
  this.micMuted = false
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
  this.input.on('keydown', event => {
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
    this.runtime.openUrl(descriptor.url, descriptor.options)
  })

  this.input.on('keyup', event => {
    logger.info(`keyup: ${event.keyCode}, currentKeyCode: ${this.currentKeyCode}`)
    if (this.currentKeyCode !== event.keyCode) {
      logger.info(`Keyup a difference key '${event.keyCode}'.`)
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
        /** mute */
        var muted = !this.micMuted
        this.micMuted = muted
        this.runtime.emit('micMute', muted)
        if (muted) {
          this.runtime.openUrl('yoda-skill://volume/mic_mute_effect', { preemptive: false })
          return
        }
        this.runtime.openUrl('yoda-skill://volume/mic_unmute_effect', { preemptive: false })
      },
      116: () => {
        /** exit all app */
        if (this.runtime.online !== true) {
          // start @network app
          this.runtime.sendNLPToApp('@network', {
            intent: 'into_sleep'
          }, {})
          return
        }
        this.runtime.startApp('ROKID.SYSTEM', { intent: 'ROKID.SYSTEM.EXIT' }, {})
      }
    }

    var handler = map[event.keyCode]
    if (typeof handler !== 'function') {
      logger.info(`No handler registered for keyup '${event.keyCode}'.`)
      return
    }
    handler()
  })

  this.input.on('click', event => {
    logger.info(`click: ${event.keyCode}`)

    var listener = this.listeners[String(event.keyCode)]
    if (listener != null && listener === this.runtime.life.getCurrentAppId()) {
      logger.info(`Delegating click '${event.keyCode}' to app ${listener}.`)
      var app = this.runtime.loader.getAppById(listener)
      app && app.emit('click', event)
    }
  })

  this.input.on('dbclick', event => {
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
        if (this.runtime.waitingForAwake === true) {
          this.runtime.waitingForAwake = false
          this.runtime.startApp('@network', {
            intent: 'system_setup'
          }, {})
        }
      }
    }
    var handler = map[event.keyCode]
    if (handler) {
      logger.info(`No handler registered for dbclick '${event.keyCode}'.`)
      handler()
    }
  })

  this.input.on('longpress', event => {
    if (this.currentKeyCode !== event.keyCode) {
      this.firstLongPressTime = null
      return
    }
    if (this.firstLongPressTime == null) {
      this.firstLongPressTime = event.keyTime
    }
    var timeDelta = event.keyTime - this.firstLongPressTime
    logger.info(`longpress: ${event.keyCode}, time: ${timeDelta}`)

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
    this.runtime.openUrl(descriptor.url, descriptor.options)
  })
}
