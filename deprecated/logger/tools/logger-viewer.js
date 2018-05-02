'use strict';

var net = require('net');
var socket = net.connect(19788, () => {
  console.log('connected to vui process');
});
socket.on('data', function(chunk) {
  console.log(chunk + '');
});
