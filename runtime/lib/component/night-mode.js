'use strict'

var property = require('@yoda/property')
var logger = require('logger')('nightmode')

var FSMCode = {
  Start: 0,
  End: 254,
  WaitAsync: 255,
  
  CheckSwitchOn: 1,
  CheckSwitchOff: 2,
  CheckStatusOff: 3,
  CheckStatusOn: 4,
  NightModeDisabled: 5,
  CheckStatusOnX: 6,
  CheckStatusOffX: 7,
  CheckTimeSuccess: 8,
  CheckTimeFailed: 9,
  NightModeDisabledX: 10,
  CheckTimeSuccessX: 11,
  CheckTimeFailedX: 12,
  CheckActivityTrue: 13,
  CheckActivityFalse: 14,
  CheckActivityTrueX: 15,
  CheckActivityFalseX: 16,
  NightModeEnabled: 17,
  CheckAgain: 18
}

var SwitchKey = 'nightmode.switch'
var StatusKey = 'nightmode.status'
var StartTimeKey = 'nightmode.starttime'
var EndTimeKey = 'nightmode.endtime'
var AwakeSwitchKey = 'sys.awakeswitch'

function getSwitch() {
  return property.get(SwitchKey, 'persist')
}

function setSwitch(s) {
  property.set(SwitchKey, s, 'persist')
}

function getStatus() {
  return property.get(StatusKey, 'persist')
}

function setStatus(s) {
  property.set(StatusKey, s, 'persist')
}

function getStartTime() {
  var s = property.get(StartTimeKey, 'persist')
  if (s != undefined)
    return s
  else
    return '22:00'
}

function setStartTime() {
  property.set(StartTimeKey, s, 'persist')
}

function getEndTime() {
  var s = property.get(EndTimeKey, 'persist')
  if (s != undefined)
    return s
  else
    return '8:00'
}

function setEndTime() {
  property.set(EndTimeKey, s, 'persist')
}

function setStatus(s) {
  property.set(StatusKey, s, 'persist')
}

function setAwakeSwitch(s) {
  property.set(AwakeSwitchKey, s, 'persist')
}

function formatTime(str) {
  var d = new Date()
  d.setSeconds(0)
  try {
    if (typeof str == 'string') {
      var array = str.split(':')
      if (array.length === 2) {
        d.setHours(parseInt(array[0]))
        d.setMinutes(parseInt(array[1]))
        return d
      }
    }
  }
  catch(err) {
    logger.warn(`night mode time paser error: ${str}`)
    d.setHours(0)
    d.setMinutes(0)
  }
  return d
}

var fsmReady = 0
var fsmRunning = 1
var fsmWait = 2
var fsmEnd = 3
var fsmError = 4

function NightMode(light, sound, life) {
  this._life = life
  this._sound = sound
  this._light = light
  this._nightModeVolume = 10
  this._volumeSaved = 0
  this._fsmStatus = fsmReady
  this._fsmTimer = undefined
  this._fsmWaitingBreaker = undefined
}


/**
 * Get option frm cloud
 * @param {object} option night mode option
 */
NightMode.prototype.setOption = function (option) {
  if (option.action !== undefined && typeof option.action == 'string'
    && option.action == "open") {
    setSwitch('on')
  } else {
    setSwitch('off')
  }
  var sTime = '23:00',eTime = '7:00'
  if (option.startTime !== undefined && typeof option.startTime == 'string')
    sTime = option.startTime
  if (option.endTime !== undefined && typeof option.endTime == 'string')
    eTime = option.endTime
  
  setStartTime(sTime)
  setEndTime(eTime)
  logger.info(`setOption in, fsm status is ${this._fsmStatus}`)
  if (this._fsmStatus == fsmWait) {
    if (this._fsmWaitingBreaker) {
      logger.info('fsm waiting break')
      this._fsmWaitingBreaker()
    }
  } else if (this._fsmStatus == fsmEnd) {
    this.fsmMain(FSMCode.Start)
  } else
    logger.error(`setOption in, but fsm status is invalid`)
}

/**
 * Disable night mode
 * @function disable
 * @private
 */
NightMode.prototype.disable = function () {
  if (this._volumeSaved != 0)
    this._sound.setVolume(this._volumeSaved)
  this._light.setNightMode(false)
  setStatus('off')
  setAwakeSwitch('open')
}
/**
 * Enable night mode
 * @function enable
 * @private
 */
