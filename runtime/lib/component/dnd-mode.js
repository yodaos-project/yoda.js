'use strict'

var property = require('@yoda/property')
var logger = require('logger')('dndmode')
var EventEmitter = require('events').EventEmitter

var FSMCode = {
  Start: 0,
  End: 254,
  WaitAsync: 255,
  CheckSwitchOn: 1,
  CheckSwitchOff: 2,
  CheckStatusOff: 3,
  CheckStatusOn: 4,
  DNDModeDisabled: 5,
  CheckStatusOnX: 6,
  CheckStatusOffX: 7,
  CheckTimeSuccess: 8,
  CheckTimeFailed: 9,
  DNDModeDisabledX: 10,
  CheckTimeSuccessX: 11,
  CheckTimeFailedX: 12,
  CheckActivityTrue: 13,
  CheckActivityFalse: 14,
  CheckActivityTrueX: 15,
  CheckActivityFalseX: 16,
  DNDModeEnabled: 17,
  CheckAgain: 18
}

var SwitchKey = 'dndmode.switch'
var StatusKey = 'dndmode.status'
var StartTimeKey = 'dndmode.starttime'
var EndTimeKey = 'dndmode.endtime'
var AwakeSwitchKey = 'dndmode.awakeswitch'

function getSwitch () {
  return property.get(SwitchKey, 'persist')
}

function setSwitch (s) {
  property.set(SwitchKey, s, 'persist')
}

function getStatus () {
  return property.get(StatusKey, 'persist')
}

function setStatus (s) {
  property.set(StatusKey, s, 'persist')
}

function getStartTime () {
  var s = property.get(StartTimeKey, 'persist')
  if (s !== undefined) {
    return s
  } else {
    return '22:00'
  }
}

function setStartTime (s) {
  property.set(StartTimeKey, s, 'persist')
}

function getEndTime () {
  var s = property.get(EndTimeKey, 'persist')
  if (s !== undefined) {
    return s
  } else {
    return '8:00'
  }
}

function setEndTime (s) {
  property.set(EndTimeKey, s, 'persist')
}

function setAwakeSwitch (s) {
  property.set(AwakeSwitchKey, s, 'persist')
}

function formatTime (str, defalutHour, defaultMinute) {
  var d = new Date()
  d.setSeconds(0)
  var hour = defalutHour
  var minute = defaultMinute
  try {
    if (typeof str === 'string') {
      var array = str.split(':')
      if (array.length === 2) {
        hour = parseInt(array[0])
        minute = parseInt(array[1])
      }
    }
  } catch (err) {
    logger.warn(`dnd mode time paser error: ${str}`)
  }
  d.setHours(hour)
  d.setMinutes(minute)
  return d
}

var fsmReady = 0
var fsmRunning = 1
var fsmWait = 2
var fsmEnd = 3
var fsmError = 4

var DNDModeVolume = 10

function DNDMode (light, sound, life) {
  EventEmitter.call(this)
  this._life = life
  this._sound = sound
  this._light = light
  this._volumeSaved = 0
  this._fsmStatus = fsmReady
  this._fsmTimer = undefined
  this._fsmWaitingBreaker = undefined
  this._isOptionBreaker = false
  this._life.on('idle', () => {
    if (this._fsmStatus === fsmWait) {
      if (this._fsmWaitingBreaker) {
        logger.info('fsm waiting break : device is idle')
        this._fsmWaitingBreaker()
      }
    } else if (this._fsmStatus === fsmEnd) {
      this.fsmMain(FSMCode.Start)
    }
  })
}

/**
 * Get option frm cloud
 * @param {object} option dnd mode option
 */
DNDMode.prototype.setOption = function (option) {
  if (option === undefined) {
    return
  }
  if (option.action !== undefined && typeof option.action === 'string' &&
    option.action === 'open') {
    setSwitch('on')
  } else {
    setSwitch('off')
  }
  var startTime = '23:00'
  var endTime = '7:00'
  if (option.startTime !== undefined && typeof option.startTime === 'string') {
    startTime = option.startTime
  }
  if (option.endTime !== undefined && typeof option.endTime === 'string') {
    endTime = option.endTime
  }

  setStartTime(startTime)
  setEndTime(endTime)
  logger.info(`setOption in, fsm status is ${this._fsmStatus}`)
  this._isOptionBreaker = true
  if (this._fsmStatus === fsmWait) {
    if (this._fsmWaitingBreaker) {
      logger.info('fsm waiting break')
      this._fsmWaitingBreaker()
    }
  } else if (this._fsmStatus === fsmEnd) {
    this.fsmMain(FSMCode.Start)
  } else {
    logger.error(`setOption in, but fsm status is invalid`)
  }
  this._isOptionBreaker = false
}

