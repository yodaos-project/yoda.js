var light = require('./index');

var buffer = new Buffer(36);
buffer.fill(255);
buffer.writeUInt8(50, 3);
buffer.writeUInt8(50, 4);
buffer.writeUInt8(255, 5);


light.enable();
light.write(buffer);
