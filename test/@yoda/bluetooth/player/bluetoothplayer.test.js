'use strict'

var test = require('tape')
var logger = require('logger')('blutooth')
var floraFactory = require('@yoda/flora')
var okUri = 'unix:/var/run/flora.sock'
var bluetooth = require('@yoda/bluetooth')
var flag = 1

test('start command receive success', (t) => {
  // t.plan(12)
  var recvClient = floraFactory.connect(okUri, 0)
  var msgName = 'bluetooth.a2dpsink.command'
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
  logger.info('===on==1=')
  recvClient.on('recv_post', (name, type, msg) => {
    logger.info('===on===' + JSON.stringify(msg) + '==flag==' + flag)
    switch (flag) {
      case 1:listenOn(msg, 'UNMUTE')
        break
      case 2:listenOn(msg, 'ON')
        break
      case 3:listenOn(msg, 'STOP')
        break
      case 4:listenOn(msg, 'UNMUTE')
        break
      case 5:listenOn(msg, 'PREV')
        break
      case 6:listenOn(msg, 'PAUSE')
        break
      case 7:listenOn(msg, 'UNMUTE')
        break
      case 8:listenOn(msg, 'PLAY')
        break
      case 9:listenOn(msg, 'UNMUTE')
        break
      case 10:listenOn(msg, 'NEXT')
        break
      case 11:listenOn(msg, 'MUTE')
        break
      case 12:listenOn(msg, 'OFF')
        break
      case 13:listenOn(msg, 'OFF')
        break
    }
  })

  function listenOn (msg, cmd) {
    logger.info('===listenon===' + JSON.stringify(msg) + '==cmd==' + cmd + '===flag====' + flag)
    t.equal(JSON.parse(msg.get(0)).command, cmd, 'command is equal')
    if (flag === 13) {
      recvClient.close()
      t.end()
    } else {
      flag++
    }
  }

  var player = bluetooth.getPlayer()
  setTimeout(() => {
    player.start(msgName, '1000')
    setTimeout(() => {
      player.stop()
      setTimeout(() => {
        player.prev()
        setTimeout(() => {
          player.pause()
          setTimeout(() => {
            player.play()
            setTimeout(() => {
              player.next()
              setTimeout(() => {
                player.suspend()
                setTimeout(() => {
                  player.end()
                  setTimeout(() => {
                    player.disconnect()
                  }, 1000)
                }, 1000)
              }, 1000)
            }, 1000)
          }, 1000)
        }, 1000)
      }, 1000)
    }, 1000)
  }, 1000)
})
