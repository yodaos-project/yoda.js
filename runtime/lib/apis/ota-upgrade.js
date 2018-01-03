'use strict';

const fs = require('fs');
const exec = require('child_process').exec;
const check = require('./ota-check').check;
const property = require('@rokid/property');

function checkUpgrade(cb) {
  check((err, data) => {
    if (!data.authorize || !data.imageUrl)
      return;
    const child = exec(`shadowgrade ${data.imageUrl}`, (err, stdout, stderr) => {
      if (err) {
        console.error(err && err.stack);
        return;
      }
      const json = JSON.stringify(data.toJSON(), null, 2);
      fs.writeFile('/data/ota_upgrade.json', json, 'utf8');
      if (typeof cb === 'function')
        cb();
    });
  });
}

exports.checkUpgrade = checkUpgrade;