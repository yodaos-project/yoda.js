#!/usr/bin/env node

'use strict';

const app = require('@rokid/ams')();

app.on('tts', function(tts, event) {
  console.log(tts);
  tts.say();
});

app.on('media', function(media, event) {
  console.log(media);
  // TODO: play the media.url
  media.play();
  console.log('playing');
});

app.start();
