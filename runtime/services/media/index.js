var Service = require('./service');
var Dbus = require('dbus');
var Remote = require('../../lib/dbus-remote-call.js');
var Media = require('../../../packages/multimedia/index.js');
var logger = console;


var dbusService = Dbus.registerService('session', 'com.service.multimedia');
var dbusObject = dbusService.createObject('/multimedia/service');
var dbusApis = dbusObject.createInterface('multimedia.service');

var permit = new Remote(dbusService._dbus, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/com/permission',
  dbusInterface: 'com.rokid.permission'
});


var multimedia = new Media.MediaPlayer();

var service = new Service({
  multimedia: multimedia,
  permit: permit
});

multimedia.on('start', function (ext1, ext2, from) {
  logger.log('ttsd start', Array.prototype.slice.call(arguments, 0));
  
});
multimedia.on('end', function (id, errno) {
  logger.log('ttsd end', Array.prototype.slice.call(arguments, 0));
  
});
multimedia.on('cancel', function (id, errno) {
  logger.log('ttsd cancel', Array.prototype.slice.call(arguments, 0));
  
});
multimedia.on('error', function (id, errno) {
  logger.log('ttsd error', Array.prototype.slice.call(arguments, 0));
  
});

dbusApis.addMethod('play', {
  in: ['s', 's'],
  out: []
}, function (appId, url, cb) {
  console.log('multimedia play', appId, url);
  if (appId && url) {
    service.play(appId, url)
      .then(() => {
        cb(null);
      })
      .catch((err) => {
        cb(null);
      })
  } else {
    cb('permission deny');
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

logger.log('service multimedia started');