NightMode.prototype.enable = function() {
  var curVolume = this._sound.getVolume()
  if (this._nightModeVolume < curVolume) {
    this._volumeSaved = curVolume
    this._sound.setVolume(this._nightModeVolume)
  }
  this._light.setNightMode(true)
  setStatus('on')
  setAwakeSwitch('close')
}
/**
 * init night mode
 * @function init
 * @private
 */
NightMode.prototype.init = function () {
  logger.info('init')
  this.fsmMain(FSMCode.Start)
}

/**
 * Check night mode time, return positive number if in night mode time
 * @function enable
 * @returns {number} if result > 0, it's the millisecond to end time
 *                   if result < 0, it's the millisecond to start time
 * @private
 */
NightMode.prototype.checkTime = function () {
  var now = new Date()
  var start = formatTime(getStartTime())
  var end = formatTime(getEndTime())
  if (start > end)
    end.setDate(end.getDate() + 1)
  if (start > now) {
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
  }
  logger.info(`check time now:${now}   start:${start}   end:${end}`)
  if (now > start && now < end)
    return end - now
  else {
    start.setDate(start.getDate() + 1)
    return now - start;
  }
}

/**
 * fsm main
 * @function fsmMain
 * @param {Number} code - fsm code
 * @private
 */
NightMode.prototype.fsmMain = function (code) {
  while (code != FSMCode.End && code != FSMCode.WaitAsync) {
    logger.info(`fsmMain ${code}`)
    this._fsmStatus = fsmRunning
    switch (code) {
      case FSMCode.Start:
        code = this.fsmCheckSwitch(code)
        break
      case FSMCode.CheckSwitchOn:
        code = this.fsmCheckStatusX(code)
        break
      case FSMCode.CheckSwitchOff:
        code = this.fsmCheckStatus(code)
        break
      case FSMCode.CheckStatusOff:
      case FSMCode.NightModeDisabled:
        code = this.fsmEnd(code)
        break
      case FSMCode.CheckStatusOn:
        code = this.fsmNightModeTrunOff(code)
        break
      case FSMCode.CheckStatusOnX:
        code = this.fsmCheckTime(code)
        break
      case FSMCode.CheckStatusOffX:
        code = this.fsmCheckTimeX(code)
        break
      case FSMCode.CheckTimeFailed:
        code = this.fsmCheckActivityX(code)
        break
      case FSMCode.CheckTimeSuccessX:
        code = this.fsmCheckActivity(code)
        break
      case FSMCode.CheckActivityFalse:
        code = this.fsmNightModeTurnOn(code)
        break
      case FSMCode.CheckActivityTrueX:
      case FSMCode.NightModeEnabled:
      case FSMCode.CheckActivityTrue:
      case FSMCode.CheckTimeSuccess:
      case FSMCode.NightModeDisabledX:
      case FSMCode.CheckTimeFailedX:
        code = this.fsmSetTimeout(code)
        break
      case FSMCode.CheckActivityFalseX:
        code = this.fsmNightModeTurnOffX(code)
        break
      case FSMCode.CheckAgain:
        code = this.fsmCheckSwitch(code)
        break;
      default:
        logger.error(`${code} fsmMain error`)
        this._fsmStatus = fsmError
        return;
    }
  }
  if (code == FSMCode.WaitAsync)
    this._fsmStatus = fsmWait
  else if (code == FSMCode.End)
    this._fsmStatus = fsmEnd
}
/**
 * fsm function for switch checking
 * @function fsmCheckSwitch
 * @param {Number} code - fsm code
 * @returns switch on or switch off
 * @private
 */
NightMode.prototype.fsmCheckSwitch = function (code) {
  var switchStatus = getSwitch()
  logger.info(`FSMCheckSwitch ${switchStatus}`)
  return switchStatus  == 'on' ? FSMCode.CheckSwitchOn : FSMCode.CheckSwitchOff
}

/**
 * fsm function for current night mode status checking
 * @function fsmCheckStatusX
 * @param {Number} code - fsm code
 * @returns status On or status off
 * @private
 */
NightMode.prototype.fsmCheckStatusX = function (code) {
  var switchStatus = getSwitch()
  logger.info(`FSMCheckStatusX ${switchStatus}`)
  return switchStatus == 'on' ? FSMCode.CheckStatusOnX : FSMCode.CheckStatusOffX
}