/**
 * recheck dnd mode
 */
DNDMode.prototype.recheck = function () {
  logger.info(`recheck dnd mode, fsm status is ${this._fsmStatus}`)
  if (this._fsmStatus === fsmWait) {
    if (this._fsmWaitingBreaker) {
      logger.info('fsm waiting break')
      this._fsmWaitingBreaker()
    }
  } else if (this._fsmStatus === fsmEnd) {
    this.fsmMain(FSMCode.Start)
  } else {
    logger.error(`recheck dnd mode, but fsm status is invalid`)
  }
}

/**
 * Disable dnd mode
 * @function disable
 * @private
 */
DNDMode.prototype.disable = function () {
  // TODO volume changed event
  if (this._volumeSaved !== 0) {
    this._sound.setVolume(this._volumeSaved)
  }
  this._light.setDNDMode(false)
  setStatus('off')
  setAwakeSwitch('open')
}
/**
 * Enable dnd mode
 * @function enable
 * @private
 */
DNDMode.prototype.enable = function () {
  var curVolume = this._sound.getVolume()
  if (DNDModeVolume < curVolume) {
    this._volumeSaved = curVolume
    this._sound.setVolume(DNDModeVolume)
  }
  this._light.setDNDMode(true)
  setStatus('on')
  setAwakeSwitch('close')
}
/**
 * init dnd mode
 * @function init
 * @private
 */
DNDMode.prototype.init = function () {
  logger.info('dnd mode init')
  this.fsmMain(FSMCode.Start)
}

/**
 * Check dnd mode time, return positive number if in dnd mode time
 * @function enable
 * @returns {number} if result > 0, it's the millisecond to end time
 *                   if result < 0, it's the millisecond to start time
 * @private
 */
DNDMode.prototype.checkTime = function () {
  var now = new Date()
  var start = formatTime(getStartTime(), 22, 0)
  var end = formatTime(getEndTime(), 7, 0)
  if (start > end) {
    end.setDate(end.getDate() + 1)
  }
  logger.info(`check time now:${now}   start:${start}   end:${end}`)
  if (now >= start && now < end) {
    return end - now
  } else if (now < start) {
    return now - start
  } else if (now >= end) {
    start.setDate(start.getDate() + 1)
    return now - start
  }
}

/**
 * fsm main
 * @function fsmMain
 * @param {Number} code - fsm code
 * @private
 */
DNDMode.prototype.fsmMain = function (code) {
  while (code !== FSMCode.End && code !== FSMCode.WaitAsync) {
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
      case FSMCode.DNDModeDisabled:
        code = this.fsmEnd(code)
        break
      case FSMCode.CheckStatusOn:
        code = this.fsmDNDModeTrunOff(code)
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
        code = this.fsmDNDModeTurnOn(code)
        break
      case FSMCode.CheckActivityTrueX:
      case FSMCode.DNDModeEnabled:
      case FSMCode.CheckActivityTrue:
      case FSMCode.CheckTimeSuccess:
      case FSMCode.DNDModeDisabledX:
      case FSMCode.CheckTimeFailedX:
        code = this.fsmSetTimeout(code)
        break
      case FSMCode.CheckActivityFalseX:
        code = this.fsmDNDModeTurnOffX(code)
        break
      case FSMCode.CheckAgain:
        code = this.fsmCheckSwitch(code)
        break
      default:
        logger.error(`${code} fsmMain error`)
        this._fsmStatus = fsmError
        return
    }
  }
  if (code === FSMCode.WaitAsync) {
    this._fsmStatus = fsmWait
  } else if (code === FSMCode.End) {
    this._fsmStatus = fsmEnd
  }
}
/**
 * fsm function for switch checking
 * @function fsmCheckSwitch
 * @param {Number} code - fsm code
 * @returns switch on or switch off
 * @private
 */
DNDMode.prototype.fsmCheckSwitch = function (code) {
  var switchValue = getSwitch()
  logger.info(`FSMCheckSwitch ${switchValue}`)
  return switchValue === 'on' ? FSMCode.CheckSwitchOn : FSMCode.CheckSwitchOff
}

/**
 * fsm function for current dnd mode status checking
 * @function fsmCheckStatusX
 * @param {Number} code - fsm code
 * @returns status On or status off
 * @private
 */
DNDMode.prototype.fsmCheckStatusX = function (code) {
  var status = getStatus()
  logger.info(`FSMCheckStatusX ${status}`)
  return status === 'on' ? FSMCode.CheckStatusOnX : FSMCode.CheckStatusOffX
}

/**
 * fsm function for current dnd mode status checking
 * @function fsmCheckStatus
 * @param {Number} code - fsm code
 * @returns status on or status off
 * @private
 */
