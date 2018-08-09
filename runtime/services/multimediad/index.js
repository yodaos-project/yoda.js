var Service = require('./service');
var Dbus = require('dbus');
var Remote = require('../../lib/dbus-remote-call.js');
var Media = require('multimedia');
var logger = console;


var dbusService = Dbus.registerService('session', 'com.service.multimedia');
var dbusObject = dbusService.createObject('/multimedia/service');
var dbusApis = dbusObject.createInterface('multimedia.service');

var permit = new Remote(dbusService._dbus, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/com/permission',
  dbusInterface: 'com.rokid.permission'
});


var service = new Service({
  multimedia: Media.MediaPlayer,
  permit: permit
});

service.on('prepared', function (id, dur, pos) {
  logger.log('multimediad prepared', Array.prototype.slice.call(arguments, 0));
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ssss',
    [id ,'start', dur, pos]
  );
});
service.on('playbackcomplete', function (id) {
  logger.log('multimediad playback complete', Array.prototype.slice.call(arguments, 0));
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'end']
  );
});
service.on('bufferingupdate', function (id) {
  logger.log('multimediad buffering update', Array.prototype.slice.call(arguments, 0));
});
service.on('seekcomplete', function (id) {
  logger.log('multimediad seek complete', Array.prototype.slice.call(arguments, 0));
});
service.on('error', function (id) {
  logger.log('multimediad error', Array.prototype.slice.call(arguments, 0));
  dbusService._dbus.emitSignal(
    '/multimedia/service',
    'multimedia.service',
    'multimediadevent',
    'ss',
    [id, 'error']
  );
});

dbusApis.addMethod('play', {
  in: ['s', 's'],
  out: ['s']
}, function (appId, url, cb) {
  console.log('multimedia play', appId, url);
  if (appId && url) {
    service.play(appId, url)
      .then((id) => {
        logger.log('return', id, typeof id);
        cb(null, id);
      })
      .catch((err) => {
        cb(null, '-1');
      })
  } else {
    cb('permission deny');
  }
});

dbusApis.addMethod('cancel', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  console.log('multimedia cancel', appId);
  if (appId) {
    service.cancel(appId);
    cb(null);
  } else {
    cb('permission deny');
  }
});

dbusApis.addMethod('pause', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  console.log('multimedia pause', appId);
  if (appId) {
    service.pause(appId);
    cb(null);
  } else {
    cb('permission deny');
  }
});

dbusApis.addMethod('resume', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  console.log('multimedia resume', appId);
  if (appId) {
    service.resume(appId);
    cb(null);
  } else {
    cb('permission deny');
  }
});

dbusApis.update();

logger.log('service multimedia started');