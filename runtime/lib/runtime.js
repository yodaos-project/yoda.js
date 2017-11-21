'use strict';

const dbus = require('dbus');
const exec = require('child_process').execSync;
const tap = require('@rokid/tapdriver');
const tts = require('@rokid/tts');
const wifi = require('@rokid/wifi');
const volume = require('@rokid/volume');
const light = require('@rokid/lumen');
const player = require('@rokid/player');

const InputDispatcher = require('@rokid/input').InputDispatcher;
const {
  SpeechService,
  SkillHandler,
  AppManager
} = require('@rokid/vui');

const apis = require('./apis');
const keyevents = require('./keyevents');

/**
 * @property {Object} ROKID
 */
global.ROKID_MONIT_PORT = 9783;

/**
 * @class Runtime
 */
class Runtime {
  /**
   * @method constructor
   * @param {Array} paths - the watch paths for apps
   */
  constructor(paths) {
    this._online = false;
    this._vol = volume.volumeGet();
    this._paths = paths || ['/opt/apps'];
    this._testing = false;
    this._current = null;
    this._apps = null;
    this._skill2handler = {};

    // timers
    this._volumeTimer = null;
    this._roundTimer = null;

    // Input handle
    this._input = new InputDispatcher(this._handleInputEvent.bind(this));

    // Speech handle
    this._speech = new SpeechService();
    this._speech.on('voice', (id, event, sl, energy) => {
      if (!this._online)
        return;
      switch (event) {
        case 'coming':
          light._lumen.point(sl);
          break;
        case 'accept':
          this._doMute();
          break;
        case 'reject':
        case 'local sleep':
          this._doUnmute();
          break;
      }
    });
    this._speech.on('speech', (id, type, asr) => {
      if (!this._online)
        return;
      if (type === 2) {
        this._doUnmute();
        this._doRound();
      }
    });
    this._speech.on('nlp ready', () => {
      if (!this._online)
        return;
      this._stopRound();
    });
    this._speech.on('lifecycle', (event, data) => {
      console.log(event, data.appId);
      if (this._testing)
        return;
      const id = this._getAppId(data.appId, data.cloud);
      const form = data.form;

      if (event === 'pause') {
        this._handlePause(id, data);
      } else if (event === 'resume') {
        this._handleResume(id, data);
      } else if (event === 'voice_command') {
        console.log(data.asr, data.nlp, data.action);
        this._handleVoiceCommand(data.asr, data.nlp, data.action);
      } else {
        this._handleVoiceEvent(id, event, data);
      }
    });
    this._speech.on('error', (err) => {
      volume.volumeSet(this._vol);
      light._lumen.stopRound(0);
    });
  }
  /**
   * @method start
   */
  start() {
    this._appMgr = new AppManager(this._paths, this);
    this._input.listen();
    this._startMonitor(); 
    exec('touch /var/run/bootcomplete');

    // check if network is connected
    let s = wifi.status();
    if (s === 'netserver_connected') {
      this.setOnline();
    } else if (s === 'netserver_disconnected' 
      || s === 'disconnected') {
      this.setOffline();
    }
    // update process title
    console.info(this._appMgr.toString());
  }
  /**
   * @method setOnline
   */
  setOnline() {
    if (this._online)
      return;
    process.title = 'vui';
    this._online = true;
    this._speech.exitCurrent();
    // login
    Promise.resolve()
      .then(apis.login())
      .then(apis.bindDevice())
      .then(() => {
        this._startSpeech();
      })
      .catch((err) => {
        console.error('occurrs error when online service');
        console.error(err && err.stack);
      });
  }
  /**
   * @method setOffline
   */
  setOffline() {
    if (!this._online)
      return;
    process.title = 'vui(offline)';
    this._online = false;
    setTimeout(() => {
      this._speech.exitAll();
      this._speech.redirect('@network');
    }, 2000);
  }
  /**
   * @method _handleInputEvent
   * @param {Object} event
   * @param {Number} event.action - presents keyup or keydown
   * @param {Number} event.keyCode - presents which key
   */
  _handleInputEvent(event) {
    if (event.action === 0) {
      keyevents.keyup();
    } else if (event.action === 1) {
      keyevents.keydown();
      if (event.keyCode === 24) {
        keyevents.volumeup();
      } else if (event.keyCode === 25) {
        keyevents.volumedown();
      } else if (event.keyCode === 91) {
        keyevents.mute();
      } else {
        // FIXME(Yorkie): we only exposes the keydown events for app
        const app = this._speech.getCurrent() || {};
        const id = this._getAppId(app.appid, app.isCloud);
        if (id) {
          console.info(`<keyevent> code=${event.keyCode}`);
          this._handleKeyEvent(id, event);          
        }
      }
    }
  }
  /**
   * @method _startSpeech
   */
  _startSpeech() {
    let id = Math.floor(Math.random() * 3);
    id = id === 3 ? 2 : id;
    player.play(`${__dirname}/sounds/startup${id}.ogg`);
    this._speech.reload();
    this._speech.start();
  }
  /**
   * @method _doMute
   */
  _doMute() {
    this._vol = volume.volumeGet();
    volume.volumeSet(5);
    this._volumeTimer = setTimeout(() => {
      volume.volumeSet(this._vol);
    }, 6000);
  }
  /**
   * @method _doUnmute
   */
  _doUnmute() {
    clearTimeout(this._volumeTimer);
    volume.volumeSet(this._vol);
  }
  /**
   * @method _doRound
   */
  _doRound() {
    light._lumen.round(0);
    this._roundTimer = setTimeout(() => {
      light._lumen.stopRound(0);
    }, 6000);
  }
  /**
   * @method _stopRound
   */
  _stopRound() {
    clearTimeout(this._roundTimer);
    light._lumen.stopRound(0);
  }
  /**
   * @method exitCurrent
   */
  exitCurrent() {
    this.setPickup(false);
    this._speech.exitCurrent();
  }
  /**
   * @method setPickup
   * @param {Boolean} val - the value if pickup mic
   */
  setPickup(val) {
    this._speech.setPickup(val);
    tap.assert('siren.statechange', val ? 'open' : 'close');
    if (val) {
      this._doRound();
    } else {
      this._stopRound();
    }
  }
  /**
   * @method _getAppId
   */
  _getAppId(appid, cloud) {
    return cloud ? '@cloud' : appid;
  }
  /**
   * @method _handleKeyEvent
   * @param {String} id - the appid to pass
   * @param {Object} data
   */
  _handleKeyEvent(id, data) {
    const handler = this._appMgr.getHandlerById(id);
    handler.emit('key_event', data);
  }
  /**
   * @method _handlePause
   * @param {String} id - the appid to create
   * @param {Object} data
   */
  _handlePause(id, data) {
    const handler = this._appMgr.getHandlerById(id);
    require('@rokid/tts').stop();
    require('@rokid/player').pause();
    handler.emit('pause', data);
  }
  /**
   * @method _handleResume
   * @param {String} id - the appid to create
   * @param {Object} data
   */
  _handleResume(id, data) {
    if (data.cloud) {
      require('@rokid/player').resume();
    }
    const handler = this._appMgr.getHandlerById(id);
    handler.emit('resume', data);
  }
  /**
   * @method _handleVoiceEvent
   * @param {String} id - the appid to create
   * @param {Object} data
   */
  _handleVoiceEvent(id, event, data) {
    const handler = this._appMgr.getHandlerById(id);
    handler.emit(event, data);
  }
  /**
   * @method _handleVoiceCommand
   */
  _handleVoiceCommand(_, context, action) {
    let skill = new SkillHandler(context, action);
    if (skill.valid) {
      this._current = skill;
      const id = skill.isCloud ? '@cloud' : skill.id;
      const handler = this._appMgr.getHandlerById(id);
      if (handler.constructor.name === 'NativeConnector') {
        handler.emit('voice_command', _, context, action);
      } else {
        handler.emit('voice_command', skill.context, skill.action);
      }
    }
  }
  /**
   * @method _onSetTesting
   * @remote {dbus}
   * @param {Boolean} testing - if enable testing mode
   * @param {Function} done - the callback
   */
  _onSetTesting(testing, done) {
    this._testing = testing;
    this._testing ? tap.enable() : tap.disable();
    done(null, true);
  }
  /**
   * @method _onReportSysStatus
   * @remote {dbus}
   * @param {String} status - the status to report
   * @param {Function} done - the callback
   */
  _onReportSysStatus(status, done) {
    try {
      const data = JSON.parse(status);
      if (data.upgrade === true) {
        this._speech.redirect('@upgrade');
      } else if (data['Wifi'] === false) {
        this.setOffline();
      } else if (data['Wifi'] === true && !this._online) {
        this.setOnline();
      }
      done(null, true);
    } catch (err) {
      console.error(err && err.stack);
      done(null, false);
    }
  }
  /**
   * @method _onSendIntentRequest
   * @remote {dbus}
   * @param {String} asr
   * @param {Object} context - the nlp context
   * @param {Object} action - the action
   * @param {Function} done - the callback
   */
  _onSendIntentRequest(asr, context, action, done) {
    this._speech.mockRequest(asr, acontext, action);
    done(null, true);
  }
  /**
   * @method _onReload
   * @remote {dbus}
   * @param {Function} done - the callback
   */
  _onReload(done) {
    this._appMgr.reload();
    done(null, true);
  }
  /**
   * @method _onPing
   * @remote {dbus}
   * @param {Function} done - the callback
   */
  _onPing(done) {
    console.log('<vui> is alive...');
    done(null, true);
  }
  /**
   * @method _startMonitor
   */
  _startMonitor() {
    const service = dbus.registerService('session', 'com.rokid.AmsExport');
    const object = service.createObject('/rokid/openvoice');
    const iface = object.createInterface(`rokid.openvoice.AmsExport`);
    iface.addMethod(
      'ReportSysStatus',
      {
        in: [dbus.Define(String)],
        out: dbus.Define(Boolean),
      },
      this._onReportSysStatus.bind(this)
    );
    iface.addMethod(
      'SetTesting',
      {
        in: [dbus.Define(Boolean)],
        out: dbus.Define(Boolean),
      },
      this._onSetTesting.bind(this)
    );
    iface.addMethod(
      'SendIntentRequest',
      {
        in: [dbus.Define(String), dbus.Define(String), dbus.Define(String)],
        out: dbus.Define(Boolean),
      },
      this._onSendIntentRequest.bind(this)
    );
    iface.addMethod(
      'Reload',
      {
        in: [],
        out: dbus.Define(Boolean),
      },
      this._onReload.bind(this)
    );
    iface.addMethod(
      'Ping',
      {
        in: [],
        out: dbus.Define(Boolean),
      },
      this._onPing.bind(this)
    );
    iface.update();
  }
}

module.exports = function(paths) {
  return new Runtime(paths);
};
