'use strict';

var volume = require('@rokid/volume');

module.exports = function(app) {
  app.on('ready', function () {
    console.log(this.getAppId() + ' app ready');
  });
  app.on('onrequest', function (nlp, action) {
    if (nlp.intent === 'showvolume') {
      var vol = parseInt(volume.get() / 10);
      app.tts.say(`当前音量${vol}`, function() {
        app.exit();
      });
    } else {
      app.exit();
    }
  });
};
