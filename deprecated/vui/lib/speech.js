'use strict';

const fs = require('fs');
const turen = require('turen');
const logger = require('@rokid/logger')('speech');
const EventEmitter = require('events').EventEmitter;
const getAppMgr = require('./app').getAppMgr;

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
   * @method empty
   */
  empty() {
    this._stack = [];
    this._lastCut = null;
    this._apps = {};
    this._handle.setStack(':');
  }
  /**
   * @method enter
   */
  enter(appId, form, cloud) {
    // FIXME(Yorkie): dont put stack when form is "service"
    // if (form === 'service')
    //   return false;
    const mgr = getAppMgr();
    if (appId[0] === '@') {
      const skills = mgr._skill2app[appId].skills;
      for (let i = 0; i < skills.length; i++) {
        let s = skills[i];
        if (s && s[0] !== '@' && s.length === 32) {
          appId = s;
          break;
        }
      }
    }

    let isNew = !this.remove(appId);
    const appData = mgr._skill2app[appId];
    if (appData && appData._profile) {
      form = appData._profile.metadata.type || form;
    }

    this._stack.push(appId);
    this._apps[appId] = {
      appId, form, cloud
    };
    logger.info('current stack:', this._stack);
    logger.info('current cstack:', this._lastCut);
    logger.info('current app', this._apps[appId]);

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
  update() {
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
    logger.info('upload the stack:', stack);
    this._handle.setStack(stack);
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
    this._handle = new turen.TurenSpeech(null, {
      voiceEnergyPeriod: 500,
      reconnectTimeout: 2000,
    });
    this._context = new SpeechContext(this._handle);
    this._autoExitTimer = null;
    this._started = false;

    // set handle events
    this._handle.on('voice coming', (event) => {
      this.emit('voice', event.turenId, 'coming', event.sl, event.energy);
    });
    this._handle.on('voice start', (event) => {
      this.emit('voice', event.turenId, 'start');
    });
    this._handle.on('voice info', (event) => {
      this.emit('voice', null, 'info', null, event.energy);
    });
    // this._handle.on('voice accept', (event) => {
    //   this.emit('voice', event.turenId, 'accept', event.sl, event.energy);
    // });
    this._handle.on('voice reject', (event) => {
      this.emit('voice', event.turenId, 'reject', event.sl, event.energy);
    });
    this._handle.on('voice cancel', (event) => {
      this.emit('voice', event.turenId, 'cancel', event.sl, event.energy);
    });
    this._handle.on('voice sleep', (event) => {
      this.emit('voice', event.turenId, 'local sleep');
    });
    this._handle.on('asr begin', (asr, event) => {
      this.emit('voice', event.turenId, 'accept');
    });
    this._handle.on('asr pending', (asr, event) => {
      this.emit('speech', event.speakId, 0, asr);
    });
    this._handle.on('asr end', (asr, event) => {
      this.emit('speech', event.speakId, 2, asr);
    });
    this._handle.on('nlp', (response, event) => {
      this._onVoiceCommand(response);
    });
    this._handle.on('error', this._onError.bind(this));
  }
  /**
   * @method _onVoiceEvent
   */
  _onVoiceCommand(data) {
    clearTimeout(this._autoExitTimer);
    this.emit('nlp ready', data.asr, data.nlp);

    const appId = data.appId = data.nlp.appId;
    try {
      data.cloud = data.nlp.cloud;
      data.form = data.action.response.action.form;
    } catch (error) {
      logger.log('invalid nlp action, ignore');
      this.emit('error', error);
      return;
    }

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
    logger.error('speech error', id, code);
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
    } else {
      this._context.empty();
    }
  }
  /**
   * @method mockRequest
   * @param {String} asr
   * @param {Object} nlp
   * @param {Object} action
   */
  mockRequest(asr, nlp, action) {
    this._onVoiceCommand({
      appId: -1,
      asr, nlp, action,
    });
  }
  /**
   * @method setPickup
   */
  setPickup(val) {
    this._handle.setPickup(val);
  }
  /**
   * @method redirect
   */
  redirect(appId, context) {
    logger.info(`redirect to ${appId}`);
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
    if (this._started) {
      return;
    }
    this._handle.start();
    this._started = true;
    setInterval(() => false, 5000);
  }
  /**
   * @method pause
   */
  pause() {
    this._handle.pause();
    this._started = false;
  }
  /**
   * @method resume
   */
  resume() {
    this._handle.resume();
    this._started = true;
  }
  /**
   * @method toggle
   */
  toggle() {
    if (this._started) {
      this.pause();
    } else {
      this.resume();
    }
    return this._started;
  }
  /**
   * @method reload
   */
  reload() {
    const data = JSON.parse(
      fs.readFileSync('/data/system/openvoice_profile.json'));
    this._handle.setConfig({
      key: data.key,
      secret: data.secret,
      deviceTypeId: data.device_type_id,
      deviceId: data.device_id,
    });
    this.start();
    // this._handle.initVoiceTrigger();
  }
  /**
   * @method insertVoiceTrigger
   */
  insertVoiceTrigger(text, pinyin) {
    // return this._handle.insertVoiceTrigger(text, pinyin);
  }
}

exports.SpeechService = SpeechService;
