'use strict';

var AudioManager = require('audio').AudioManager;

module.exports = function(activity) {
  activity.on('onrequest', function(nlp, action) {
    if (nlp.intent === 'showvolume') {
      var vol = Math.floor(AudioManager.getVolume() / 10);
      activity.tts.speak(`当前音量为${vol}`, () => {
        console.log('exit volume');
        activity.exit();
      });
    } else {
      activity.exit();
    }
  });
};
