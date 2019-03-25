var MediaPlayer = require('@yoda/multimedpa').MediaPlayer
var _ = require('@yoda/util')._

function loop () {
  var player = new MediaPlayer()
  player.start('/opt/media/awake_01.wav')
  player.on('playbackcomplete', () => {
    setTimeout(() => player.seek(0), Math.random() * 10)
  })
}

_.times(15).forEach(() => loop())

process.on('SIGINT', () => process.exit(0))