DNDMode.prototype.fsmCheckStatus = function (code) {
  var status = getStatus()
  logger.info(`FSMCheckStatus ${status}`)
  return status === 'on' ? FSMCode.CheckStatusOn : FSMCode.CheckStatusOff
}

/**
 * fsm end
 * @function fsmEnd
 * @param {Number} code - fsm code
 * @returns end
 * @private
 */
DNDMode.prototype.fsmEnd = function (code) {
  logger.info('FSMEnd')
  this._volumeSaved = 0
  return FSMCode.End
}

/**
 * fsm disable dnd mode
 * @function fsmDNDModeTrunOff
 * @param {Number} code - fsm code
 * @returns dnd mode disabled
 * @private
 */
DNDMode.prototype.fsmDNDModeTrunOff = function (code) {
  logger.info('fsmDNDModeTrunOff')
  this.disable()
  return FSMCode.DNDModeDisabled
}

/**
 * fsm check dnd mode time
 * @function fsmCheckTime
 * @param {Number} code - fsm code
 * @returns success or failed
 * @private
 */
DNDMode.prototype.fsmCheckTime = function (code) {
  var rst = this.checkTime()
  logger.info(`FSMCheckTime ${rst}`)
  return rst > 0 ? FSMCode.CheckTimeSuccess : FSMCode.CheckTimeFailed
}

/**
 * fsm check dnd mode time
 * @function fsmCheckTimeX
 * @param {Number} code - fsm code
 * @returns success or failed
 * @private
 */
DNDMode.prototype.fsmCheckTimeX = function (code) {
  var rst = this.checkTime()
  logger.info(`FSMCheckTimeX ${rst}`)
  return rst > 0 ? FSMCode.CheckTimeSuccessX : FSMCode.CheckTimeFailedX
}

/**
 * fsm disable dnd mode
 * @function fsmDNDModeTurnOffX
 * @param {Number} code - fsm code
 * @returns dnd mode disabled
 * @private
 */
DNDMode.prototype.fsmDNDModeTurnOffX = function (code) {
  logger.info('fsmDNDModeTurnOffX')
  this.disable()
  return FSMCode.DNDModeDisabledX
}

/**
 * fsm wait for start or end or something else(new option from cloud)
 * @function fsmSetTimeout
 * @param {Number} code - fsm code
 * @returns wait
 * @private
 */
DNDMode.prototype.fsmSetTimeout = function (code) {
  var waitMs = this.checkTime()
  if (waitMs < 0) {
    waitMs = -waitMs
  }
  this._fsmTimer = setTimeout(() => {
    this.fsmMain(FSMCode.CheckAgain)
  }, waitMs + 1000)
  this._fsmWaitingBreaker = () => {
    clearTimeout(this._fsmTimer)
    this._fsmWaitingBreaker = undefined
    this._fsmTimer = undefined
    this.fsmMain(FSMCode.CheckAgain)
  }
  logger.info(`wait ${waitMs}ms for next dnd mode checking ${this._fsmWaitingBreaker}`)
  return FSMCode.WaitAsync
}

/**
 * fsm check the machine's working status
 * @function fsmCheckActivity
 * @param {Number} code - fsm code
 * @returns CheckActivityTrue if working, CheckActivityFalse if not working
 * @private
 */
DNDMode.prototype.fsmCheckActivity = function (code) {
  if (!this._isOptionBreaker) {
    var activity = this._life.getCurrentAppId()
    logger.info(`FSMCheckActivity ${activity}`)
    return activity ? FSMCode.CheckActivityTrue : FSMCode.CheckActivityFalse
  } else {
    return FSMCode.CheckActivityFalse
  }
}

/**
 * fsm check the machine's working status
 * @function fsmCheckActivity
 * @param {Number} code - fsm code
 * @returns CheckActivityTrueX if working, CheckActivityFalseX if not working
 * @private
 */
DNDMode.prototype.fsmCheckActivityX = function (code) {
  if (!this._isOptionBreaker) {
    var activity = this._life.getCurrentAppId()
    logger.info(`FSMCheckActivityX ${activity}`)
    return activity ? FSMCode.CheckActivityTrueX : FSMCode.CheckActivityFalseX
  } else {
    return FSMCode.CheckActivityFalseX
  }
}
/**
 * fsm turn on dnd mode
 * @function fsmDNDModeTurnOn
 * @param {Number} code - fsm code
 * @returns DNDModeEnabled
 * @private
 */
DNDMode.prototype.fsmDNDModeTurnOn = function (code) {
  logger.info('fsmDNDModeTurnOn')
  this.enable()
  return FSMCode.DNDModeEnabled
}

module.exports = DNDMode
