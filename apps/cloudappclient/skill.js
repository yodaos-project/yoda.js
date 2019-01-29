var logger = require('logger')('cloudAppClient-skill')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var _ = require('@yoda/util')._

function Skill (exe, nlp, action) {
  logger.log(action.appId + ' was create')
  EventEmitter.call(this)
  this.appId = action.appId
  this.form = action.response.action.form
  this.shouldEndSession = action.response.action.shouldEndSession
  this.directives = []
  this.lastDirectives = []
  // skill life cycle is paused
  this.paused = false
  // indicates the user has paused
  this.isSkillActive = true
  // identify if there are still tasks currently executing. such as media playing
  this.task = 0
  // identify if this skill has a player
  this.hasPlayer = false
  this.exe = exe
  this.handleEvent()
  this.transform(action.response.action.directives || [])
  this.playerCtlData = {}
}
inherits(Skill, EventEmitter)

Skill.prototype.onrequest = function (action, append) {
  var directives = _.get(action, 'response.action.directives', [])
  if (directives === undefined || directives.length <= 0) {
    return
  }
  logger.log(`--> shouldEndSession: ${this.shouldEndSession}`)
  // exit self if shouldEndSession is true
  if (this.shouldEndSession) {
    return this.emit('exit')
  }
  this.shouldEndSession = action.response.action.shouldEndSession
  logger.log(`--> update shouldEndSession: ${this.shouldEndSession}`)
  logger.log(`skill ${this.appId} onrequest`)
  this.transform(directives || [], append)
  if (this.paused === false) {
    logger.log('onrequest nextTick', this.directives)
    /**
     * fixed: tts.say -> eventReq(media.play) -> media.stop
     *                                         /----nextTick----\
     * now the order of execution is : tts.say -> media.stop -> eventReq(media.play)
     */
    process.nextTick(() => {
      logger.log('onrequest nextTick start', this.directives)
      this.emit('start')
    })
  }
}

