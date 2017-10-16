'use strict';

const dbus = require('dbus');
const EventEmitter = require('events').EventEmitter;

/**
 * @class NativeApp
 * @extends EventEmitter
 */
class NativeApp extends EventEmitter {
  /**
   * @method constructor
   */
  constructor(appid) {
    super();
    this._appid = appid;
    this._iface = null;
  }
  /**
   * @method _onGetInfo
   */
  _onGetInfo(callback) {
    callback(process.pid);
  }
  /**
   * @method _onGetEvent
   */
  _onGetEvent(name, ...args) {
    const callback = args[args.length - 1];
    this.emit(name, args.slice(0, args.length - 1));
    callback(true);
  }
  /**
   * @method _callSignal
   */
  _callSignal(name, ...args) {
    if (!this._iface)
      throw new TypeError('start() is required');
    return this._iface.emitSignal(name, args);
  }
  /**
   * @method startActivity
   */
  startActivity(appid, context) {
    return this._callSignal('StartActivity', appid, context);
  }
  /**
   * @method openSiren
   */
  setPickup(state) {
    return this._callSignal('OpenSiren', state);
  }
  /**
   * @method finish
   */
  exitCurrent() {
    return this._callSignal('Finish');
  }
  /**
   * @method start
   */
  start() {
    const service = dbus.registerService('session', 'rokid.openvoice.NativeBase');
    const object = service.createObject('/rokid/openvoice');
    const iface = object.createInterface('rokid.openvoice.NativeBase');
    iface.addMethod(
      'GetInfo',
      {
        in: [],
        out: dbus.Define(String),
      },
      this._onGetInfo.bind(this)
    );
    iface.addMethod(
      'onCreate',
      {
        in: [dbus.Define(String)],
        out: dbus.Define(Boolean),
      },
      this._onGetEvent.bind(this, 'create')
    );
    iface.addMethod(
      'onRestart',
      {
        in: [dbus.Define(String)],
        out: dbus.Define(Boolean),
      },
      this._onGetEvent.bind(this, 'restart')
    );
    iface.addMethod(
      'onRevival',
      {
        in: [dbus.Define(String)],
        out: dbus.Define(Boolean),
      },
      this._onGetEvent.bind(this, 'revival')
    );
    iface.addMethod(
      'onResume',
      {
        in: [],
        out: dbus.Define(Boolean),
      },
      this._onGetEvent.bind(this, 'resume')
    );
    iface.addMethod(
      'onPause',
      {
        in: [],
        out: dbus.Define(Boolean),
      },
      this._onGetEvent.bind(this, 'pause')
    );
    iface.addMethod(
      'onStop',
      {
        in: [],
        out: dbus.Define(Boolean),
      },
      this._onGetEvent.bind(this, 'stop')
    );
    iface.addMethod(
      'onDestroy',
      {
        in: [],
        out: dbus.Define(Boolean),
      },
      this._onGetEvent.bind(this, 'destroy')
    );
    iface.addMethod(
      'onRapture',
      {
        in: [],
        out: dbus.Define(Boolean),
      },
      this._onGetEvent.bind(this, 'rapture')
    );
    iface.addMethod(
      'onEvent',
      {
        in: [dbus.Define(String)],
        out: dbus.Define(Boolean),
      },
      this._onGetEvent.bind(this, 'event')
    );
    iface.addMethod(
      'onVoiceCommand',
      {
        in: [
          dbus.Define(String),  // asr
          dbus.Define(String),  // nlp
          dbus.Define(String),  // action
        ],
        out: dbus.Define(Boolean),
      },
      this._onGetEvent.bind(this, 'voice command')
    );
    // signals
    iface.addSignal('StartActivity', {
      types: [
        dbus.Define(String),  // appid
        dbus.Define(String),  // context
      ]
    });
    iface.addSignal('OpenSiren', {
      types: [dbus.Define(Boolean)]
    });
    iface.addSignal('Finish', {
      types: []
    });
    iface.update();
    this._iface = iface;
  }
}

exports.NativeApp = NativeApp;
