'use strict'
var logger = require('logger')('@playercontrol')
var fs = require('fs')
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
      readconfig(function (playerInfo) {
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
    try {
      var stat = fs.statSync(DIRPATH)
      // 为true的话那么存在，如果为false不存在
      if (stat.isDirectory()) {
        try {
          fs.statSync(DATAPATH)
          // 如果可以执行到这里那么就表示存在了
          fs.readFile(DATAPATH, 'utf8', function readFileCallback (err, data) {
            if (err) {
              logger.error('read data error', err.stack)
              callback(null)
            }
            logger.log('data = ', data)
            callback(JSON.parse(data || '{}'))
          })
        } catch (e) {
          // 捕获异常
          logger.error('read data error1', e)
          callback(null)
        }
      }
    } catch (err) {
      logger.error('read dir error', err)
      callback(null)
    }
  }

  function saveconfig (data) {
    try {
      var stat = fs.statSync(DIRPATH)
      // 为true的话那么存在，如果为false不存在
      if (stat.isDirectory()) {
        try {
          fs.writeFile(DATAPATH, JSON.stringify(data), function (err) {
            if (err) {
              logger.error('playercontrol set config: update local data error', err && err.stack)
            }
          })
        } catch (e) {
          // 捕获异常
          logger.error('writeFile data error', e)
        }
      }
    } catch (e) {
      fs.mkdir(DIRPATH, function (error) {
        if (error) {
          logger.error(error)
          return false
        }
        logger.log('创建目录成功')
        fs.writeFile(DATAPATH, JSON.stringify(data), function (err) {
          if (err) {
            logger.error('playercontrol set config: update local data error', err && err.stack)
          }
        })
      })
    }
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