Skill.prototype.handleEvent = function () {
  this.on('start', () => {
    logger.log(this.appId + ' emit start', this.directives)
    this.paused = false
    // In order to identify how many tasks are currently running
    this.task++
    logger.log(`[start] before task count: ${this.task}`)
    // should not resume when user manually pause or stop media
    var resume = true
    this.directives.forEach((value) => {
      // when dt have media, should not exe media resume
      if (value.type === 'media' && ['stop', 'pause', 'resume', 'play'].indexOf(value.action) > -1) {
        resume = false
      }
    })
    this.exe.execute(this.directives, 'frontend', () => {
      // A task is completed
      this.task--
      logger.info('execute end', this.appId, this.directives, this.paused)
      logger.log(`[start] after task count: ${this.task}`)
      // If the skill is in the pause state, then nothing is done.
      if (this.paused === true) {
        return
      }
      if (this.shouldEndSession) {
        return this.emit('exit')
      }
      // If there are still tasks that are not completed, do nothind.
      if (this.task > 0) {
        // The media should resume after playing tts
        // if hasPlayer is true then resume media
        logger.info('resume = ', resume)
        logger.info('hasPlayer = ', this.hasPlayer)
        logger.info('isSkillActive = ', this.isSkillActive)
        if (this.shouldEndSession === false && resume && this.hasPlayer && this.isSkillActive) {
          logger.log('media need resume, exe media.resume')
          this.exe.execute([{
            type: 'media',
            action: 'resume',
            data: {
              appId: this.appId
            }
          }], 'frontend')
        }
        return
      }
      // continue perform the remaining tasks, if any.
      // notice: directives will perform on nextTick. see Skill.prototype.onrequest for more detail.
      if (this.directives.length > 0) {
        logger.log('continue run directives on nextTick')
        return
      }
      this.directives = []
      logger.log(`${this.appId} exit because exe complete`)
      // exit self. nothing to do
      this.emit('exit')
    })
  })
  this.on('pause', (isAppPause) => {
    logger.log(this.appId + ' emit pause')
    var dts = []
    // should cancel tts if app is paused
    if (isAppPause) {
      // stop tts first. because tts needs faster response speed.
      dts.push({
        type: 'tts',
        action: 'cancel',
        data: {
          appId: this.appId
        }
      })
    }
    // need pause player if this skill has player
    if (this.hasPlayer) {
      dts.push({
        type: 'media',
        action: 'pause',
        data: {
          appId: this.appId
        }
      })
    }
    // nothing to do if dts is empty
    if (dts.length > 0) {
      this.exe.execute(dts, 'frontend')
    }
    this.paused = true
  })
  this.on('resume', () => {
    logger.log(this.appId + ' emit resume')
    this.paused = false
    if (this.isSkillActive) {
      this.exe.execute([{
        type: 'media',
        action: 'resume',
        data: {
          appId: this.appId
        }
      }], 'frontend')
      if (this.directives.length > 0) {
        // In order to identify how many tasks are currently running
        this.task++
        logger.log(`[resume] before task count: ${this.task}`)
        this.exe.execute(this.directives, 'frontend', () => {
          // A task is completed
          this.task--
          logger.log(`[resume] after task count: ${this.task}`)
          // If the skill is in the pause state, then nothing is done.
          if (this.paused === true) {
            return
          }
          if (this.shouldEndSession) {
            return this.emit('exit')
          }
          // If there are still tasks that are not completed, do nothind.
          if (this.task > 0) {
            return
          }
          // continue perform the remaining tasks, if any.
          // notice: directives will perform on nextTick. see Skill.prototype.onrequest for more detail.
          if (this.directives.length > 0) {
            logger.log('[resume] continue run directives on nextTick')
            return
          }
          this.directives = []
          // exit self. nothing to do
          this.emit('exit')
        })
      }
    } else {
      logger.info('user manually pause or stop media, should not resume')
    }
  })
  this.on('destroy', () => {
    logger.log(this.appId + ' emit destroy', this.hasPlayer)
    var dts = [{
      type: 'tts',
      action: 'cancel',
      data: {
        appId: this.appId
      }
    }]
    // need stop player if this skill has player
    if (this.hasPlayer) {
      dts.push({
        type: 'media',
        action: 'cancel',
        data: {
          appId: this.appId
        }
      })
    }
    this.exe.execute(dts, 'frontend')
  })
}
Skill.prototype.saveRecoverData = function (activity) {
  logger.log('saveRecoverData start:')
  logger.log('data = ', this.playerCtlData)
  var str = JSON.stringify(this.playerCtlData)
  logger.log('str = ', str)
  var url = 'yoda-skill://playercontrol/playercontrol?name=' + this.appId + '&url=' + encodeURIComponent('yoda-skill://cloudappclient/resume?data=' + str)
  logger.log('url = ', url)
  activity.openUrl(url, { preemptive: false })
}
Skill.prototype.setplayerCtlData = function (data) {
  this.playerCtlData = data
}
Skill.prototype.setProgress = function (data) {
  this.playerCtlData.item.offsetInMilliseconds = data
}
Skill.prototype.transform = function (directives, append) {
  logger.log(`transform start: ${this.appId} append: `, append, directives)
  if (append !== true) {
    logger.log('cover directives')
    this.directives.splice(0, this.directives.length)
  }
  if (directives === undefined || directives.length <= 0) {
    logger.log('empty directives, nothong to do')
    return
  }

  var ttsActMap = {
    'PLAY': 'say',
    'STOP': 'cancel'
  }
  var mediaActMap = {
    'PAUSE': 'pause',
    'PLAY': 'play',
    'RESUME': 'resume',
    'STOP': 'stop'
  }
  directives.forEach((ele) => {
    var tdt = {}
    if (ele.type === 'voice') {
      tdt = {
        type: 'tts',
        action: ttsActMap[ele.action],
        data: ele
      }
      tdt.data.appId = this.appId
      this.directives.push(tdt)
    } else if (ele.type === 'media') {
      tdt = {
        type: 'media',
        action: mediaActMap[ele.action],
        data: ele
      }
      tdt.data.appId = this.appId
      this.directives.push(tdt)
      // identify if this skill has player
      if (ele.action === 'PLAY') {
        this.hasPlayer = true
      }
      // identify if this skill is active
      if (['STOP', 'PAUSE'].indexOf(ele.action) > -1) {
        logger.log('skill active set false')
        this.isSkillActive = false
      }
      if (['PLAY', 'RESUME'].indexOf(ele.action) > -1) {
        logger.log('skill active set true')
        this.isSkillActive = true
      }
      this.playerCtlData = ele
      logger.log('playerCtlData === ', this.playerCtlData)
    } else if (ele.type === 'confirm') {
      tdt = {
        type: 'confirm',
        action: '',
        data: ele
      }
      tdt.data.appId = this.appId
      this.directives.push(tdt)
    } else if (ele.type === 'pickup') {
      tdt = {
        type: 'pickup',
        action: '',
        data: ele
      }
      tdt.data.appId = this.appId
      this.directives.push(tdt)
    } else if (ele.type === 'native') {
      tdt = {
        type: 'native',
        action: '',
        data: ele
      }
      tdt.data.appId = this.appId
      this.directives.push(tdt)
    }
  })
  // sort directives
  var dtOrder = {
    'native': 0,
    'tts': 1,
    'media': 2,
    'pickup': 3
  }
  this.directives = this.directives.sort(function (a, b) {
    return (dtOrder[a.type] || 100) - (dtOrder[b.type] || 100)
  })
  this.lastDirectives = Object.assign([], this.directives)
}

module.exports = Skill
