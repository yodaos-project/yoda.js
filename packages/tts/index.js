'use strict';

/**
 * @module tts
 */

var TtsWrap = require('./tts.node').TtsWrap;
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

/**
 * @class TtsProxy
 * @extends EventEmitter
 */
function TtsProxy(handle) {
  EventEmitter.call(this);
  if (!handle)
    throw new TypeError('handle must be specified');

  this._handle = handle;
  this._handle.onevent = this.onevent.bind(this);
}
inherits(TtsProxy, EventEmitter);

/**
 * @method onevent
 */
TtsProxy.prototype.onevent = function(name, id, errno) {
  this.emit(name, id, errno);
};

/**
 * @method speak
 * @return {Number} the `id` of this tts task.
 */
TtsProxy.prototype.speak = function(text) {
  return this._handle.speak(text);
};

/**
 * @method cancel
 */
TtsProxy.prototype.cancel = function(id) {
  return this._handle.cancel(id);
};

/**
 * @method disconnect
 */
TtsProxy.prototype.disconnect = function() {
  return this._handle.disconnect();
};

/**
 * @method createHandle
 * @param {Object} options
 * @return {TtsHandle}
 */
function createHandle(options) {
  var handle = new TtsWrap();
  handle.prepare(
    options.host || 'apigwws.open.rokid.com', 443, '/api',
    options.key,
    options.deviceTypeId,
    options.deviceId,
    options.secret,
    options.declaimer || 'zh');
  return handle;
}

/**
 * @method createTts
 * @param {Object} options
 * @return {TtsProxy}
 */
function createTts(options) {
  var handle = createHandle(options);
  return new TtsProxy(handle);
}

exports.createHandle = createHandle;
exports.createTts = createTts;
