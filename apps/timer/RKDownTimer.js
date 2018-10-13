'use strict'

var RKTimer = require('./RKTimer').RKTimer
var RKTime = require('./RKTime').RKTime
var AudioManager = require('@yoda/audio').AudioManager
var logger = require('logger')('rktimer')
var _ = require('@yoda/util')._

var STRING_COMMON_ERROR = '我没有听清，请重新对我说一次'

function Ring (rkDownTimer) {
  this.mIsRing = false
  this.mCount = 0
  this.rkDownTimer = rkDownTimer
}

Ring.prototype.setActivity = function (activity) {
  if (this.activity != null) {
    this.activity = null
  }

  this.activity = activity
}

Ring.prototype.isRing = function () {
  return this.mIsRing
}

Ring.prototype.ring = function (uri, count) {
  this.mIsRing = true
  this.mCount = count

  logger.log('call ring')
  if (this.activity != null) {
    this.activity.setForeground()
      .then(() => {
        this.activity.media.setLoopMode(true)
        this.activity.media.on('playbackcomplete', (mediaId) => {
          this.mCount = this.mCount - 1
          logger.log('complete count: ' + this.mCount)
          if (this.mCount !== 0) {
            this.activity.media.start(uri, { streamType: 'alarm' })
          } else {
            this.mIsRing = false
            logger.log('Ring is complete. rktimer set to background')
            this.activity.setBackground()
          }
        })

        this.activity.media.start(uri, { streamType: 'alarm' })
      })
  }
}

Ring.prototype.reset = function () {
  this.mIsRing = false
  this.mCount = 0
}

Ring.prototype.stop = function () {
  if (this.mIsRing) {
    this.activity.media.stop()
  }

  this.reset()
}

function RKDownTimer () {
  this.time = new RKTime(0, 0, 0, 0)
  this.helpme = false
  this.timer = new RKTimer(0, 0, 0, 0)
  this.ring = new Ring(this)
  this.mIsPause = false
  logger.log('call constructor: mIsPause->' + this.mIsPause)
  this.nlpTime = 0
}

RKDownTimer.prototype.setActivity = function (activity) {
  if (this.activity != null) {
    this.activity = null
  }

  this.activity = activity
  this.ring.setActivity(activity)
}

RKDownTimer.prototype.speak = function (text) {
  this.interrupted()

  return this.activity.tts.speak(text)
    .then(() => this.activity.setBackground())
}
RKDownTimer.prototype.setForegroundSpeak = function (text) {
  this.interrupted()
  return this.activity.setForeground().then(() => {
    this.activity.tts.speak(text)
  })
}

// Maybe no use, later will check to delete.
RKDownTimer.prototype.speakAndExit = function (text) {
  var ismuted = AudioManager.isMuted()

  this.interrupted()

  if (ismuted) {
    AudioManager.setMute(false)
  }

  return this.activity.tts.speak(text).then(() => {
    if (ismuted) { AudioManager.setMute(true) }
    return this.activity.exit()
  })
}

RKDownTimer.prototype.timeParseToSecond = function (nlp) {
  try {
    if (nlp.slots.timesecond) {
      var second = parseInt(_.get(JSON.parse(nlp.slots.timesecond.value), 'number', 0))
      this.time.second = second
    }

    if (nlp.slots.timeminute) {
      var minute = parseInt(_.get(JSON.parse(nlp.slots.timeminute.value), 'number', 0))
      this.time.minute = minute
    }

    if (nlp.slots.timehour) {
      var hour = parseInt(_.get(JSON.parse(nlp.slots.timehour.value), 'number', 0))
      this.time.hour = hour
    }

    if (nlp.slots.helpme) {
      var helpme = parseInt(_.get(JSON.parse(nlp.slots.helpme.value), 'boolean', 0))
      this.helpme = helpme
    }
  } catch (err) {
    return this.speakAndExit(STRING_COMMON_ERROR)
  }

  var lSecond = this.time.getSecond()

  return lSecond
}

RKDownTimer.prototype.interrupted = function () {
  var pop = this.ring.isRing()
  if (pop) {
    this.ring.stop()
  }
}

/* time hour/minute/second */
RKDownTimer.prototype.countDownTimeShow = function (second) {
  var lTime = new RKTime(0, 0, 0, 0)
  lTime.setSecond(second)

  logger.log(lTime.getSecond())
}

RKDownTimer.prototype.isPause = function () {
  return this.mIsPause
}

