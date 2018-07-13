'use strict';

var TtsWrap = require('./tts.node').TtsWrap;
function createHandle(options) {
  var handle = new TtsWrap();
  handle.prepare(
    options.host || 'apigwws.open.rokid.com', 443, '/api',
    options.key,
    options.deviceTypeId,
    options.deviceId,
    options.secret,
    options.declaimer || 'zh');
  return handle;
}

exports.createHandle = createHandle;