/**
 * fsm function for current night mode status checking
 * @function fsmCheckStatus
 * @param {Number} code - fsm code
 * @returns status on or status off
 * @private
 */
NightMode.prototype.fsmCheckStatus = function (code) {
  var status = getStatus()
  logger.info(`FSMCheckStatus ${status}`)
  return status == 'on' ? FSMCode.CheckStatusOn : FSMCode.CheckStatusOff
}

/**
 * fsm end
 * @function fsmEnd
 * @param {Number} code - fsm code
 * @returns end
 * @private
 */
NightMode.prototype.fsmEnd = function (code) {
  logger.info('FSMEnd')
  return FSMCode.End
}

/**
 * fsm disable night mode
 * @function fsmNightModeTrunOff
 * @param {Number} code - fsm code
 * @returns night mode disabled
 * @private
 */
NightMode.prototype.fsmNightModeTrunOff = function (code) {
  logger.info('fsmNightModeTrunOff')
  this.disable()
  return FSMCode.NightModeDisabled

}

/**
 * fsm check night mode time
 * @function fsmCheckTime
 * @param {Number} code - fsm code
 * @returns success or failed
 * @private
 */
NightMode.prototype.fsmCheckTime = function (code) {
  var rst = this.checkTime()
  logger.info(`FSMCheckTime ${rst}`)
  return rst >= 0 ? FSMCode.CheckTimeSuccess : FSMCode.CheckTimeFailed
}

/**
 * fsm check night mode time
 * @function fsmCheckTimeX
 * @param {Number} code - fsm code
 * @returns success or failed
 * @private
 */
NightMode.prototype.fsmCheckTimeX = function (code) {
  var rst = this.checkTime()
  logger.info(`FSMCheckTimeX ${rst}`)
  return rst >= 0 ? FSMCode.CheckTimeSuccessX : FSMCode.CheckTimeFailedX

}

/**
 * fsm disable night mode
 * @function fsmNightModeTurnOffX
 * @param {Number} code - fsm code
 * @returns night mode disabled
 * @private
 */
NightMode.prototype.fsmNightModeTurnOffX = function (code) {
  logger.info('fsmNightModeTurnOffX')
  this.disable()
  return FSMCode.NightModeDisabledX
}

/**
 * fsm wait for start or end or something else(new option from cloud)
 * @function fsmSetTimeout
 * @param {Number} code - fsm code
 * @returns wait
 * @private
 */
NightMode.prototype.fsmSetTimeout = function (code) {
  var waitMs = this.checkTime()
  if (waitMs < 0)
    waitMs = -waitMs
  this._fsmTimer = setTimeout(() => {
    this.fsmMain(FSMCode.CheckAgain)
  }, waitMs)
  this._fsmWaitingBreaker = () => {
    clearTimeout(this._fsmTimer)
    this._fsmWaitingBreaker = undefined
    this._fsmTimer = undefined
    this.fsmMain(FSMCode.CheckAgain)
  }
  logger.info(`wait ${waitMs}ms for next night mode checking ${this._fsmWaitingBreaker}`)
  return FSMCode.WaitAsync
}

/**
 * fsm check the machine's working status
 * @function fsmCheckActivity
 * @param {Number} code - fsm code
 * @returns CheckActivityTrue if working, CheckActivityFalse if not working
 * @private
 */
NightMode.prototype.fsmCheckActivity = function (code) {
  var activity = this._life.getCurrentAppId()
  logger.info(`FSMCheckActivity ${activity}`)
  return activity ? FSMCode.CheckActivityTrue : FSMCode.CheckActivityFalse
}

/**
 * fsm check the machine's working status
 * @function fsmCheckActivity
 * @param {Number} code - fsm code
 * @returns CheckActivityTrueX if working, CheckActivityFalseX if not working
 * @private
 */
NightMode.prototype.fsmCheckActivityX = function (code) {
  var activity = this._life.getCurrentAppId() != undefined
  logger.info(`FSMCheckActivityX ${activity}`)
  return activity ? FSMCode.CheckActivityTrueX : FSMCode.CheckActivityFalseX
}
/**
 * fsm turn on night mode
 * @function fsmNightModeTurnOn
 * @param {Number} code - fsm code
 * @returns NightModeEnabled
 * @private
 */
NightMode.prototype.fsmNightModeTurnOn = function (code) {
  logger.info('fsmNightModeTurnOn')
  this.enable()
  return FSMCode.NightModeEnabled
}

module.exports = NightMode
