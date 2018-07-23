'use strict';

/**
 * @namespace input
 */

var InputWrap = require('./input.node').InputWrap;
var EventEmitter = require('events').EventEmitter;
var inherits = require('utils').inherits;

/**
 * @constructor
 * @param {Object} options - the options to input event
 * @param {Number} options.selectTimeout
 * @param {Number} options.dbclickTimeout
 * @param {Number} options.slideTimeout
 */
function InputEvent(options) {
  EventEmitter.call(this);

  this._options = options || {
    selectTimeout: 300,
    dbclickTimeout: 300,
    slideTimeout: 300,
  };
  this._handle = new InputWrap();
  this._handle.onevent = this.onevent.bind(this);
}
inherits(InputEvent, EventEmitter);

InputEvent.prototype.onevent = function(name, data) {
  // TODO
};

/**
 * start handling event
 */
InputEvent.prototype.start = function() {
  return this._handle.start(this._options);
};

/**
 * disconnect from event handler
 */
InputEvent.prototype.disconnect = function() {
  return this._handle.disconnect();
};
