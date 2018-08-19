'use strict'

var Service = require('./service');
var Dbus = require('dbus');
var Remote = require('../../lib/dbus-remote-call.js');
var TtsWrap = require('tts');
var logger = require('logger')('ttsd');

var dbusService = Dbus.registerService('session', 'com.service.tts');
var dbusObject = dbusService.createObject('/tts/service');
var dbusApis = dbusObject.createInterface('tts.service');

var permit = new Remote(dbusService._dbus, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/com/permission',
  dbusInterface: 'com.rokid.permission'
});


var tts = null;

var service = new Service({
  tts: tts,
  permit: permit
});

function reConnect(CONFIG) {
  if (tts) {
    tts.disconnect();
    tts.removeAllEventListeners();
    tts = null;
  }

  process.nextTick(function() {
    tts = TtsWrap.createTts({
      key: CONFIG.key,
      deviceTypeId: CONFIG.deviceTypeId,
      deviceId: CONFIG.deviceId,
      secret: CONFIG.secret
    });

    tts.on('start', function (id, errno) {
      logger.log('ttsd start', id);
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'ss',
        ['' + id, 'start']
      );
    });
    tts.on('end', function (id, errno) {
      logger.log('ttsd end', id);
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'ss',
        ['' + id, 'end']
      );
    });
    tts.on('cancel', function (id, errno) {
      logger.log('ttsd cancel', id);
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'ss',
        ['' + id, 'cancel']
      );
    });
    tts.on('error', function (id, errno) {
      logger.log('ttsd error', id);
      dbusService._dbus.emitSignal(
        '/tts/service',
        'tts.service',
        'ttsdevent',
        'ss',
        ['' + id, 'error']
      );
    });
  });
}

dbusApis.addMethod('connect', {
  in: ['s'],
  out: ['b']
}, function (config, cb) {
  logger.log('ttsd restart trigger by upadte config');
  setTimeout(() => {
    reConnect(JSON.parse(config));
  }, 1000);
  cb(null, true);
});

dbusApis.addMethod('speak', {
  in: ['s', 's'],
  out: ['s']
}, function (appId, text, cb) {
  logger.log('tts speak', appId, text);
  if (appId && text) {
    service.speak(appId, text)
      .then((id) => {
        cb(null, '' + id);
      })
      .catch((err) => {
        cb(null, '-1');
      });
  } else {
    cb('permission deny', '-1');
  }
});

dbusApis.addMethod('stop', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  logger.log('tts cancel', appId);
  if (appId) {
    service.stop(appId);
    cb(null);
  } else {
    cb('permission deny');
  }
});

dbusApis.update();
logger.log('service tts started');
