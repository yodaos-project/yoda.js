'use strict';

const socket = require('abstract-socket');
const namespace = '\0tapagent';

let enabled = false;
let connected = false;
let writter = null;
let prequeue = [];

function enable() {
  enabled = true;
  socket.connect(namespace, (connection) => {
    writter = connection;
    writter.on('error', disable);
    writter.on('end', disable);
    writter.write('ok\n');
    if (prequeue.length > 0) {
      for (let i = 0; i < prequeue.length; i++) {
        const item = prequeue[i];
        _assert(item.key, item.val);
      }
      prequeue = [];
    }
    connected = true;
  });
}

function disable() {
  if (writter && writter.end)
    writter.end();
  enabled = false;
  connected = false;
  writter = null;
}

function assert(key, val) {
  if (!enabled) return;
  if (!connected) {
    prequeue.push({key, val});
  } else {
    _assert(key, val);
  }
}

function _assert(key, val) {
  writter.write(`ok ${key} ${JSON.stringify(val,null,0)}\n`);
}

exports.enable = enable;
exports.disable = disable;
exports.assert = assert;
exports.namespace = namespace;
