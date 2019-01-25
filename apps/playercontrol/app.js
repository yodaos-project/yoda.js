'use strict'
var logger = require('logger')('@playercontrol')
var fs = require('fs')
var util = require('util')
var DATAPATH = '/data/AppData/playercontrol/config.json'
var DIRPATH = '/data/AppData/playercontrol'
var fsStat = util.promisify(fs.stat)
var readFile = util.promisify(fs.readFile)
var writeFile = util.promisify(fs.writeFile)
var mkdir = util.promisify(fs.mkdir)
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
      readconfig()
        .then(playerInfo => {
          logger.log('playerInfo ', playerInfo)
          if (playerInfo === null || playerInfo === undefined || playerInfo === '') {
            speakAndExit(STRING_NO_PLAYER_EXIST)
            return
          }
          logger.log('name = ', playerInfo.name)
          if (playerInfo.name === null || playerInfo.name === undefined || playerInfo.name === '') {
            speakAndExit(STRING_NO_PLAYER_EXIST)
          } else if (playerInfo.name === 'RDDE53259D334860BA9E98CB3AB6C001') {
            activity.openUrl('yoda-skill://bluetooth_music/bluetooth_start_bluetooth_music', { form: 'scene', preemptive: true })
          } else {
            logger.log('url = ', playerInfo.url)
            if (playerInfo.url === null || playerInfo.url === undefined || playerInfo.url === '') {
              speakAndExit(STRING_NO_PLAYER_EXIST)
              return
            }
            activity.openUrl(playerInfo.url, { form: 'scene', preemptive: true })
          }
        })
    }
  })

  function readconfig () {
    return fsStat(DATAPATH)
      .then(() => {
        return readFile(DATAPATH, 'utf8')
      })
      .then((data) => {
        logger.log('data = ', data)
        return JSON.parse(data || '{}')
      })
      .catch(err => {
        logger.error('unexpected error on read config', err.stack)
        return {}
      })
  }

  function saveconfig (data) {
    return fsStat(DIRPATH)
      .then(() => {
        return writeFile(DATAPATH, JSON.stringify(data))
      })
      .catch((err) => {
        if (err.code === 'ENOENT') {
          return mkdir(DIRPATH)
            .then(() => {
              logger.log('create dir success')
              return writeFile(DATAPATH, JSON.stringify(data))
            })
            .catch((error) => {
              logger.error('unexpected error on saveconfig', error.stack)
              return {}
            })
        } else {
          logger.error('unexpected error on saveconfig ex', err)
          return {}
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
