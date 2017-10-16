#!/usr/bin/env node

'use strict';

const dbus = require('dbus').getBus('session');
dbus.getInterface(
  'com.rokid.AmsExport', 
  '/rokid/openvoice', 
  'rokid.openvoice.AmsExport',
  main);

function main(err, vui) {
  // Ping the vui-daemon...
  vui.Ping((...args) => {
    console.log('ping success', args);
  });
}
