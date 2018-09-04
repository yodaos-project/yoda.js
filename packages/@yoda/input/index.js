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

var ACTION_CLICK = 1
var ACTION_DB_CLICK = 2
var ACTION_LONG_CLICK = 3
var ACTION_SLIDE = 4

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
  if (this._options.selectTimeout === 0) {
    throw new Error('selectTimeout must not be 0')
  }
  this._handle = new InputWrap()
  this._handle.onevent = this.onevent.bind(this)
  this._handle.ongesture = this.ongesture.bind(this)
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
   * @event module:@yoda/input~InputEvent#keyup
   * @type {Object}
   * @property {Number} keyCode - the key code
   * @property {Number} keyTime - the key time
   */
  /**
   * keydown event
   * @event module:@yoda/input~InputEvent#keydown
   * @type {Object}
   * @property {Number} keyCode - the key code
   * @property {Number} keyTime - the key time
   */
  /**
   * long press event
   * @event module:@yoda/input~InputEvent#longpress
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
 * @private
 * @param {Number} action - the action type
 * @param {Number} code - the event code
 */
InputEvent.prototype.ongesture = function (action, code) {
  if (action === ACTION_CLICK) {
    /**
     * click event
     * @event module:@yoda/input~InputEvent#click
     * @type {Object}
     * @property {Number} keyCode - the key code
     */
    this.emit('click', { keyCode: code })
  } else if (action === ACTION_DB_CLICK) {
    /**
     * double click event
     * @event module:@yoda/input~InputEvent#dbclick
     * @type {Object}
     * @property {Number} keyCode - the key code
     */
    this.emit('dbclick', { keyCode: code })
  } else if (action === ACTION_LONG_CLICK) {
    /**
     * click event
     * @event module:@yoda/input~InputEvent#longpressed
     * @type {Object}
     * @property {Number} keyCode - the key code
     */
    this.emit('longpressed', { keyCode: code })
  }
}

/**
 * start handling event
 * @fires module:@yoda/input~InputEvent#keyup
 * @fires module:@yoda/input~InputEvent#keydown
 * @fires module:@yoda/input~InputEvent#longpress
 */
InputEvent.prototype.start = function () {
  return this._handle.start(this._options.selectTimeout,
    this._options.dbclickTimeout,
    this._options.slideTimeout)
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
 * @example
 * var inputEvent = require('input')()
 * inputEvent.on('keyup', (event) => {
 *   console.log('keyup', event.keyCode)
 * })
 * inputEvent.on('click', (event) => {
 *   console.log('click', event.keyCode)
 * })
 * inputEvent.on('dbclick', (event) => {
 *   console.log('double click', event.keyCode)
 * })
 * inputEvent.on('keydown', (event) => {
 *   console.log('keydown', event.keyCode)
 * })
 * inputEvent.on('longpress', (event) => {
 *   console.log('longpressx', event.keyCode)
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
