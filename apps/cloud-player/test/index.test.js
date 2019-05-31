var mm = require('@yodaos/mm')
var mock = require('@yodaos/mm/mock')

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
  t.plan(2)

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
      t.deepEqual(utters, [{ text: 'foo' }])
      t.end()
    })

  t.suite.openUrl('yoda-app://cloud-player/play?text=foo')
})

test('should play media', t => {
  t.plan(3)

  var player
  var playbackCompleted = false
  t.suite.audioFocus
    .on('gain', focus => {
      t.strictEqual(focus.type, AudioFocus.Type.DEFAULT)

      player = focus.player
      t.true(player instanceof MediaPlayer, 'player should be created before focus gained')
      player.on('playbackcomplete', () => {
        playbackCompleted = true
      })
    })
    .on('loss', focus => {
      t.true(playbackCompleted, 'playback should completed on focus loss')
      t.end()
    })

  t.suite.openUrl('yoda-app://cloud-player/play?url=/opt/media/awake_01.wav&transient=0')
})

test('should speak and play sequentially', t => {
  t.plan(4)

  var speechSynthesis = t.suite.speechSynthesis
  var player
  var speechEnd = false
  var playbackCompleted = false
  t.suite.audioFocus
    .on('gain', focus => {
      t.strictEqual(focus.type, AudioFocus.Type.DEFAULT)

      speechSynthesis.startRecord()
      speechSynthesis.on('end', () => {
        t.strictEqual(player.playing, false, 'player should not be playing on immediate of end of speech synthesis')
        speechEnd = true
      })

      player = focus.player
      mock.proxyMethod(player, 'start', {
        before: () => {
          t.true(speechEnd, 'player should start playing on end of speech synthesis')
        }
      })
      player.on('playbackcomplete', () => {
        playbackCompleted = true
      })
    })
    .on('loss', focus => {
      t.true(playbackCompleted, 'playback should completed on focus loss')
      t.end()
    })

  t.suite.openUrl('yoda-app://cloud-player/play?text=foo&url=/opt/media/awake_01.wav&transient=0&sequential=1')
})

test('should accept player control url', t => {
  t.plan(3)

  var player
  var playbackCompleted = false
  t.suite.audioFocus
    .on('gain', focus => {
      t.strictEqual(focus.type, AudioFocus.Type.DEFAULT)

      player = focus.player
      player.on('playing', () => {
        t.suite.openUrl('yoda-app://cloud-player/pause')
        t.strictEqual(focus.resumeOnGain, false)
        t.suite.openUrl('yoda-app://cloud-player/resume')
      })
      player.on('playbackcomplete', () => {
        playbackCompleted = true
      })
    })
    .on('loss', focus => {
      t.ok(playbackCompleted, 'playback should completed on focus loss')
      t.end()
    })

  t.suite.openUrl('yoda-app://cloud-player/play?url=/opt/media/awake_01.wav&transient=0')
})

test('should ignore player control if not playing', t => {
  t.plan(1)

  t.suite.audioFocus
    .on('gain', focus => {
      t.fail('unreachable path')
    })

  t.suite.openUrl('yoda-app://cloud-player/pause')
  t.suite.openUrl('yoda-app://cloud-player/resume')

  t.pass('no error expected')
})
