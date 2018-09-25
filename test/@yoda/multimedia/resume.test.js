
var test = require('tape')
var MediaPlayer = require('@yoda/multimedia').MediaPlayer

test('shall restart media if player is stopped previously', t => {
  t.plan(3)
  var player = new MediaPlayer()
  player.on('error', err => {
    t.error(err)
    t.fail('no error shall be emitted')
  })

  t.doesNotThrow(() => {
    player.start('/opt/media/startup0.ogg')
  })

  setTimeout(() => {
    t.doesNotThrow(() => {
      player.stop()
    })

    t.doesNotThrow(() => {
      player.resume()
    })
  }, 2000)
})
