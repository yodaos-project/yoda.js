'use strict';

const assert = require('assert');
const player = require('@rokid/rplay');
const url = 'https://music-proxy.rokid-inc.com/'+
            'content/01/245/1245352-MP3-320K-FTD.mp3'+
            '?sign=p8sDiQmqAYkZ9jR5wiWTSw8CAnFhPTEwM'+
            'DM5ODY3Jms9QUtJRE1Fdm53SXdwNFlqUlU1NHhx'+
            'd3VLQlRYMExOOWdJVFNRJmU9MTUwMzY0Njk1MSZ'+
            '0PTE1MDM0NzQxNTEmcj0xOTU3OTgxMjMzJmY9L2'+
            'NvbnRlbnQvMDEvMjQ1LzEyNDUzNTItTVAzLTMyM'+
            'EstRlRELm1wMyZiPXVsdGltYXRl&transDelive'+
            'ryCode=RK@21829674@1503474151@S';

player.play(url, (media) => {
  let paused = false;
  media.on('paused', () => paused = true);
  media.on('resume', () => {
    assert.equal(paused, true);
    process.exit();
  });
  setTimeout(() => player.pause(), 2000);
  setTimeout(() => player.resume(), 3000);
});
