'use strict';

module.exports = function(activity) {

  var texts = require('./texts.json');

  function random(max) {
    return Math.floor(Math.random() * max);
  }

  function speakAndExit(text) {
    return activity.tts.speak(text, () => activity.exit());
  }

  activity.on('onrequest', function(nlp, action) {
    var intentTexts = texts[nlp.intent];
    if(intentTexts !== undefined) {
      speakAndExit(intentTexts[random(intentTexts.length)]);
    } else {
      activity.exit();
    }
  });
};
