'use strict';

const tts = require('@rokid/tts');

tts.say('中午好，若琪为您播放午间新闻摘要<silence=1></silence>首先为您关注国际新闻<silence=1></silence>据朝鲜日报中文网报道', () => {
  tts.say('hello');
});

setInterval(() => {
  console.log('alive....');
}, 3000);

