'use strict';

const EventEmitter = require('events').EventEmitter;
const ActionComposer = require('./action').ActionComposer;
const tap = require('@rokid/tapdriver');
const tts = require('@rokid/tts');
const player = require('@rokid/player');

// const SIREN_EVENTS = {
//   [100]: 'vad_start',
//   [101]: 'vad_data',
//   [102]: 'vad_end',
//   [103]: 'vad_cancel',
//   [104]: 'wake_vad_start',
//   [105]: 'wake_vad_data',
//   [106]: 'wake_vad_end',
//   [107]: 'wake_pre',
//   [108]: 'wake_nocmd',
//   [109]: 'wake_cancel',
//   [110]: 'sleep',
//   [111]: 'hotword',
//   [112]: 'sr',
//   [113]: 'voice_print',
//   [114]: 'dirty',
// };

/**
 * @class RokidApp
 * @extends EventEmitter
 */
class RokidApp extends EventEmitter {
  /**
   * @method constructor
   */
  constructor(appid, runtime, options) {
    super();
    this._appid = appid;
    this._state = null;
    this._runtime = runtime;
    this._options = Object.assign({
      // App default template
      data: {},
      created() {
        // create, restart
      },
      paused() {
        // pause
      },
      resumed() {
        // resume
      },
      beforeDestroy() {
        // stop
      },
      destroyed() {
        // destroy
      },
      onrequest() {
        // voice_command or other request
      },
    }, options);
    // handle events
    this.on('create', this._onCreate.bind(this));
    this.on('restart', this._onCreate.bind(this));
    this.on('pause', this._onPause.bind(this));
    this.on('resume', this._onResume.bind(this));
    this.on('stop', this._onStop.bind(this));
    this.on('destroy', this._onDestroy.bind(this));
    this.on('voice_command', this._onVoiceCommand.bind(this));
  }
  /**
   * @method _onCreate
   */
  _onCreate() {
    this._state = 'created';
    this._options.created.apply(this, arguments);
  }
  /**
   * @method _onPause
   */
  _onPause() {
    this._state = 'paused';
    this._options.paused.apply(this, arguments);
  }
  /**
   * @method _onResume
   */
  _onResume() {
    this._state = 'resumed';
    this._options.resumed.apply(this, arguments);
  }
  /**
   * @method _onStop
   */
  _onStop() {
    this._state = 'beforeDestroy';
    this._options.beforeDestroy.apply(this, arguments);
  }
  /**
   * @method _onDestroy
   */
  _onDestroy() {
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
   * @method pickup
   */
  pickup() {
    this._runtime.setPickup(true);
    tap.assert('siren.statechange', 'open');
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
   * @method createResult
   */
  createResult(event, speech, context, action) {
    return {
      speech,
      action: new ActionComposer(event, context, action, this),
    };
  }
  // /**
  //  * @method _internalPause
  //  */
  // _internalPause() {
  //   if (this._shouldOverridePause)
  //     return;
  //   tts.stop();
  //   player.pause();
  // }
  // /**
  //  * @method _internalResume
  //  */
  // _internalResume() {
  //   if (this._shouldOverrideResume)
  //     return;
  //   player.resume();
  // }
}

function rokidapp(options) {
  return (appid, runtime) => {
    return new RokidApp(appid, runtime, options);
  };
}

module.exports = rokidapp;
