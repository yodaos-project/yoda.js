'use strict';

const path = require('path');
const property = require('@rokid/property');
const RokidRequest = require('rokid').RokidRequest;
const host = require('/data/system/openvoice_profile.json').event_req_host;

function bindDevice(callback) {
  const userId = property.get('persist.system.user.userId');
  const syncReq = new RokidRequest({
    schemaPath: path.join(__dirname, '../proto/DeviceManager.proto'),
    requestKey: 'BindMasterRequest',
    responseKey: 'BindMasterResponse',
    host,
    pathname: '/v1/device/deviceManager/bindMaster'
  });
  syncReq.write({ userId }, callback);
}

module.exports = function() {
  return new Promise((resolve, _) => {
    bindDevice((...args) => {
      console.log(args);
      resolve();
    });
  });
};
