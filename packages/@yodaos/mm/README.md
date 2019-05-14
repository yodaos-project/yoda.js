# @yodaos/mm

Application test facilities.

## Usage

### Create test cases

First of all, create a file suffixed by `.test.js` under your `<app-directory>/test/` directory, and fill it with following content:

```js
var mm = require('@yodaos/mm')

var AudioFocus = require('@yodaos/application').AudioFocus
var MediaPlayer = require('@yoda/multimedia').MediaPlayer

var test = mm.test
test = mm.beforeEach(test, t => {
  t.suite = mm.bootstrap()
  t.end()
})
test = mm.afterEach(test, t => {
  t.suite.teardown()
  t.end()
})

test('should speak text', t => {
  var speechSynthesis = t.suite.speechSynthesis
  t.suite.audioFocus
    .on('gain', focus => {
      t.strictEqual(focus.type, AudioFocus.Type.TRANSIENT)
      speechSynthesis.startRecord()
    })
    .on('loss', focus => {
      speechSynthesis.stopRecord()
      var utters = speechSynthesis.getRecords()
      speechSynthesis.clearRecords()

      t.end()
    })

  t.suite.openUrl('yoda-app://a-url-your-app-could-understand')
})
```

## Run tests

Tests could be ran by latest version of [yoda-platform-tools](https://github.com/yodaos-project/yoda-platform-tools).

```sh
/awesome-app-home $ yoda-cli pm install .
/awesome-app-home $ yoda-cli am instrument <app-name>
```
