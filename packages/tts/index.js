'use strict';

/**
 * @module tts
 */

var TtsWrap = require('./tts.node').TtsWrap;
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var TTSEvents = [
  'voice', 	// 0: not used
  'start', 	// 1: start
  'end', 	// 2: end
  'cancel', 	// 3: cancel
  'error'	// 4: error
];

/**
 * @class TtsRequest
 */
function TtsRequest(handle, text, callback) {
  this.id = handle.speak(text);
  this.handle = handle;
  this.text = text;
  this.callback = callback;
  this.state = 'ready';
}

/**
 * @method cancel
 */
TtsRequest.prototype.cancel = function() {
  this.state = 'cancel';
  return this.handle.cancel(this.id);
};

/**
 * @method onstart
 */
TtsRequest.prototype.onstart = function() {
  this.state = 'start';
};

/**
 * @method end
 * @param {Number} errno - the error code if something wrong.
 */
TtsRequest.prototype.end = function(errno) {
  if (errno) {
    var err = new Error('tts is occurring error');
    err.code = errno;
    this.state = 'error';
    if (typeof this.callback !== 'function')
      throw err;
    this.callback(err);
  } else {
    this.state = 'end';
    if (typeof this.callback === 'function')
      this.callback(null, this);
  }
};

/**
 * @class TtsProxy
 * @extends EventEmitter
 */
function TtsProxy(handle) {
  EventEmitter.call(this);
  if (!handle)
    throw new TypeError('handle must be specified');

  this._requests = [];
  this._handle = handle;
  this._handle.onevent = this.onevent.bind(this);
}
inherits(TtsProxy, EventEmitter);

/**
 * @method onevent
 */
TtsProxy.prototype.onevent = function(name, id, errno) {
  var evt = TTSEvents[name];
  var req = this._requests[id];
  if (!req) {
    this.emit('error', new Error('tts task not found'));
  } else if (evt === 'start') {
    req.onstart();
  } else if (evt === 'end' || evt === 'error') {
    req.end(errno);
    delete this._requests[id];
  }
  this.emit(TTSEvents[name], id, errno);
};

/**
 * @method speak
 * @return {Number} the `id` of this tts task.
 */
TtsProxy.prototype.speak = function(text, cb) {
  var req = new TtsRequest(this._handle, text, cb);
  this._requests[req.id] = req;
  return req;
};

/**
 * @method stopAll
 */
TtsProxy.prototype.stopAll = function() {
  for (var i = 0; i < this._requests.length; i++)
    this._requests[i].cancel();
};

/**
 * @method disconnect
 */
TtsProxy.prototype.disconnect = function() {
  this._handle.disconnect();
  this._requests.length = 0;
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
