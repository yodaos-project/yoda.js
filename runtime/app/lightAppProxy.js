'use strict'

var lightApp = require('./lightApp');
var logger = require('logger')('lightAppProxy');

module.exports = function lightAppProxy(target) {
  return function (appId, runtime) {
    logger.log(`load target: ${target}/package.json`);
    var pkg = require(`${target}/package.json`);
    var main = `${target}/${pkg.main || 'app.js'}`;

    logger.log(`load main: ${main}`);
    var handle = require(main);
    var lightapp = new lightApp(appId, runtime);
    lightApp.appHome = target;
    handle(lightapp.app);
    return lightapp;
  };
};