'use strict';

const path = require('path');
const property = require('@rokid/property');
const RokidRequest = require('rokid').RokidRequest;
const host = require('/data/system/openvoice_profile.json').event_req_host;

function check(callback) {
  const version = property.get('ro.build.version.release');
  const syncReq = new RokidRequest({
    schemaPath: path.join(__dirname, '../proto/OtaCheck.proto'),
    requestKey: 'OtaCheckRequest',
    responseKey: 'OtaCheckResponse',
    host: 'apigwrest-dev.open.rokid.com',
    pathname: '/v1/extended/ota/check',
    socketFamily: 4,
  });
  syncReq.write({ version }, callback);
}

exports.check = check;
