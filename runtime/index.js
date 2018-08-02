// var EventEmitter = require('events').EventEmitter;
// var inherits = require('util').inherits;
var Turen = require('/opt/packages/turen');
// var dbus = require('dbus');
// var cloudApi = require('./cloudapi/index');
var Volume = require('/opt/packages/volume');
var appRuntime = require('./appRuntime');
var wifi = require('/opt/packages/wifi');
var logger = require('/opt/packages/logger')('main');


//------------------------------------------------------

var app_runtime = new appRuntime(['/opt/test']);
app_runtime.volume = Volume;
Volume.set(60);

var speech = new Turen.TurenSpeech();

// 监听代理事件。代理执行turen API
app_runtime.on('setStack', function (stack) {
  speech.setStack(stack);
  logger.log('setStack ', stack);
});
app_runtime.on('setPickup', function (isPickup) {
  speech.setPickup(isPickup);
  logger.log('setPickup ', isPickup);
});

speech.on('voice coming', function (event) {
  logger.log('voice coming');
  app_runtime.onEvent('voice coming', {});
});
speech.on('voice local awake', function (event) {
  logger.log('voice local awake');
  app_runtime.onEvent('voice local awake', event);
});
speech.on('asr pending', function (asr) {
  logger.log('asr pending', asr);
  app_runtime.onEvent('asr pending', asr);
});
speech.on('asr end', function (asr, event) {
  logger.log('asr end', asr);
  app_runtime.onEvent('asr end', {
    asr: asr
  });
});
// speech.on('raw event', (event) => {
//   logger.log(JSON.stringify(event));
// });
// 监听turen NLP事件
speech.on('nlp', function (response, event) {
  logger.log('nlp', response);
  app_runtime.onEvent('nlp', response);
});

var config = require('/data/system/openvoice_profile.json');

var options = {
  host: config.host,
  port: config.port,
  key: config.key,
  secret: config.secret,
  deviceTypeId: config.device_type_id,
  deviceId: config.device_id,
};
speech.start(options);

// // 登录、绑定、注册mqtt
// cloudApi.connect().then((mqttAgent) => {
//   // 系统配置文件
// }).catch((err) => {
//   logger.error(err);
// });

var netStatus = wifi.getNetworkState();
if (netStatus === 3) {
  app_runtime.onEvent('disconnected', {});
}