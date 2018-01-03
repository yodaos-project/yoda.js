'use strict';

const fs = require('fs');
const SpeechWrap = require('bindings')('speech_down').SpeechWrap;
const EventEmitter = require('events').EventEmitter;

/**
 * @class SpeechContext
 */
class SpeechContext {
  /**
   * @method constructor
   */
  constructor(handle) {
    this._stack = [];
    this._lastCut = null;
    this._apps = {};
    this._handle = handle;
  }
  /**
   * @method enter
   */
  enter(appId, form, cloud) {
    // FIXME(Yorkie): dont put stack when form is "service"
    // if (form === 'service')
    //   return false;

    let isNew = !this.remove(appId);
    this._stack.push(appId);
    this._apps[appId] = {
      appId, form, cloud
    };
    console.info('current stack:', this._stack);
    console.info('current cstack:', this._lastCut);
    this.update(form);
    if (form === 'cut' && appId !== 'ROKID.EXCEPTION') {
      this._lastCut = appId;
    }
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
  update(form) {
    const len = this._stack.length - 1;
    const domain = {
      scene: '',
      cut: '',
    };
    for (let i = len; i >= 0; i--) {
      const id = this._stack[i];
      const ctx = this._apps[id];
      if (!domain.scene && 
        ctx.form === 'scene' && 
        id !== 'ROKID.EXCEPTION' && 
        id[0] !== '@') {
        domain.scene = id;
        break;
      }
    }
    const stack = domain.scene + ':' + (this._lastCut || '');
    console.info('upload the stack:', stack);
    this._handle.updateStack(stack);
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
class SpeechService extends EventEmitter {
  /**
   * @method constructor
   */
  constructor() {
    super();
    this._handle = new SpeechWrap();
    this._context = new SpeechContext(this._handle);
    this._autoExitTimer = null;

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
    if (event !== 'info')
      console.log('<VoiceEvent>', event, sl, energy);
    this.emit('voice', id, event, sl, energy);
  }
  /**
   * @method _onVoiceEvent
   */
  _onIntermediateResult(id, type, asr) {
    console.log('<IntermediateResult>', type, asr);
    this.emit('speech', id, type, asr);
  }
  /**
   * @method _onVoiceEvent
   */
  _onVoiceCommand(id, asr, nlp, action) {
    clearTimeout(this._autoExitTimer);
    this.emit('nlp ready', asr, nlp);

    let data = { asr, nlp, action };
    try {
      data.raw = { nlp, action };
      if (typeof nlp === 'string')
        data.nlp = JSON.parse(nlp);
      if (typeof action === 'string')
        data.action = JSON.parse(action);
    } catch (err) {
      console.error(err && err.stack);
      return;
    }
    const appId = data.appId = data.nlp.appId;
    data.cloud = data.nlp.cloud;
    data.form = data.action.response.action.form;

    if (appId === this._context.current) {
      this.lifecycle('voice_command', data);
    } else {
      const last = this._context.getCurrentApp();
      if (last) {
        // FIXME(Yorkie): pause current is not scene and last is scene
        if (last.form === 'scene' && data.form !== 'scene') {
          this.lifecycle('pause', last);
        } else {
          this.exitBy(last);
        }
      }
      const isNew = this._context.enter(appId, data.form, data.cloud);
      if (isNew) {
        this.lifecycle('create', data);
      } else {
        this.lifecycle('restart', data);
        this.lifecycle('resume', data);
      }
      this.lifecycle('voice_command', data);

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
    console.error('speech error', id, code);
    clearTimeout(this._autoExitTimer);
    this.emit('error', id, code);
  }
  /**
   * @method _tryResume
   */
  _tryResume() {
    const current = this._context.getCurrentApp();
    if (current) {
      this.lifecycle('restart', current);
      this.lifecycle('resume', current);
    }
  }
  /**
   * @method getCurrentApp
   */
  getCurrentApp() {
    return this._context.getCurrentApp();
  }
  /**
   * @method emit
   */
  lifecycle(event, data) {
    this.emit('lifecycle', event, data);
  }
  /**
   * @method exitBy
   */
  exitBy(data) {
    clearTimeout(this._autoExitTimer);
    this.lifecycle('stop', data);
    this.lifecycle('destroy', data);
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
   * @method exitAll
   */
  exitAll() {
    let current = this._context.getCurrentApp();
    if (current) {
      this.exitBy(current);
      this.exitAll();
    }
  }
  /**
   * @method mockRequest
   * @param {String} asr
   * @param {Object} nlp
   * @param {Object} action
   */
  mockRequest(asr, nlp, action) {
    this._onVoiceCommand(-1, asr, nlp, action);
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
  redirect(appId, context) {
    // exit the last
    let current = this._context.getCurrentApp();
    if (current) {
      if (current.form === 'scene') {
        this.lifecycle('pause', current);
      } else {
        this.exitBy(current);
      }
    }

    // enter the new by appId
    const isNew = this._context.enter(appId, 'cut', false);
    if (isNew) {
      this.lifecycle('create', { appId });
    } else {
      this.lifecycle('restart', { appId });
      this.lifecycle('resume', { appId });
    }

    const voiceCmd = {
      asr: '',
      nlp: {
        appId,
        intent: '__mock__',
        slots: {
          context: context
        },
      },
      action: {},
      cloud: false,
      form: 'cut',
    };
    this.lifecycle('voice_command', voiceCmd);
  }
  /**
   * @method start
   */
  start() {
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
  /**
   * @method reload
   */
  reload() {
    const data = JSON.parse(
      fs.readFileSync('/data/system/openvoice_profile.json'));
    this._handle.updateConfig(
      data.device_id, data.device_type_id, data.key, data.secret);
  }
}

// const service = new SpeechService((event, data) => {
//   console.log(event, data);
// });
// service.start();

exports.SpeechService = SpeechService;
