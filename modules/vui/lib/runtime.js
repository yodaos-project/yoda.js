'use strict';

const AppDispatcher = require('bindings')('ams_down').AppDispatcher;
const InputDispatcher = require('bindings')('inputdown').InputDispatcher;
const SkillHandler = require('./handler').SkillHandler;
const AppManager = require('./app').AppManager;

const dbus = require('dbus');
const tap = require('@rokid/tapdriver');
const tts = require('@rokid/tts');
// const player = require('@rokid/player');

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
    this._paths = paths || ['/opt/apps'];
    this._testing = false;
    this._current = null;
    this._apps = null;
    this._skill2handler = {};
    this._input = new InputDispatcher((event) => {
      const app = this._dispatcher.getCurrent();
      const id = this._getAppId(app.appid, app.isCloud);
      if (id) {
        console.log(`<keyevent> code=${event.keyCode}`);
        this._handleKeyEvent(id, event);
      }
    });
    this._dispatcher = new AppDispatcher((event, isCloud, isCut, appId, ...args) => {
      console.log(`<${event}>`, appId, isCloud, args);
      if (this._testing)
        return;
      const id = this._getAppId(appId, isCloud);
      const form = isCut ? 'cut' : 'scene';

      if (event === 'pause') {
        this._handlePause(id, { isCloud, form, appId });
      } else if (event === 'resume') {
        this._handleResume(id, { isCloud, form, appId });
      } else if (event === 'voice_command') {
        this._handleVoiceCommand.apply(this, args);
      } else {
        this._handleVoiceEvent(id, event, { isCloud, form, appId });
      }
    });
  }
  /**
   * @method start
   */
  start() {
    this._appMgr = new AppManager(this._paths, this);
    this._dispatcher.start();
    this._input.listen();
    this._startMonitor();
    process.title = 'vui';
    console.info(this._appMgr.toString());
  }
  /**
   * @method exitCurrent
   */
  exitCurrent() {
    this._dispatcher.exitCurrent();
  }
  /**
   * @method setPickup
   * @param {Boolean} val - the value if pickup mic
   */
  setPickup(val) {
    this._dispatcher.setPickup(val);
    tap.assert('siren.statechange', val ? 'open' : 'close');
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
    if (data.isCloud) {
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
        this._dispatcher.redirect('@upgrade');
      } else if (data['Wifi'] === false) {
        this._dispatcher.redirect('@network');
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
    this._handleVoiceCommand.call(this, asr, context, action);
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
