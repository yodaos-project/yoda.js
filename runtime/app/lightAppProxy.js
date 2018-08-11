var lightApp = require('./lightApp.js');

module.exports = function (target) {
  return function (appId, runtime) {
    var handle = require(target);
    var lightapp = new lightApp(appId, runtime);
    handle(lightapp.app);
    return lightapp;
  }
}