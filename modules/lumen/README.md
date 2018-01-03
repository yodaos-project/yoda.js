# node-lumen

The Lumenflinger JavaScript client for controlling LEDs with RokidOS runtime.

### Installation

```sh
$ npm install @rokid/lumen --save
```

### Get startted

`node-lumen` has the following built-in effects:

- [x] blink
- [x] round
- [ ] rainbow

```js
const light = require('@rokid/lumen');
const layer = light.createLayer([0, ...<LED number>], 1);
layer.fade('red', 'blue');
```

### License

MIT