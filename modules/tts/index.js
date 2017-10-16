'use strict';

const TtsWrap = require('bindings')('tts').TtsWrap;
const EventEmitter = require('events').EventEmitter;
const tap = require('@rokid/tapdriver');

/**
 * @class TextToSpeech
 * @extends EventEmitter
 */
class TextToSpeech extends EventEmitter {
  /**
   * @method constructor
   * @param {TtsWrap} tts
   * @param {String} text
   */
  constructor(tts, text) {
    super();
    this._tts = tts;
    this._text = text;
    this._id = tts.say(text);
    tap.assert('voice', text);
  }
  /**
   * @property {Number} id - the tts task id
   */
  get id() {
    return this._id;
  }
  /**
   * @method stop
   */
  stop() {
    this._tts.stop(this._id);
  }
}

/**
 * @class TTSDispatcher
 */
class TTSDispatcher {
  /**
   * @method constructor
   */
  constructor() {
    this._tts = new TtsWrap(this._onEvent.bind(this));
    this._last = null;
    this._tasks = {};
  }
  /**
   * @method say
   * @param {String} text - to say
   */
  say(text) {
    if (global.ROKID_APPID)
      global.ROKID_VOICE = global.ROKID_APPID;
    const tts = new TextToSpeech(this._tts, text);
    this._tasks[tts.id] = tts;
    this._last = text;
    return tts;
  }
  /**
   * @method stopAll
   */
  stopAll() {
    for (let i in this._tasks) {
      this._tasks[i].stop();
    }
  }
  /**
   * @method _onEvent
   */
  _onEvent(event, id, err) {
    const task = this._tasks[id];
    if (!task) {
      console.error('could not find this task with id: ' + id + ' at event: ' + event);
      return;
    }
    task.emit(event, id, err);
    // FIXME(Yazhong): if the event is not start, remove this from tasks
    if (event !== 'start') {
      delete this._tasks[id];
      this._last = null;
      global.ROKID_VOICE = null;
    }
  }
}

const _ttsdispatcher = new TTSDispatcher();

/**
 * @method say
 * @param {String} text
 * @param {Function} callback
 */
function say(text, callback) {
  const tts = _ttsdispatcher.say(text);
  if (typeof callback === 'function') {
    // FIXME(Yazhong): should we move this event inside `stop()`?
    tts.once('cancel', (id) => callback('TTS has been canceled'));
    tts.once('complete', (id) => callback(null));
    tts.once('error', (id, err) => {
      if (!(err instanceof Error)) err = new Error(err);
      callback(err);
    });
  }
  return tts;
}

function resume() {
  _ttsdispatcher.resume();
}

/**
 * @method stop - stop all tts tasks
 */
function stop() {
  _ttsdispatcher.stopAll();
}

exports.say = say;
exports.stop = stop;
exports.resume = resume;
