'use strict'

var lightApp = require('./lightApp');

module.exports = function lightAppProxy (target) {
  return function (appId, runtime) {
    var handle = require(target);
    var lightapp = new lightApp(appId, runtime);
    handle(lightapp.app);
    return lightapp;
  }
}