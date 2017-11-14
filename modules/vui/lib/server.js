'use strict';

const SpeechWrap = require('bindings')('speech_down').SpeechWrap;
const EventEmitter = require('events').EventEmitter;
const exec = require('child_process').execSync;
const volume = require('@rokid/volume');
const light = require('@rokid/lumen');

/**
 * @class SpeechContext
 */
class SpeechContext {
  /**
   * @method constructor
   */
  constructor(handle) {
    this._stack = [];
    this._apps = {};
    this._handle = handle;
  }
  /**
   * @method enter
   */
  enter(appId, form, cloud) {
    // FIXME(Yorkie): dont put stack when form is "service"
    if (form === 'service')
      return false;

    let isNew = !this.remove(appId);
    this._stack.push(appId);
    this._apps[appId] = {
      appId, form, cloud
    };
    console.log(this._stack);
    this.update();
    return isNew;
  }
  /**
   * @method leave
   */
  leave(appId) {
    let last = this.current;
    if (last === appId) {
      this._stack.pop();
    } else {
      this.remove(appId);
    }
    delete this._apps[appId];
    this.update();
  }
  /**
   * @method update
   */
  update() {
    return this._handle.updateStack(this.current);
  }
  /**
   * @method remove
   */
  remove(appId) {
    let newStack = [];
    for (let i = 0; i < this._stack.length; i++) {
      if (appId !== this._stack[i]) {
        newStack.push(this._stack[i]);
      }
    }
    if (newStack.length === this._stack.length)
      return false;

    this._stack = newStack;
    return true;
  }
  /**
   * @method getCurrentApp
   */
  getCurrentApp() {
    return this._apps[this.current];
  }
  /**
   * @getter current
   */
  get current() {
    return this._stack[this._stack.length - 1];
  }
}

/**
 * @class SpeechService
 */
class SpeechService {
  /**
   * @method constructor
   */
  constructor(callback) {
    this._handle = new SpeechWrap();
    this._context = new SpeechContext(this._handle);
    this._callback = callback;
    this._autoExitTimer = null;
    this._vol = volume.volumeGet();

    // set handle events
    this._handle.onVoiceEvent = this._onVoiceEvent.bind(this);
    this._handle.onIntermediateResult = this._onIntermediateResult.bind(this);
    this._handle.onVoiceCommand = this._onVoiceCommand.bind(this);
    this._handle.onError = this._onError.bind(this);
  }
  /**
   * @method _onVoiceEvent
   */
  _onVoiceEvent(id, event, sl, energy) {
    console.log('voice event', event, sl, energy);
    if (event === 'coming') {
      this._vol = volume.volumeGet();
      light._lumen.point(sl);
    }
  }
  /**
   * @method _onVoiceEvent
   */
  _onIntermediateResult(id, type, asr) {
    console.log('inter result', type, asr);
    if (type === 0) {
      volume.volumeSet(15);
    } else {
      light._lumen.round(0);
    }
  }
  /**
   * @method _onVoiceEvent
   */
  _onVoiceCommand(id, asr, nlp, action) {
    clearTimeout(this._autoExitTimer);
    volume.volumeSet(this._vol);
    light._lumen.stopRound(0);

    let data = { asr };
    try {
      data.nlp = JSON.parse(nlp);
      data.action = JSON.parse(action);
    } catch (err) {
      return;
    }
    const appId = data.appId = data.nlp.appId;
    data.cloud = data.nlp.cloud;
    data.form = data.action.response.action.form;

    if (appId === this._context.current) {
      this.emit('voice_command', data);
    } else {
      const last = this._context.getCurrentApp();
      if (last) {
        if (last.form === 'cut') {
          this.exitBy(last);
        } else {
          this.emit('pause', last);
        }
      }
      const isNew = this._context.enter(appId, data.form, data.cloud);
      if (isNew) {
        this.emit('create', data);
      } else {
        this.emit('restart', data);
        this.emit('resume', data);
      }
      this.emit('voice_command', data);

      if (data.form === 'cut') {
        // this._autoExitTimer = setTimeout(() => {
        //   this.exitBy(data);
        //   this._tryResume();
        // }, 10 * 1000);
      }
    }
  }
  /**
   * @method _onError
   */
  _onError(id, code) {
    console.log('error', arguments);
    clearTimeout(this._autoExitTimer);
    volume.volumeSet(this._vol);
    light._lumen.stopRound(0);
  }
  /**
   * @method _tryResume
   */
  _tryResume() {
    const current = this._context.getCurrentApp();
    if (current) {
      this.emit('restart', current);
      this.emit('resume', current);
    }
  }
  /**
   * @method emit
   */
  emit(event, data) {
    this._callback(event, data);
  }
  /**
   * @method exitBy
   */
  exitBy(data) {
    clearTimeout(this._autoExitTimer);
    this.emit('stop', data);
    this.emit('destroy', data);
    this._context.leave(data.appId);
  }
  /**
   * @method exitCurrent
   */
  exitCurrent() {
    let current = this._context.getCurrentApp();
    if (current) {
      this.exitBy(current);
    }
    this._tryResume();
  }
  /**
   * @method setPickup
   */
  setPickup(val) {
    this._handle.setSirenState(val);
  }
  /**
   * @method redirect
   */
  redirect(appId) {
    // exit the last
    let current = this._context.getCurrentApp();
    if (current) {
      this.exitBy(current.appId);
    }

    // enter the new by appId
    const isNew = this._context.enter(appId, 'cut', false);
    if (isNew) {
      this.emit('create', { appId });
    } else {
      this.emit('restart', { appId });
      this.emit('resume', { appId });
    }
  }
  /**
   * @method start
   */
  start() {
    exec('touch /var/run/bootcomplete');
    this._handle.start();
    setInterval(() => false, 5000);
  }
  /**
   * @method pause
   */
  pause() {
    this._handle.pause();
  }
  /**
   * @method resume
   */
  resume() {
    this._handle.resume();
  }
}

// const service = new SpeechService((event, data) => {
//   console.log(event, data);
// });
// service.start();

exports.SpeechService = SpeechService;
