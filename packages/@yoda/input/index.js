'use strict'

/**
 * @module @yoda/input
 * @description Input events handler. On YodaOS, every input events
 * are treated as an event and handled by InputEvent. Currently,
 * we support `keyup`, `keydown` and `longpress` events.
 */

var InputWrap = require('./input.node').InputWrap
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

var handler = null
var events = [
  'keyup', 'keydown', 'longpress'
]

/**
 * Common base class for input events.
 * @constructor
 * @augments EventEmitter
 * @param {Object} options - the options to input event
 * @param {Number} options.selectTimeout
 * @param {Number} options.dbclickTimeout
 * @param {Number} options.slideTimeout
 */
function InputEvent (options) {
  EventEmitter.call(this)

  this._options = options || {
    selectTimeout: 300,
    dbclickTimeout: 300,
    slideTimeout: 300
  }
  this._handle = new InputWrap()
  this._handle.onevent = this.onevent.bind(this)
}
inherits(InputEvent, EventEmitter)

/**
 * event trigger
 * @param {Number} state - the event state
 * @param {Number} action - the event action
 * @param {Number} code - the event code
 * @param {Number} time - the event time
 * @private
 */
InputEvent.prototype.onevent = function (state, action, code, time) {
  var name = events[state]
  if (!name) {
    this.emit('error', new Error(`unknown event name ${state}`))
    return
  }
  /**
   * keyup event
   * @event input.InputEvent#keyup
   * @type {Object}
   * @property {Number} keyCode - the key code
   * @property {Number} keyTime - the key time
   */
  /**
   * keydown event
   * @event input.InputEvent#keydown
   * @type {Object}
   * @property {Number} keyCode - the key code
   * @property {Number} keyTime - the key time
   */
  this.emit(name, {
    keyCode: code,
    keyTime: time
  })
}

/**
 * start handling event
 * @fires input.InputEvent#keyup
 * @fires input.InputEvent#keydown
 */
InputEvent.prototype.start = function () {
  return this._handle.start(this._options)
}

/**
 * disconnect from event handler
 */
InputEvent.prototype.disconnect = function () {
  return this._handle.disconnect()
}

/**
 * get the event handler
 * @function defaults
 * @fires input.InputEvent#keyup
 * @fires input.InputEvent#keydown
 * @example
 * var inputEvent = require('input')()
 * inputEvent.on('keyup', (event) => {
 *   console.log('keyup', event.keyCode)
 * })
 * inputEvent.on('keydown', (event) => {
 *   console.log('keydown', event.keyCode)
 * })
 * @returns {input.InputEvent}
 */
function getHandler (options) {
  if (handler) {
    if (options) { console.error('skip options setting because already init done') }
    return handler
  }

  handler = new InputEvent(options)
  handler.start()
  return handler
}

module.exports = getHandler
