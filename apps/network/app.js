var logger = require('logger')('@network');
var bluetooth = require('bluetooth');
var wifi = require('wifi');
var property = require('property');

module.exports = function (app) {
  app.on('ready', function () {
    console.log(this.getAppId() + ' app ready');
  });
  
  app.on('error', function (err) {
    console.log('app error: ', err);
  });
  
  app.on('created', function () {
    console.log(this.getAppId() + ' created');
  });
  
  app.on('paused', function () {
    console.log(this.getAppId() + ' paused');
  });
  
  app.on('resumed', function () {
    console.log(this.getAppId() + ' resumed');
  });
  
  app.on('onrequest', function (nlp, action) {
    console.log(this.getAppId() + ' onrequest');
    if (this.started === true) {
      return;
    }
    this.started = true;
    this.light.setStandby();
    var uuid = property.get('ro.boot.serialno');
    var ble = bluetooth.getBluetooth('Rokid-Me-' + uuid.substr(-6));
    var chunk = [];
    var canReceive = false;
    var total = 0;
    ble.enable('ble');
    ble.on('ble data', function (data) {
      logger.log('length:' + chunk.length + ' data:' + data.data);
      if (chunk.length === 0) {
        if (data.protocol === 10759) {
          canReceive = true;
          chunk.push(data.data);
          app.light.sound('wifi/ble_connected.ogg');
          logger.log('ready to receive wifi config');
        } else {
          canReceive = false;
          logger.log('handshake protocol was wrong, ignore data');
        }
      } else if (canReceive && chunk.length === 1) {
        total = +data.data.substr(5);
        chunk.push(data.data);
        logger.log('the length of the packet is ' + total);
      } else if (canReceive && chunk.length > 1 && chunk.length < total + 2) {
        chunk.push(data.data);
      }
    });
    ble.on('ble open', function () {
      console.log('---------->bluetooth open');
      // app.light.sound('wifi/ble_connected.ogg');
    });
    ble.on('ble close', function () {
      var data = chunk.slice(2).join('');
      logger.log('ble closed. receive data: ' + data);
      app.light.sound('wifi/prepare_connect_wifi.ogg');
      data = JSON.parse(data);
      wifi.joinNetwork(data.S, data.P, '');
      property.set('persist.system.user.userId', data.U);
    });
  });
  
  app.on('destroyed', function () {
    console.log(this.getAppId() + ' destroyed');
  });
}
