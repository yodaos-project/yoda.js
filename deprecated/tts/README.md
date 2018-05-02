# node-tts

Rokid TextToSpeech Node.js API library.

### Installation

> System builtin module

Or via NPM

```sh
$ npm install @rokid/tts --save
```

### Usage

```js
const tts = require('@rokid/tts');
tts.say('hello', (err) => {
  console.log('got callback');
});

setTimeout(function() {
  tts.stop();
}, 3000);
```
