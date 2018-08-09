var Service = require('./service');
var Dbus = require('dbus');
var Remote = require('../../lib/dbus-remote-call.js');
var TtsWrap = require('tts');
var logger = console;

var CONFIG = require('/data/system/openvoice_profile.json');

var dbusService = Dbus.registerService('session', 'com.service.tts');
var dbusObject = dbusService.createObject('/tts/service');
var dbusApis = dbusObject.createInterface('tts.service');

var permit = new Remote(dbusService._dbus, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/com/permission',
  dbusInterface: 'com.rokid.permission'
});


var tts = TtsWrap.createTts({
  key: CONFIG.key,
  deviceTypeId: CONFIG.device_type_id,
  deviceId: CONFIG.device_id,
  secret: CONFIG.secret
});


var service = new Service({
  tts: tts,
  permit: permit
});

tts.on('start', function (id, errno) {
  logger.log('ttsd start', id);
  dbusService._dbus.emitSignal(
    '/tts/service',
    'tts.service',
    'ttsdevent',
    'ss',
    [''+id, 'start']
  );
});
tts.on('end', function (id, errno) {
  logger.log('ttsd end', id);
  dbusService._dbus.emitSignal(
    '/tts/service',
    'tts.service',
    'ttsdevent',
    'ss',
    [''+id, 'end']
  );
});
tts.on('cancel', function (id, errno) {
  logger.log('ttsd cancel', id);
  dbusService._dbus.emitSignal(
    '/tts/service',
    'tts.service',
    'ttsdevent',
    'ss',
    [''+id, 'cancel']
  );
});
tts.on('error', function (id, errno) {
  logger.log('ttsd error', id);
  dbusService._dbus.emitSignal(
    '/tts/service',
    'tts.service',
    'ttsdevent',
    'ss',
    [''+id, 'error']
  );
});

dbusApis.addMethod('say', {
  in: ['s', 's'],
  out: ['s']
}, function (appId, text, cb) {
  console.log('tts speak', appId, text);
  if (appId && text) {
    service.say(appId, text)
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

dbusApis.addMethod('cancel', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  console.log('tts cancel', appId);
  if (appId) {
    service.cancel(appId);
    cb(null);
  } else {
    cb('permission deny');
  }
});

dbusApis.update();

logger.log('service tts started');