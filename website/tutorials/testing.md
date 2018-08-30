
This tutorial guides you to start testing the YodaRT, that says this is not going to
be a tutorial for application developer.

To get started, please clone the project firstly:

```shell
$ git clone ssh://<your-username>@openai-corp.rokid.com:29418/jsruntime
```

Initialize this project:

```shell
$ npm install
```

> If you are slow to run the above command, you could try with yarnpkg.

### Run unit tests

Run the following commands:

```shell
$ npm test
```

Or run tests with delight nyan!
```shell
$ npm run nyan
 123 -_-_-_-_-_-_-_-_-_,------,
 0   -_-_-_-_-_-_-_-_-_|   /\_/\
 0   -_-_-_-_-_-_-_-_-^|__( ^ .^)
     -_-_-_-_-_-_-_-_-  ""  ""
  Pass!
```

Ensure you have a connected YodaOS device via ADB v1.0.39.

### How to write a unit test

YodaRT uses [shadow-tape](https://github.com/shadow-node/tape) to make you write tests easily.
A dead simple example are following:

```js
var test = require('tape')
var light = require('@yoda/light')
test('light get profile', (t) => {
  var profile = light.getProfile()
  t.equal(typeof profile.leds, 'number')
  t.equal(typeof profile.format, 'number')
  t.equal(typeof profile.maximumFps, 'number')
  t.equal(typeof profile.micAngle, 'number')
  t.end()
})
```

### Run your tests

Put the complete test file to the certain directory under `./test` and name it with suffix `.test.js`, then run `npm test`. The
program would push files to connected device, run tests and make outputs that you see.

For the complete documentation about shadow-tape, see [github.com:shadow-node/tape](https://github.com/shadow-node/tape).
