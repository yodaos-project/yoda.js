'use strict';

const EventEmitter = require('events').EventEmitter;
const NativeApp = require('./native').NativeApp;
const ActionComposer = require('./action').ActionComposer;
const RokidRequest = require('rokid').RokidRequest;

const path = require('path');
const config = require('@rokid/context').config;
const player = require('@rokid/player');
const tts = require('@rokid/tts');
const tap = require('@rokid/tapdriver');

/**
 * @class RokidApp
 * @extends EventEmitter
 */
class RokidApp extends EventEmitter {
  /**
   * @method constructor
   * @param {String} appid
   * @param {String} runtime
   * @param {Object} options
   */
  constructor(appid, runtime, options) {
    super();
    this._appid = appid;
    this._runtime = runtime;
    this._options = Object.assign({
      data: {},
      beforeCreate() {
        return false;
      },
      created() {
        // create, restart
        return true;
      },
      paused() {
        // pause
        return true;
      },
      resumed() {
        // resume
        return true;
      },
      beforeDestroy() {
        // stop
        return true;
      },
      destroyed() {
        // destroy
        return true;
      },
      onrequest() {
        // voice_command or other request
        return true;
      },
      keyEvent() {
        // key event
        return true;
      }
    }, options);
    this.on('beforeCreate', this._onBeforeCreate.bind(this));
    this.on('create', this._onCreate.bind(this));
    this.on('restart', this._onCreate.bind(this));
    this.on('pause', this._onPaused.bind(this));
    this.on('resume', this._onResumed.bind(this));
    this.on('stop', this._onBeforeDestroy.bind(this));
    this.on('destroy', this._onDestroyed.bind(this));
    this.on('voice_command', this._onVoiceCommand.bind(this));
    this.on('key_event', this._onKeyEvent.bind(this));
  }
  /**
   * @method _onBeforeCreate
   */
  _onBeforeCreate(appid) {
    this._state = 'beforeCreate';
    if (this._options.beforeCreate.apply(this, arguments)) {
      this._state = 'beforeCreate OK';
    }
  }
  /**
   * @method _onCreate
   */
  _onCreate(context) {
    this._state = 'created';
    this._options.created.apply(this, arguments);
  }
  /**
   * @method _onPaused
   */
  _onPaused() {
    this._state = 'paused';
    this._options.paused.apply(this, arguments);
  }
  /**
   * @method _onResumed
   */
  _onResumed() {
    this._state = 'resumed';
    this._options.resumed.apply(this, arguments);
  }
  /**
   * @method _onBeforeDestroy
   */
  _onBeforeDestroy() {
    this._state = 'beforeDestroy';
    this._options.beforeDestroy.apply(this, arguments);
  }
  /**
   * @method _onDestroyed
   */
  _onDestroyed() {
    this._state = 'destroyed';
    this._options.destroyed.apply(this, arguments);
  }
  /**
   * @method _onVoiceCommand
   */
  _onVoiceCommand(context, action) {
    const result = this.createResult(
      'voice_command', context.asr, context, action);
    result.action.fetch();
  }
  /**
   * @method _onKeyEvent
   */
  _onKeyEvent() {
    this._options.keyEvent.apply(this, arguments);
  }
  /**
   * @method say
   */
  say(text, cb) {
    return tts.say(text, cb);
  }
  /**
   * @method say
   */
  play(url, cb) {
    return player.play(url, cb);
  }
  /**
   * @method _createResult
   */
  createResult(event, speech, context, action) {
    return {
      speech,
      action: new ActionComposer(event, context, action, this),
    };
  }
  /**
   * @method finish
   */
  exit() {
    this._runtime.setPickup(false);
    this._runtime.exitCurrent();
    tap.assert('app.statechange', {
      appid: this._appid,
      state: 'exit',
    });
  }
  /**
   * @method crontab
   * @param {String} expr
   * @param {Object} data
   */
  crontab(expr, data) {
    this._runtime.crontab(this._appid, expr, data);
  }
  /**
   * @method pickup
   */
  pickup() {
    this._runtime.setPickup(true);
  }
  /**
   * @method confirm
   * @param {String} intent
   * @param {String} slot
   * @param {String[]} options
   */
  confirm(intent, slot, options) {
    if (!intent)
      throw new TypeError('intent is required');
    if (!slot)
      throw new TypeError('slot is required');
    const request = new RokidRequest({
      host: config.event_req_host,
      pathname: '/v1/skill/dispatch/setConfirm',
      schemaPath: path.join(__dirname, '../proto/SetConfirm.proto'),
      requestKey: 'SetConfirmRequest',
      responseKey: 'SetConfirmResponse',
    });
    request.write({
      appId: this._appid,
      confirmIntent: intent,
      confirmSlot: slot,
      confirmOptions: options || [],
      attributes: '', // not used
    }, (err, data) => {
      console.info('confirm response:', data);
      this.pickup();
    });
  }
}

module.exports = function(options) {
  let native = false;
  let started = false;
  let exec = (appid, runtime) => {
    if (started)
      return;
    started = true;
    let app = new RokidApp(appid, runtime, options);
    if (native)
      runtime._app = app;
    return app;
  };
  setImmediate(() => {
    if (started)
      return;
    native = true;
    const appid = (process.argv[2] || '').replace(/^rokid\.openvoice\.X/, '');
    if (!appid)
      throw new Error(`${appid} is invalid`);
    exec(appid, new NativeApp(appid));
  });
  return exec;
};
