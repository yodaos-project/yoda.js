'use strict';

var wifi = require('wifi');

module.exports = function(app) {
  app.on('ready', function () {
    console.log(this.getAppId() + ' app ready');
  });
  app.on('onrequest', function (nlp, action) {
    if (nlp.intent === 'disconnect_network') {
      wifi.disableAll();
      app.exit();
    } else if (nlp.intent === 'sleep' ||
      nlp.intent === 'dormancy' || 
      nlp.intent === 'usersleep' ||
      nlp.intent === 'ROKID.SYSTEM.EXIT') {
      app.destroyAll();
    } else {
      app.tts.say('什么设置', function() {
        app.exit();
      });
    }
  });
};