RKDownTimer.prototype.timerCallback = function (owner, obj) {
  var ret = false
  if (obj.getSecond() === owner.time.getSecond()) {
    ret = true
    owner.timer.stop()
    owner.nlpTime = 0
    owner.close()
    logger.log('timer is arrivel. ' + obj.getSecond())
  }

  return ret
}

RKDownTimer.prototype.setup = function (nlpTime) {
  // TODO: can't get the vtname from turen. later fix it.
  var vtname = '若琪'
  var second = this.timeParseToSecond(nlpTime)
  this.mIsPause = false
  this.nlpTime = second

  logger.log('call setup second: ' + second)
  if (second <= 0) {
    return this.speak('你还没告诉我计时多久，比如：' + vtname + '计时15秒')
  }
  var ret = this.speak('将开始计时')
  this.timer.start(this.timerCallback, this)

  return ret
}

RKDownTimer.prototype.resetup = function () {
  if (this.timer.isRunning) {
    this.timer.stop()
  }

  if (this.nlpTime !== 0) {
    this.speak('重新计时开始')
    logger.log('call resetup nlpTime: ' + this.nlpTime)
    if (this.isPause()) {
      this.mIsPause = false
    }

    this.timer.start(this.timerCallback, this)
  }
}

RKDownTimer.prototype.stop = function () {
  logger.log('timer isRunning: ' + this.timer.isRunning())
  logger.log('timer isPause: ' + this.isPause())
  if (!this.timer.isRunning() && !this.isPause()) {
    this.speak('计时器未打开')
    return
  }

  this.reset()

  var text = '已帮你取消计时'
  logger.log('stop...')

  this.speak(text)
}

RKDownTimer.prototype.reset = function () {
  this.helpme = false
  this.mIsPause = false
  logger.log('call reset: mIsPause->' + this.mIsPause)
  this.nlpTime = 0

  if (this.ring.isRing()) {
    this.ring.stop()
  }

  if (this.timer.isRunning()) {
    this.timer.stop()
  }

  this.time.setSecond(this.nlpTime)
}

RKDownTimer.prototype.clear = function () {
  this.helpme = false
  this.mIsPause = false
  this.nlpTime = 0
  this.time.setSecond(this.nlpTime)
}

// TODO: check the action when intent is to close.
RKDownTimer.prototype.close = function () {
  logger.log('nlpTime: ' + this.nlpTime)
  if (this.nlpTime <= 0) {
    // TOOD: how to move to foregroud.
    // this.moveToTop()
    this.activity.setForeground()
    this.clear()
    var ret = this.setForegroundSpeak('你的倒计时时间到了')
      .then(() => {
        // TODO: the resource address
        var uri = 'system://alarm_default_ringtone.mp3'
        this.ring.ring(uri, 10)
      })
    // TODO: the resource address
    // this.activity.playSound(uri, 10)
    return ret
  }
}

RKDownTimer.prototype.pause = function (nlpTime) {
  if (this.isPause()) {
    return
  }

  if (this.timer.isRunning()) {
    this.mIsPause = true
    logger.log('call pause: mIsPause->' + this.mIsPause)
    this.timer.stop()
    this.countDownTimeShow(this.timer.getSecond())
    this.nlpTime = this.nlpTime - this.timer.getSecond()
    this.time.setSecond(this.nlpTime)
    logger.log('pause..., left time: ' + this.nlpTime)
    var text = '已暂停计时'
    this.speak(text)
  }
}

RKDownTimer.prototype.continue = function (nlpTime) {
  // TODO: can't get the vtname from turen. later fix it.
  var vtname = '若琪'
  logger.log('mIsPause: ' + this.mIsPause + 'isPause: ' + this.isPause())
  if (this.isPause()) {
    this.mIsPause = false
    logger.log('pause to start,count continue ....')
    this.speak('继续计时')
    this.timer.start(this.timerCallback, this)
  } else {
    logger.log('not pause, can\'t  continue ')
    this.speak('不是暂停状态，不能继续，你可以说：' + vtname + '计时15秒')
  }
}

RKDownTimer.prototype.usage = function () {
  // TODO: can't get the vtname from turen. later fix it.
  var vtname = '若琪'
  return this.speak(' 我现在有：开始，暂停，继续，关闭，重置计时，你可以对我说，' + vtname + '开始计时，倒计时15秒，以及暂停，继续，重新计时')
}

// TODO: destroy the timer.
RKDownTimer.prototype.destroy = function () {
  return true
}

exports.RKDownTimer = RKDownTimer
