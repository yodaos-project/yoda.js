var bootstrap = require('@yodaos/mm/bootstrap')
var test = require('tape')

test('speech synthesis test example', t => {
  var tt = bootstrap()
  var speechSynthesis = tt.speechSynthesis
  tt.audioFocus
    .on('gain', focus => {
      t.pass('focus gained')
      speechSynthesis.startRecord()
    })
    .on('loss', focus => {
      t.pass('focus lost')
      speechSynthesis.stopRecord()
      var utters = speechSynthesis.getRecords()
      speechSynthesis.clearRecords()
      t.deepEqual(utters, [{ text: 'foo' }])
      tt.teardown()
      t.end()
    })

  tt.openUrl('yoda-app://cloud-player/play?text=foo')
})
