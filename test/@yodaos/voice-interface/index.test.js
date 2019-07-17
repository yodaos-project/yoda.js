var test = require('tape')
var bootstrap = require('./bootstrap')

test('should set/get behavior', t => {
  var voiceEngine = bootstrap()
  Promise.all([
    'Pickup',
    'Muted',
    'Vigilance'
  ].map(it => {
    return voiceEngine[`get${it}`]()
      .then(val => {
        t.strictEqual(val, false)
        return voiceEngine[`set${it}`](true)
      })
      .then(val => {
        t.strictEqual(val, true)
        return voiceEngine[`get${it}`]()
      })
      .then(val => {
        t.strictEqual(val, true)
      })
  })).then(
    () => {
      bootstrap.teardown(voiceEngine)
      t.end()
    },
    err => {
      bootstrap.teardown(voiceEngine)
      t.error(err)
      t.end()
    }
  )
})
