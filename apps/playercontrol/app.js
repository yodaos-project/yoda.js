'use strict'
var logger = require('logger')('@playercontrol')
var fs = require('fs')
var util = require('util')
var DATAPATH = '/data/AppData/playercontrol/config.json'
var DIRPATH = '/data/AppData/playercontrol'

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
          activity.voiceCommand('播放蓝牙音乐')
        } else {
          logger.log('url = ', playerInfo.url)
          if (playerInfo.url === null || playerInfo.url === undefined || playerInfo.url === '') {
            speakAndExit(STRING_NO_PLAYER_EXIST)
            return
          }
          activity.openUrl(playerInfo.url, { preemptive: false })
        }
      })
    }
  })

  function readconfig (callback) {
    var fsStat = util.promisify(fs.stat)
    fsStat(DATAPATH).then(() => {
      var readFile = util.promisify(fs.readFile)
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
    var fsStat = util.promisify(fs.stat)
    fsStat(DIRPATH).then(() => {
      var writeFile = util.promisify(fs.writeFile);
        writeFile(DATAPATH, JSON.stringify(data)).then(() => {
          logger.log('writeFile file success',data)
        })
        .catch((excp) => {
          logger.error('playercontrol set config: update local data error', excp && excp.stack)
          return false
        })
    })
    .catch((err) => {
      var mkdir = util.promisify(fs.mkdir);
      mkdir(DIRPATH).then(() => {
        logger.log('create dir success')
        var writeFile = util.promisify(fs.writeFile);
        writeFile(DATAPATH, JSON.stringify(data)).then(() => {
          logger.log('writeFile file success',data)
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
    })
  }
  activity.on('url', urlObj => {
    logger.log('url is', typeof (urlObj), urlObj)
    switch (urlObj.pathname) {
      case '/playercontrol':
        var saveObj = {}
        var url = urlObj.href.split('&url=')[1]
        logger.log('split url is', url)
        saveObj.name = urlObj.query.name
        saveObj.url = url
        saveconfig(saveObj)
        break
      default:
        break
    }
  })
}
