var mm = require('@yodaos/mm')

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
  t.plan(3)

  var app = t.suite.getApplication()
  t.suite.audioFocus
    .on('gained', focus => {
      t.strictEqual(app.voices.length, 1)
      t.strictEqual(app.voices[0], focus)
    })
    .on('lost', () => {
      t.strictEqual(app.voices.length, 0)
      t.end()
    })

  t.suite.openUrl('yoda-app://cloud-player/play?text=foo')
})
