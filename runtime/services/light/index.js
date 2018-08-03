var Service = require('./service');
var Dbus = require('dbus');
var Remote = require('../../lib/dbus-remote-call.js');
var Light = require('/opt/packages/light');
var soundplayer = require('/opt/packages/multimedia').MediaPlayer;
var logger = console;


var dbusService = Dbus.registerService('session', 'com.service.light');
var dbusObject = dbusService.createObject('/rokid/light');
var dbusApis = dbusObject.createInterface('com.rokid.light.key');

var permit = new Remote(dbusService._dbus, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/com/permission',
  dbusInterface: 'com.rokid.permission'
});

Light.enable();

var service = new Service({
  light: Light,
  soundplayer: soundplayer,
  permit: permit
});

dbusApis.addMethod('setAwake', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setAwake();
  cb(null);
});

dbusApis.addMethod('setDegree', {
  in: ['s', 's'],
  out: []
}, function (appId, degree, cb) {
  service.setDegree(+degree);
  cb(null);
});

dbusApis.addMethod('setLoading', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setLoading();
  cb(null);
});

dbusApis.addMethod('setHide', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setHide();
  cb(null);
});

dbusApis.addMethod('setStandby', {
  in: ['s'],
  out: []
}, function (appId, cb) {
  service.setStandby();
  cb(null);
});

dbusApis.addMethod('appSound', {
  in: ['s', 's'],
  out: []
}, function (appId, name, cb) {
  service.appSound(appId, name);
  cb(null);
});

dbusApis.addMethod('setWelcome', {
  in: [],
  out: []
}, function (cb) {
  service.setWelcome();
  cb(null);
});

dbusApis.update();

logger.log('light service started');