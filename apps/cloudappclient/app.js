'use strict'

var Directive = require('./directive').Directive
var PlayerManager = require('./playerManager')
var TtsEventHandle = require('@yodaos/ttskit').Convergence
var MediaEventHandle = require('@yodaos/mediakit').Convergence
var AudioMix = require('@yodaos/mediakit').AudioMix
var logger = require('logger')('cloudAppClient')
var property = require('@yoda/property')
var Skill = require('./skill')
var _ = require('@yoda/util')._

var Manager = require('./manager')
var Service = require('./service')

// identify if the skill should be to restored
var needResume = false

module.exports = activity => {
  // create an extapp
  var directive = new Directive()
  // playerId manager version 1
  var pm = new PlayerManager()
  // skill os
  var sos = new Manager(directive, Skill)
  // tts, media event handle
  var ttsClient = new TtsEventHandle(activity.tts)
  var mediaClient = new MediaEventHandle(activity.media, logger)
  var audioMix = new AudioMix(activity.media, logger)

  // service
  var service = new Service({
    activity: activity,
    skillMgr: sos,
    playerMgr: pm,
    ttsClient: ttsClient
  })
  service.start()

  // report app status for OS in nextTick
  var taskTimerHandle = null

  sos.on('empty', () => {
    clearTimeout(taskTimerHandle)
    taskTimerHandle = setTimeout(() => {
      logger.log('cloudAppClient was setBackground, because there is no skill to execute')
      activity.setBackground()
      // currently no skill to execute, so don't resume
      needResume = false
    }, 0)
  })
  sos.on('exit', (skill) => {
    var playerId = pm.getByAppId(skill.appId)
    if (playerId) {
      pm.deleteByAppId(skill.appId)
      activity.media.stop(playerId)
        .then(() => {
          logger.log(`${skill.appId}: media have been destroyed`)
        })
        .catch((err) => {
          logger.log(`${skill.appId}: an error occur when destroy media ${err}`)
        })
    }
    // continuous dialogue only for cloudappclient.
    if (sos.skills.length > 1 && property.get('persist.sys.pickupswitch') === 'open') {
      activity.setPickup(true)
        .then(() => {
          logger.warn(`success: open pickup for continuous dialogue after SKILL[${skill.appId}] exited.`)
        })
        .catch((err) => {
          logger.warn(`failed: open pickup for continuous dialogue after SKILL[${skill.appId}] exited. err: ${err}`)
        })
    }
  })
  // for debug and test: save playerId map to property
  pm.on('update', (handle) => {
    property.set('app.cloudappclient.player', JSON.stringify(handle))
  })

  pm.on('change', (appId, playerId) => {
    logger.log(`playerId was changed from appId(${appId}) playerId(${playerId})`)
    activity.media.stop(playerId)
      .then(() => {
        logger.log(`[pm](media, stop) appId(${appId}) res(success)`)
      })
      .catch((err) => {
        logger.log(`[pm](media, stop) appId(${appId}) err: ${err}`)
      })
  })

  directive.do('frontend', 'tts', function (dt, next) {
    logger.log(`start dt: tts.${dt.action}`)
    if (dt.action === 'say') {
      // This is the sound mixing mechanism. AudioMix will use system config If no explicit `disableSuppress` is given.
      var playerId = pm.getByAppId(dt.data.appId)
      var playerMsg = pm.getDataByPlayerId(playerId) || {}
      // The value of interrupt can be the following:
      //   - true (interrupt)
      //   - false (suppress)
      //   - undefined (system config)
      var interrupt = playerMsg.disableSuppress
      if (playerId) {
        audioMix.begin(interrupt, playerId)
      }
      ttsClient.speak(dt.data.item.tts, function (name) {
        logger.log(`end dt: tts.${dt.action} ${name}`)
        if (name === 'start') {
          sos.sendEventRequest('tts', 'start', dt.data, _.get(dt, 'data.item.itemId'))
        } else if (name === 'end') {
          // AudioMix end.
          audioMix.end()
          sos.sendEventRequest('tts', 'end', dt.data, _.get(dt, 'data.item.itemId'), next)
        } else if (name === 'cancel' || name === 'error') {
          audioMix.end()
          sos.sendEventRequest('tts', name, dt.data, _.get(dt, 'data.item.itemId'), function cancel () {
            logger.info(`end task early because tts.${name} event emit`)
            // end task early, no longer perform the following tasks
            next(true)
          })
        }
      })
    } else if (dt.action === 'cancel') {
      activity.tts.stop()
        .catch((err) => {
          logger.log(`end dt: tts.${dt.action} ${err}`)
        })
      next()
    }
  })
  directive.do('frontend', 'media', function (dt, next) {
    var playerId
    // this is for medie.start event and speedchange event.
    var eventDeferred = null
    logger.log(`exe dt: media.${dt.action}`)
    function setSpeed (speed) {
      return activity.media.setSpeed(speed, pm.getByAppId(dt.data.appId))
    }
    function setOffset (offset) {
      return activity.media.seek(offset, pm.getByAppId(dt.data.appId))
    }
    if (dt.action === 'play') {
      if (mediaClient.getUrl() === dt.data.item.url) {
        logger.log(`play forward offset: ${dt.data.item.offsetInMilliseconds} mutiple: ${dt.data.item.playMultiple}`)
        if (+dt.data.item.playMultiple > 0) {
          setSpeed(+dt.data.item.playMultiple)
            .then(() => {
              playerId = pm.getByAppId(dt.data.appId)
              pm.setDataByPlayerId(playerId, dt.data)
            })
            .catch((err) => {
              logger.error(`[cac-dt] set speed failed with error: ${err}`)
            })
        }
        // Users may need to play from the beginning
        if (dt.data.item.offsetInMilliseconds >= 0) {
          setOffset(dt.data.item.offsetInMilliseconds)
            .catch((err) => {
              logger.error(`[cac-dt] set offset failed with error: ${err}`)
            })
        }
        activity.media.resume(pm.getByAppId(dt.data.appId))
          .catch((err) => {
            logger.error(`[cac-dt] activity.media.resume error: ${err}`)
          })
        next()
      } else {
        mediaClient.start(dt.data.item.url, { multiple: true }, function (name, args) {
          logger.log(`[cac-event](${name}) args(${JSON.stringify(args)}) `)
          if (name === 'resolved') {
            pm.setByAppId(dt.data.appId, args, dt.data)
          } else if (name === 'prepared') {
            if (+dt.data.item.playMultiple > 0) {
              logger.log(`[cac-dt] setSpeed with speed(${dt.data.item.playMultiple})`)
              setSpeed(+dt.data.item.playMultiple)
                .catch((err) => {
                  logger.error(`[cac-dt] set speed failed with error: ${err}`)
                })
            }
            // Only perform operations that are not played from the beginning...
            if (dt.data.item.offsetInMilliseconds > 0) {
              logger.log(`[cac-dt] set offset with offset(${dt.data.item.offsetInMilliseconds}`)
              setOffset(dt.data.item.offsetInMilliseconds)
                .catch((err) => {
                  logger.error(`[cac-dt] set offset failed with error: ${err}`)
                })
            }
            eventDeferred = new Promise((resolve, reject) => {
              // should be always upload event to cloud even if prepard upload failed.
              sos.sendEventRequest('media', 'prepared', dt.data, {
                itemId: _.get(dt, 'data.item.itemId'),
                duration: args[0],
                progress: args[1]
              }, resolve)
            })
          } else if (name === 'paused') {
            sos.sendEventRequest('media', 'paused', dt.data, {
              itemId: _.get(dt, 'data.item.itemId'),
              duration: args[0],
              progress: args[1]
            })
          } else if (name === 'resumed') {
            sos.sendEventRequest('media', 'resumed', dt.data, {
              itemId: _.get(dt, 'data.item.itemId'),
              duration: args[0],
              progress: args[1]
            })
          } else if (name === 'playbackcomplete') {
            sos.sendEventRequest('media', 'playbackcomplete', dt.data, {
              itemId: _.get(dt, 'data.item.itemId'),
              token: _.get(dt, 'data.item.token')
            }, next)
          } else if (name === 'cancel' || name === 'error') {
            sos.sendEventRequest('media', name, dt.data, {
              itemId: _.get(dt, 'data.item.itemId'),
              token: _.get(dt, 'data.item.token'),
              duration: args[0],
              progress: args[1]
            }, function cancel () {
              logger.info(`end task early because meida.${name} event emit`)
              // end task early, no longer perform the following tasks
              next(true)
            })
          } else if (name === 'seekcomplete') {
            sos.sendEventRequest('media', 'seekcomplete', dt.data, {
              itemId: _.get(dt, 'data.item.itemId'),
              duration: args[0],
              progress: args[1]
            })
          } else if (name === 'speedchange') {
            playerId = pm.getByAppId(dt.data.appId)
            var data = pm.getDataByPlayerId(playerId)
            if (eventDeferred === null) {
              return
            }
            // The speedchange event should be upload after prepared event responded.
            eventDeferred.then(() => {
              sos.sendEventRequest('media', 'setspeed', dt.data, {
                itemId: _.get(dt, 'data.item.itemId'),
                duration: args[0],
                progress: args[1],
                speed: +data.item.playMultiple
              })
            })
          }
        })
      }
    } else if (dt.action === 'pause') {
      // no need to send events here because player will emit paused event
      activity.media.pause(pm.getByAppId(dt.data.appId))
        .catch((err) => {
          logger.log(`[cac-dt](media, pause) err: ${err}`)
        })
      next()
    } else if (dt.action === 'resume') {
      // no need to send events here because player will emit resumed event
      activity.media.resume(pm.getByAppId(dt.data.appId))
        .then(next)
        .catch((err) => {
          logger.log(`[cac-dt](media, resume) err: ${err}`)
        })
    } else if (dt.action === 'cancel') {
      playerId = pm.getByAppId(dt.data.appId)
      if (playerId) {
        pm.deleteByAppId(dt.data.appId)
        activity.media.stop(playerId)
          .catch((err) => {
            logger.log('media cancel failed', err)
          })
      }
      next()
    } else if (dt.action === 'stop') {
      playerId = pm.getByAppId(dt.data.appId)
      if (playerId) {
        pm.deleteByAppId(dt.data.appId)
        activity.media.stop(playerId)
          .catch((err) => {
            logger.log('media stop failed', err)
          })
      }
      next()
    }
  })

  directive.do('frontend', 'confirm', function (dt, next) {
    activity.setPickup(true)
      .then(() => {
        logger.log('setConfirm success')
        next()
      })
      .catch((error) => {
        logger.log('setConfirm failed: ', error)
        next()
      })
  })

  directive.do('frontend', 'pickup', function (dt, next) {
    activity.setPickup(true)
      .then(() => {
        logger.log('setPickup success')
        next()
      })
      .catch(() => {
        logger.log('setPickup failed')
        next()
      })
  })

  directive.do('frontend', 'native', function (dt, next) {
    // notice: current form default value is 'cut'
    var appId = _.get(dt, 'data.packageInfo.name', '')
    var form = _.get(dt, 'data.packageInfo.form', 'cut')
    var command = dt.data.command || ''
    // Native directives should not preempt cloudAppclient
    activity.openUrl(`yoda-skill://${appId}/?command=${command}`, { form: form, preemptive: false })
      .then(() => {
        logger.log('url open success')
        next()
      })
      .catch((err) => {
        logger.log('url open failed', err)
        next()
      })
  })

  activity.on('ready', function () {
    logger.log(this.appId + ' app ready')
    logger.log('get CONFIG from OS')
    activity.get('all')
      .then((result) => {
        logger.log('get prop success')
        sos.setEventRequestConfig(result || {})
      })
      .catch((error) => {
        logger.log('get prop error', error)
      })
  })

  activity.on('error', function (err) {
    logger.log('app error: ', err)
  })

  activity.on('create', function () {
    logger.log(`${this.appId} create`)
  })

  activity.on('pause', function () {
    logger.log(this.appId + ' paused')
    needResume = true
    sos.pause()
  })

  activity.on('resume', function () {
    logger.log(this.appId + ' resumed')
    if (needResume) {
      clearTimeout(taskTimerHandle)
      needResume = false
      sos.resume()
    }
  })
  // active event will emit when resetAwaken
  activity.on('active', function () {
    logger.log(`${this.appId} actived`)
    if (needResume) {
      clearTimeout(taskTimerHandle)
      needResume = false
      sos.resume()
    }
  })

  activity.on('request', function (nlp, action) {
    var intentType = _.get(action, 'response.action.type')
    if (!intentType) {
      logger.error(`The content of the action is wrong! The actual value is: [${action}]`)
      if (sos.skills.length === 0) {
        logger.log('there is no skill to run, setBackground because action error!')
        activity.setBackground()
      } else {
        sos.resume()
      }
      return
    }
    var appId = _.get(nlp, 'appId')
    if (appId && intentType === 'EXIT') {
      logger.warn(`The intent value is [EXIT] with appId: [${appId}]`)
      sos.destroyByAppId(appId)
      // clear domain locally and it will automatically upload to cloud
      activity.exit({ clearContext: true })
      return
    }
    if (intentType === 'EXIT') {
      logger.warn(`${this.appId}: intent value is [EXIT]`)
      sos.destroy()
      pm.clear()
      // clear domain locally and it will automatically upload to cloud
      activity.exit({ clearContext: true })
      return
    }
    logger.log(`${this.appId} app request`)
    clearTimeout(taskTimerHandle)
    sos.onrequest(nlp, action)
  })

  activity.on('destroy', function () {
    logger.log(this.appId + ' destroyed')
    var index = sos.getSceneSkillIndex()
    if (index >= 0) {
      activity.media.getPosition().then(progress => {
        logger.log('progress =', progress)
        if (sos.skills[index]) {
          sos.skills[index].setProgress(progress)
          sos.skills[index].saveRecoverData(activity)
        }
        sos.destroy()
      })
    } else {
      sos.destroy()
    }
  })
  activity.on('notification', (state) => {
    switch (state) {
      case 'on-start-shake':
        logger.log('on-start-shake')
        break
      case 'on-stop-shake':
        logger.log('on-stop-shake')
        activity.voiceCommand('下一首')
        break
      case 'on-quite-back':
        logger.log('on-quite-back')
        sos.setManualPauseFLag(true)
        sos.pause()
        break
      case 'on-quite-front':
        logger.log('on-quite-front')
        sos.setManualPauseFLag(false)
        sos.resume()
        break
    }
  })
  activity.on('url', urlObj => {
    logger.log('url is', typeof (urlObj), urlObj)
    switch (urlObj.pathname) {
      case '/resume':
        logger.log('action = ', urlObj.query.data)
        var resObj = sos.generateAction(JSON.parse(urlObj.query.data))
        logger.log('resObj = ', resObj)
        activity.setContextSkillId(resObj.appId)
        sos.onrequest(null, resObj)

        for (var i = 0; i < sos.skills.length; i++) {
          logger.log('skills = ', sos.skills[i].hasPlayer, sos.skills[i].form, sos.skills[i].saveRecoverData)
          if (sos.skills[i].hasPlayer && sos.skills[i].form === 'scene') {
            sos.skills[i].setplayerCtlData(resObj.response.action.directives[0])
          }
        }

        break
      default:
        break
    }
  })
}
