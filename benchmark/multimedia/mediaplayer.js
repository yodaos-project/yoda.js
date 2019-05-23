'use strict'

var MediaPlayer = require('@yoda/multimedia').MediaPlayer

function play (callback) {
  var player = new MediaPlayer()
  player.setDataSource('/opt/media/alarm_default_ringtone.mp3')
  player.prepare()
  player.start()
  player.on('playing', () => {
    player.stop()
    callback()
  })
}

function main () {
  var start = process.hrtime()
  play(() => {
    var end = process.hrtime()
    var secs = end[0] - start[0]
    var nanosecs = end[1] - start[1]
    if (nanosecs < 0) {
      --secs
      nanosecs += 1 * Math.pow(10, 9)
    }
    console.log('takes', secs, nanosecs / Math.pow(10, 6), 'millisecs')
  })
}

main()
