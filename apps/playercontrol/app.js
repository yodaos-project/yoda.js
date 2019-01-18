'use strict'
var logger = require('logger')('@playercontrol')
var fs = require('fs')
var util = require('util')
var DATAPATH = '/data/AppData/playercontrol/config.json'
var DIRPATH = '/data/AppData/playercontrol'
var fsStat = util.promisify(fs.stat)
var readFile = util.promisify(fs.readFile)
var writeFile = util.promisify(fs.writeFile)
module.exports = function (activity) {
  var STRING_NO_PLAYER_EXIST = '当前没在播放状态呢，如果你想听歌，请对我说，播放歌曲'

  function speakAndExit (text) {
    return activity.tts.speak(text).then(() => {
      return activity.exit()
    })
  }

  activity.on('request', function (nlp, action) {
    logger.log('player control event: request', nlp)
    if (nlp.intent === 'ROKID.INTENT.RESUME') {
      readconfig(function (playerInfo, error) {
        logger.log('have error ', error)
        if (playerInfo === null || playerInfo === undefined || playerInfo === '') {
          speakAndExit(STRING_NO_PLAYER_EXIST)
          return
        }
        logger.log('name = ', playerInfo.name)
        if (playerInfo.name === null || playerInfo.name === undefined || playerInfo.name === '') {
          speakAndExit(STRING_NO_PLAYER_EXIST)
        } else if (playerInfo.name === '@yoda/bluetooth') {
          activity.openUrl('yoda-skill://bluetooth_music/bluetooth_start_bluetooth_music', { preemptive: true })
        } else {
          logger.log('url = ', playerInfo.url)
          if (playerInfo.url === null || playerInfo.url === undefined || playerInfo.url === '') {
            speakAndExit(STRING_NO_PLAYER_EXIST)
            return
          }
          activity.openUrl(playerInfo.url, { preemptive: true })
        }
      })
    }
  })

  function readconfig (callback) {
    fsStat(DATAPATH).then(() => {
      readFile(DATAPATH, 'utf8').then((data) => {
        logger.log('data = ', data)
        callback(JSON.parse(data || '{}'), null)
      })
        .catch((error) => {
          logger.error('read data error', error.stack)
          callback(null, error)
        })
    })
      .catch((err) => {
        logger.error('read dir error', err)
        callback(null, err)
      })
  }

  function saveconfig (data) {
    fsStat(DIRPATH).then(() => {
      writeFile(DATAPATH, JSON.stringify(data)).then(() => {
        logger.log('writeFile file success', data)
      })
        .catch((excp) => {
          logger.error('playercontrol set config: update local data error', excp && excp.stack)
          return false
        })
    })
      .catch((err) => {
        if (err.code === 'ENOENT') {
          var mkdir = util.promisify(fs.mkdir)
          mkdir(DIRPATH).then(() => {
            logger.log('create dir success')
            writeFile(DATAPATH, JSON.stringify(data)).then(() => {
              logger.log('w', data)
              return true
            })
              .catch((excp) => {
                logger.error('playercontrol set config: update local data error', excp && excp.stack)
                return false
              })
          })
            .catch((error) => {
              logger.error(error)
              return false
            })
        } else {
          logger.error(err)
          return false
        }
      })
  }
  activity.on('url', urlObj => {
    logger.log('url is', typeof (urlObj), urlObj)
    switch (urlObj.pathname) {
      case '/playercontrol':
        var saveObj = {}
        saveObj.name = urlObj.query.name
        saveObj.url = urlObj.query.url
        logger.log('url is', saveObj.url)
        saveconfig(saveObj)
        break
      default:
        break
    }
  })
}
