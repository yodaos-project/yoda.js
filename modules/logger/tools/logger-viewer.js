'use strict';

var net = require('net');
net.connect(19788, (socket) => {
  socket.on('data', (chunk) => {
    console.log(chunk + '');
  });
});
