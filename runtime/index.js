var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var Turen = require('turen');
var dbus = require('dbus');

var appRuntime = require('./appRuntime');

// 系统配置文件
var config = require('/data/system/openvoice_profile.json');

var options = {
  host: config.host,
  port: config.port,
  key: config.key,
  secret: config.secret,
  deviceTypeId: config.device_type_id,
  deviceId: config.device_id,
};


//------------------------------------------------------

var app_runtime = new appRuntime(['/opt/test']);

var speech = new Turen.TurenSpeech();

// 监听代理事件。代理执行turen API
app_runtime.on('setStack', function (stack) {
  speech.setStack(stack);
  console.log('setStack ', stack);
});
app_runtime.on('setPickup', function (isPickup) {
  speech.setPickup(isPickup);
  console.log('setPickup ', isPickup);
});

speech.on('voice coming', function (event) {
  console.log('voice coming');
  app_runtime.onEvent('voice coming', {});
});
speech.on('voice accept', function (event) {
  console.log('voice accept');
  app_runtime.onEvent('voice accept', {});
});
speech.on('asr end', function (asr, event) {
  console.log('asr end', asr);
  app_runtime.onEvent('asr end', {
    asr: asr
  });
});
// 监听turen NLP事件
speech.on('nlp', function (response, event) {
  console.log('nlp', response);
  app_runtime.onEvent('nlp', response);
});

speech.start(options);