'use strict';

const dbus = require('dbus');
const exec = require('child_process').exec;
const cron = require('cron');
const tap = require('@rokid/tapdriver');
const tts = require('@rokid/tts');
const wifi = require('@rokid/wifi');
const volume = require('@rokid/volume');
const light = require('@rokid/lumen');
const player = require('@rokid/player');
const context = require('@rokid/context');
const logger = require('@rokid/logger')('main');

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
    this._online = null;
    this._vol = volume.volumeGet();
    this._paths = paths || ['/opt/apps'];
    this._testing = false;
    this._current = null;
    this._apps = null;
    this._skill2handler = {};

    // timers
    this._volumeTimer = null;
    this._roundTimer = null;

    // crontabs
    this._crontabs = [];

    // mqtt connection
    this._remoteChannel = null;

    // Input handle
    this._input = new InputDispatcher(this._handleInputEvent.bind(this));

    // Speech handle
    this._speech = new SpeechService();
    this._speech.on('voice', (id, event, sl, energy) => {
      context.emitVoiceEvent(`voice ${event}`, { sl, energy });
      if (!this._online) {
        if (event === 'coming') {
          this._speech.redirect('@network', {
            isBackground: true,
          });
        }
        return;
      }
      switch (event) {
        case 'coming':
          light.point(sl);
          this._doMute();
          break;
        case 'accept':
          // FIXME(Yorkie): move "mute" to "coming" event
          // this._doMute();
          context.emitVoiceEvent('pickup start');
          break;
        case 'reject':
        case 'local sleep':
          this._doUnmute();
          light.rest();
          break;
      }
      if (event === 'local sleep') {
        this._speech.exitAll();
      }
    });
    this._speech.on('speech', (id, type, asr) => {
      context.emitVoiceEvent('speech', { 
        state: type === 2 ? 'complete' : 'pending', 
        text: asr
      });
      if (!this._online)
        return;
      if (type === 2) {
        context.emitVoiceEvent('pickup end');
        this._doRound();
      }
    });
    this._speech.on('nlp ready', () => {
      if (!this._online)
        return;
      this._stopRound();
    });
    this._speech.on('lifecycle', (event, data) => {
      logger.log(event, data.appId);
      // comment it for let ro test execute complete
      // if (this._testing)
      //   return;
      const id = this._getAppId(data.appId, data.cloud);
      const form = data.form;

      if (event === 'pause') {
        this._handlePause(id, data);
      } else if (event === 'resume') {
        this._handleResume(id, data);
      } else if (event === 'stop') {
        this._handleStop(id, data);
      } else if (event === 'voice_command') {
        if (data && data.raw) {
          logger.info('asr:', data.asr);
          logger.info('nlp:', data.raw.nlp);
          logger.info('dat:', data.raw.action);
        } else {
          logger.info('nlp:', JSON.stringify(data.nlp));
        }
        this._handleVoiceCommand(data.asr, data.nlp, data.action);
      } else {
        this._handleVoiceEvent(id, event, data);
      }
      this._doUnmute();
    });
    this._speech.on('error', (err) => {
      context.emitVoiceEvent('voice error', err);
      volume.set(this._vol);
      // light._lumen.stopRound(0);
      light.rest();
    });
  }
  /**
   * @method start
   */
  start() {
    exec('touch /var/run/bootcomplete');
    this._appMgr = new AppManager(this._paths, this);
    this._input.listen();
    this._startMonitor();

    let checkTimer;
    let checkRouterTimes = 0;
    let checkNetworkTimes = 0;
    checkTimer = setInterval(() => {
      let action;
      let s = wifi.status();

      if (s === 'netserver_connected') {
        action = 'online';
      }
      if (s === 'disconnected') {
        if (checkRouterTimes >= 4) {
          action = 'offline';
        } else {
          checkRouterTimes += 1;
        }
      }
      if (s === 'netserver_disconnected') {
        if (checkNetworkTimes >= 20) {
          action = 'offline';
        } else {
          checkNetworkTimes += 1;
        }
      }

      if (action === 'online') {
        checkRouterTimes = 0;
        checkNetworkTimes = 0;
        clearInterval(checkTimer);
        this.setOnline();
      } else if (action === 'offline') {
        checkRouterTimes = 0;
        checkNetworkTimes = 0;
        clearInterval(checkTimer);
        this.setOffline();
      }
    }, 1000);

    // update process title
    logger.info(this._appMgr.toString());
    context.emitEvent('init');
  }
  /**
   * @method setOnline
   */
  setOnline() {
    if (this._online === true) {
      return;
    }
    process.title = 'vui';
    this._online = true;
    this._speech.exitCurrent();
    // login
    Promise.resolve()
      .then(() => apis.login())
      .then(() => apis.bindDevice())
      .then(() => {
        this._remoteChannel = apis.connectMqtt();
        if (this._remoteChannel) {
          this._remoteChannel.on('cloud_forward', this._onRemoteForwardCloud.bind(this));
          this._remoteChannel.on('reset_settings', this._onRemoteResetSettings.bind(this));
        }
      })
      .then(() => {
        this._startSpeech();
        context.emitEvent('online');
      })
      .catch((err) => {
        logger.error('occurrs error when online service');
        logger.error(err && err.stack);
      });
  }
  /**
   * @method setOffline
   * @param {Boolean} isBackground
   */
  setOffline(isBackground) {
    if (this._online === false) {
      return;
    }
    process.title = 'vui(offline)';
    this._online = false;
    context.emitEvent('offline');
    setTimeout(() => {
      this._speech.exitAll();
      this._speech.redirect('@network', {
        isBackground,
      });
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
        keyevents.mute(this._speech);
      } else if (event.keyCode === 26) {
        keyevents.incPower(() => {
          this._online = true;
          wifi.disconnect();
        });
      } else {
        // FIXME(Yorkie): we only exposes the keydown events for app
        const app = this._speech.getCurrentApp() || {};
        const id = this._getAppId(app.appid, app.isCloud);
        if (id) {
          logger.info(`<keyevent> code=${event.keyCode}`);
          this._handleKeyEvent(id, event);
        }
      }
    }
  }
  /**
   * @method _onRemoteForwardCloud
   */
  _onRemoteForwardCloud(data) {
    try {
      const msg = JSON.parse(data);
      const params = JSON.parse(msg.content.params);
      this._speech.mockRequest('', params.nlp, params.action);
    } catch (err) {
      logger.error(err && err.stack);
    }
  }
  /**
   * @method _onRemoteResetSettings
   */
  _onRemoteResetSettings(data) {
    if (data === '1') {
      this.say('当前不支持恢复出厂设置');
      // TODO
    }
  }
  /**
   * @method _startSpeech
   */
  _startSpeech() {
    {
      // light effects
      light.removeAllLayers();
      let layer = light.createLayer('*', { speed: 0.5 });
      layer.fade('black', 'skyblue').then(() => {
        return layer.fade('skyblue', 'black');
      }).then(() => {
        return light.removeAllLayers();
      });
    }
    {
      // hello rokid voice
      let id = Math.floor(Math.random() * 3);
      id = id === 3 ? 2 : id;
      player.play(`${__dirname}/sounds/startup${id}.ogg`);
    }
    this._speech.reload();
    const triggerWord = context.deviceConfig.triggerWord;
    if (triggerWord) {
      this._speech.insertVoiceTrigger(triggerWord.text, triggerWord.pinyin);
    }
  }
  /**
   * @method _doMute
   */
  _doMute() {
    const triggerAction = context.deviceConfig.triggerAction;
    if (triggerAction !== 'default') {
      if (triggerAction === 'disable')
        return;
      // TODO(Yorkie): support more options
    }
    if (this._volumeTimer !== null) {
      clearTimeout(this._volumeTimer);
    } else {
      this._vol = volume.get();
      volume.set(this._vol * 0.3);
    }
    this._volumeTimer = setTimeout(() => {
      volume.set(this._vol);
    }, 6000);
  }
  /**
   * @method _doUnmute
   */
  _doUnmute() {
    const triggerAction = context.deviceConfig.triggerAction;
    if (triggerAction !== 'default') {
      if (triggerAction === 'disable')
        return;
      // TODO(Yorkie): support more options
    }
    clearTimeout(this._volumeTimer);
    const curr = volume.get();
    if (curr !== 5) {
      volume.set(curr);
    } else {
      volume.set(this._vol);
    }
    this._volumeTimer = null;
  }
  /**
   * @method _doRound
   */
  _doRound() {
    light.startRound();
    this._roundTimer = setTimeout(() => {
      light.stopRound();
    }, 6000);
  }
  /**
   * @method _stopRound
   */
  _stopRound() {
    clearTimeout(this._roundTimer);
    try {
      light.stopRound();
    } catch (err) {}
  }
  /**
   * @method exitCurrent
   */
  exitCurrent() {
    this.setPickup(false);
    this._speech.exitCurrent();
  }
  /**
   * @method crontab
   * @param {String} appid
   * @param {String} expr
   * @param {Object} data
   */
  crontab(appid, expr, data) {
    // this._crontabs.push({
    //   expr, data
    // });
    new cron.CronJob({
      cronTime: expr,
      onTick: () => {
        this._speech.redirect(appid, data);
      },
      start: true,
    }).start();
    logger.log('expr:', expr);
  }
  /**
   * @method setPickup
   * @param {Boolean} val - the value if pickup mic
   */
  setPickup(val) {
    this._speech.setPickup(val);
    tap.assert('siren.statechange', val ? 'open' : 'close');
    if (val) {
      context.emitVoiceEvent('pickup start');
      this._doRound();
    } else {
      context.emitVoiceEvent('pickup end');
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
    // FIXME(Yorkie): dont handle the cloud logic here
    // if (data.cloud) {
    //   require('@rokid/player').resume();
    // }
    const handler = this._appMgr.getHandlerById(id);
    handler.emit('resume', data);
  }
  /**
   * @method _handleStop
   * @param {String} id - the appid to create
   * @param {Object} data
   */
  _handleStop(id, data) {
    const handler = this._appMgr.getHandlerById(id);
    require('@rokid/tts').stop();
    require('@rokid/player').pause();
    if (handler) {
      handler.emit('stop', data);
    }
  }
  /**
   * @method _handleVoiceEvent
   * @param {String} id - the appid to create
   * @param {Object} data
   */
  _handleVoiceEvent(id, event, data) {
    const handler = this._appMgr.getHandlerById(id);
    if (handler) {
      handler.emit(event, data);
    }
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
      if (handler && handler.constructor.name === 'NativeConnector') {
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
      logger.error(err && err.stack);
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
    this._speech.mockRequest(asr, context, action);
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
    logger.log('<vui> is alive...');
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
