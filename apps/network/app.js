var logger = require('logger')('@network');
var bluetooth = require('bluetooth');
var wifi = require('wifi');
var property = require('property');

module.exports = function (app) {
  var uuid = property.get('ro.boot.serialno');
  var ble = bluetooth.getBluetooth('Rokid-Me-' + uuid.substr(-6));
  var chunk = [];
  var canReceive = false;
  var total = 0;
  var bleEnable = false;
  var connecting = false;
  var connectTimeout, pooling;

  app.on('onrequest', function (nlp, action) {
    if (this.started === true) {
      return;
    }
    console.log(this.getAppId() + ' onrequest');
    this.started = true;
    this.light.setStandby();

    ble.enable('ble');
    bleEnable = true;
    ble.on('ble data', function (data) {
      logger.log(`length: ${chunk.length} data: ${data.data}`);
      if (chunk.length === 0 || data.protocol === 10759) {
        chunk = [];
        canReceive = true;
        chunk.push(data.data);
        app.light.sound('wifi/ble_connected.ogg');
        logger.log('ready to receive wifi config');
      } else if (canReceive && chunk.length === 1) {
        total = +data.data.substr(5);
        chunk.push(data.data);
        logger.log('the length of the packet is ' + total);
      } else if (canReceive && chunk.length > 1 && chunk.length < total + 2) {
        chunk.push(data.data);
      } else {
        logger.log(`Unexpected packet: ${data.data}`);
      }
      if (chunk.length === total + 2) {
        canReceive = false;
        connectWIFI((connect) => {
          if (connect) {
            ble.disable('ble');
            wifi.save();
          } else {
            logger.log('wifi connect failed');
            app.light.sound('wifi/connect_common_failure.ogg');
            connecting = false;
          }
        });
      }
    });
    ble.on('ble open', function () {
      console.log('---------->bluetooth open');
      // app.light.sound('wifi/ble_connected.ogg');
    });
    ble.on('ble close', function () {
      logger.log('ble closed. receive data: ' + data);
      connectWIFI((connect) => {
        if (!connect) {
          app.sound('wifi/connect_common_failure.ogg');
          ble.enable('ble');
          connecting = false;
        }
      });
    });
  });

  app.on('destroyed', function () {
    console.log(this.getAppId() + ' destroyed');
  });

  function connectWIFI(cb) {
    if (connecting) return;
    connecting = true;
    var data = chunk.slice(2).join('');
    // clear ble data buffer, ready for the next time
    chunk = [];
    data = JSON.parse(data);
    logger.log(`start connect to wifi with SSID: ${data.S} PSK: ${data.P}`);
    property.set('persist.system.user.userId', data.U);
    app.light.sound('wifi/prepare_connect_wifi.ogg');
    wifi.joinNetwork(data.S, data.P, '');
    getWIFIState(cb);
    connectTimeout = setTimeout(() => {
      clearTimeout(pooling);
      cb(false);
    }, 5000);
  }

  function getWIFIState(cb) {
    var state = wifi.getWifiState();
    logger.log(`wifi state is ${state}`);
    if (state === wifi.WIFI_INIVATE) {

    } else if (state === wifi.WIFI_SCANING) {

    } else if (state === wifi.WIFI_CONNECTED) {
      clearTimeout(connectTimeout);
      cb(true);
      return;
    } else if (state === wifi.WIFI_UNCONNECTED) {

    }
    pooling = setTimeout(() => {
      getWIFIState(cb);
    }, 300);
  }
}
