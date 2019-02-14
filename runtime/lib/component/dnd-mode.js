'use strict'

var property = require('@yoda/property')
var logger = require('logger')('dndmode')

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

var DND_MODE_VOLUME = 10
var TIME_ZONE = 8
var SAVED_VOLUME_KEY = 'dndmode.savedvolume'
var SWITCH_KEY = 'dndmode.switch'
var STATUS_KEY = 'dndmode.status'
var START_TIME_KEY = 'dndmode.starttime'
var END_TIME_KEY = 'dndmode.endtime'
var AWAKE_SWITCH_KEY = 'dndmode.awakeswitch'

var FSM_READY = 0
var FSM_RUNNING = 1
var FSM_WAITING = 2
var FSM_END = 3
var FSM_ERROR = 4

class DNDCommon {
  constructor (light, sound, life) {
    this.life = life
    this.sound = sound
    this.light = light
    this.setVolumeFlag = false
  }
  /**
   * Disable dnd mode
   * @function disable
   */
  disable () {
    var volume = DNDCommon.getSavedVolume()
    if (volume !== 0) {
      this.sound.setVolume(volume)
      DNDCommon.setSavedVolume(0)
    }
    this.light.setDNDMode(false)
    DNDCommon.setStatus('off')
    DNDCommon.setAwakeSwitch('open')
    logger.info('dnd mode turned off')
  }

  isVolumeChanging () {
    return this.setVolumeFlag
  }

  volumeChangingEnd () {
    this.setVolumeFlag = false
  }

  volumeChangingStart () {
    this.setVolumeFlag = true
  }

  /**
   * Enable dnd mode
   * @function enable
   */
  enable () {
    var curVolume = this.sound.getVolume()
    if (DND_MODE_VOLUME < curVolume) {
      this.volumeChangingStart()
      this.sound.setVolume(DND_MODE_VOLUME)
      DNDCommon.setSavedVolume(curVolume)
      logger.info(`save volume [${curVolume}%]`)
    }
    this.light.setDNDMode(true)
    DNDCommon.setStatus('on')
    DNDCommon.setAwakeSwitch('close')
    logger.info('dnd mode turned on')
  }

  /**
   * Get dnd mode time span from now to start/end, return positive number if in dnd mode time
   * @function getDNDTime
   * @returns {number} - if result >= 0, it's the millisecond to end time
   *                   - if result < 0, it's the millisecond to start time
   */
  static getDNDTime () {
    function formatDate (dt) {
      return `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDay()} ${dt.getHours()}:${dt.getMinutes()}:${dt.getSeconds()}`
    }
    var now = new Date()
    now.setHours(now.getHours() + now.getTimezoneOffset() / 60)
    var start = DNDCommon.formatTime(DNDCommon.getStartTime(), 22, 0)
    var end = DNDCommon.formatTime(DNDCommon.getEndTime(), 7, 0)
    if (start >= end) {
      end.setDate(end.getDate() + 1)
    }
    logger.info(`check utc time now:${formatDate(now)}   start:${formatDate(start)}   end:${formatDate(end)}`)
    if (now >= start && now < end) {
      return end - now
    } else {
      var nowPlusDay = new Date()
      nowPlusDay.setHours(nowPlusDay.getHours() + nowPlusDay.getTimezoneOffset() / 60)
      nowPlusDay.setDate(nowPlusDay.getDate() + 1)
      logger.info(`check utc time nowPlusDay:${formatDate(nowPlusDay)}   start:${formatDate(start)}   end:${formatDate(end)}`)
      if (nowPlusDay >= start && nowPlusDay < end) {
        return nowPlusDay - now
      } else if (now < start) {
        return now - start
      } else {
        start.setDate(start.getDate() + 1)
        return now - start
      }
    }
  }

  /**
   * Get the saved volume value
   * @function getSavedVolume
   * @returns {number} saved volume value
   */
  static getSavedVolume () {
    try {
      return parseInt(property.get(SAVED_VOLUME_KEY, 'persist'))
    } catch (_) {
      return 0
    }
  }

  /**
   * Set the saved volume value
   * @function setSavedVolume
   * @param {number} volume - saved volume value
   */
  static setSavedVolume (volume) {
    property.set(SAVED_VOLUME_KEY, volume.toString(), 'persist')
  }

  /**
   * Get the switch value
   * @function getSwitch
   * @returns {string} switch value
   */
  static getSwitch () {
    return property.get(SWITCH_KEY, 'persist')
  }

  /**
   * Set the switch value
   * @function setSwitch
   * @param {string} switchValue - switch value 'on'/'off', set 'off' by default
   */
  static setSwitch (switchValue) {
    if (switchValue !== 'on' && switchValue !== 'off') {
      switchValue = 'off'
    }
    property.set(SWITCH_KEY, switchValue, 'persist')
  }

  /**
   * Get the dnd mode status
   * @function getStatus
   * @returns {string} status 'on'/'off'
   */
  static getStatus () {
    return property.get(STATUS_KEY, 'persist')
  }

  /**
   * Set the dnd mode status
   * @function getStatus
   * @param {string} status 'on'/'off', set 'off' by default
   */
  static setStatus (status) {
    if (status !== 'on' && status !== 'off') {
      status = 'off'
    }
    property.set(STATUS_KEY, status, 'persist')
  }

  /**
   * Get start time of the dnd mode
   * @function getStartTime
   * @returns {string} the start time with hours and minutes (+8 tz for now)
   */
  static getStartTime () {
    var s = property.get(START_TIME_KEY, 'persist')
    if (s !== undefined) {
      return s
    } else {
      return '22:00'
    }
  }

  /**
   * Set start time of the dnd mode
   * @function setStartTime
   * @param {string} startTime - the start time with hours and minutes (+8 tz for now)
   */
  static setStartTime (startTime) {
    property.set(START_TIME_KEY, startTime, 'persist')
  }

  /**
   * Get end time of the dnd mode
   * @function getEndTime
   * @returns {string} the end time with hours and minutes (+8 tz for now)
   */
  static getEndTime () {
    var s = property.get(END_TIME_KEY, 'persist')
    if (s !== undefined) {
      return s
    } else {
      return '8:00'
    }
  }

  /**
   * Set end time of the dnd mode
   * @function getEndTime
   * @param {string} endTime - the end time with hours and minutes (+8 tz for now)
   */
  static setEndTime (endTime) {
    property.set(END_TIME_KEY, endTime, 'persist')
  }

  /**
   * Set awake switch of the dnd mode
   * @function getEndTime
   * @param {string} awakeSwitch - awake switch 'open'/'close', set 'close' by default
   */
  static setAwakeSwitch (awakeSwitch) {
    if (awakeSwitch !== 'open' && awakeSwitch !== 'close') {
      awakeSwitch = 'close'
    }
    property.set(AWAKE_SWITCH_KEY, awakeSwitch, 'persist')
  }

  /**
   * format start/end time 'hh:mm' to datetime today
   * @function getEndTime
   * @param {string} timeStr - time with hours and minutes eg '22:00'
   * @param {number} defaultHour - default hours
   * @param {number} defaultMinute - default minutes
   * @returns {Date} the start/end time today
   */
  static formatTime (timeStr, defaultHour, defaultMinute) {
    var d = new Date()
    d.setSeconds(0)
    d.setMilliseconds(0)
    var hour = defaultHour
    var minute = defaultMinute
    try {
      if (typeof timeStr === 'string') {
        var array = timeStr.split(':')
        if (array.length === 2) {
          hour = parseInt(array[0])
          minute = parseInt(array[1])
        }
      }
    } catch (err) {
      logger.warn(`dnd mode time paser error: ${timeStr}`)
    }
    d.setHours(hour)
    // TODO custom-config should add timeZone
    d.setHours(d.getHours() - TIME_ZONE)
    d.setMinutes(minute)
    return d
  }

  /**
   * Get the device active status
   * @function isActivity
   * @returns {string|null} app id if active or null if sleep
   */
  isActivity () {
    return this.life.getCurrentAppId()
  }
}

class DNDMode {
  /**
   * constructor of DNDMode
   * @function constructor
   * @param {object} runtime - app runtime
   */
  constructor (runtime) {
    var light = runtime.component.light
    var life = runtime.component.lifetime
    var sound = runtime.component.sound
    runtime.component.flora.subscribe('yodart.audio.on-volume-change', this.onVolumeChanged.bind(this))
    this.common = new DNDCommon(light, sound, life)
    this.fsmStatus = FSM_READY
    this.fsmTimer = undefined
    this.waitSleep = false
    this.fsmWaitingBreaker = undefined
    this.isOptionBreaker = false
    life.on('idle', this.onDeviceIdle.bind(this))
  }

  /**
   * volume changed event handler
   * @param {array} msg -
   */
  onVolumeChanged (msg) {
    if (DNDCommon.getStatus() === 'on') {
      var stream = msg[0]
      var volume = msg[1]
      if (stream === 'system') {
        if (this.common.isVolumeChanging()) {
          this.common.volumeChangingEnd()
        } else {
          DNDCommon.setSavedVolume(volume)
          logger.info(`onVolumeChanged: save volume [${volume}%]`)
        }
      }
    }
  }
  /**
   * when the device changes from active to idle, this function will be triggered
   * @function onDeviceIdle
   */
  onDeviceIdle () {
    if (this.waitSleep && this.fsmStatus === FSM_WAITING) {
      this.waitSleep = false
      if (this.fsmWaitingBreaker) {
        logger.info('device is idle, recheck dnd mode')
        this.fsmWaitingBreaker()
      }
    }
  }
  /**
   * Get option from cloud
   * @param {object} option dnd mode option
   */
  setOption (option) {
    if (option === undefined) {
      return
    }
    if (option.action !== undefined && typeof option.action === 'string' &&
      option.action === 'open') {
      DNDCommon.setSwitch('on')
    } else {
      DNDCommon.setSwitch('off')
    }
    var startTime = '23:00'
    var endTime = '7:00'
    if (option.startTime !== undefined && typeof option.startTime === 'string') {
      startTime = option.startTime
    }
    if (option.endTime !== undefined && typeof option.endTime === 'string') {
      endTime = option.endTime
    }

    DNDCommon.setStartTime(startTime)
    DNDCommon.setEndTime(endTime)
    logger.info(`dnd mode config changed, recheck dnd mode`)
    this.isOptionBreaker = true
    if (this.fsmStatus === FSM_WAITING) {
      if (this.fsmWaitingBreaker) {
        logger.info('fsm waiting break')
        this.fsmWaitingBreaker()
      }
    } else if (this.fsmStatus === FSM_END) {
      this.start(FSMCode.Start)
    } else {
      logger.error(`setOption in, but fsm status is invalid`)
    }
    this.isOptionBreaker = false
  }

  /**
   * recheck dnd mode because of date synchronization
   */
  recheck () {
    logger.info(`time synchronized, recheck dnd mode`)
    if (this.fsmStatus === FSM_WAITING) {
      if (this.fsmWaitingBreaker) {
        logger.info('fsm waiting break')
        this.fsmWaitingBreaker()
      }
    } else if (this.fsmStatus === FSM_END) {
      this.start(FSMCode.Start)
    } else {
      logger.error(`recheck dnd mode, but fsm status is invalid`)
    }
  }

  /**
   * init dnd mode
   * @function init
   */
  init () {
    logger.info('dnd mode init')
    this.start(FSMCode.Start)
  }

  /**
   * fsm main
   * @function start
   * @param {number} code - fsm code
   * @private
   */
  start (code) {
    while (code !== FSMCode.End && code !== FSMCode.WaitAsync) {
      logger.info(`fsmMain ${code}`)
      this.fsmStatus = FSM_RUNNING
      switch (code) {
        case FSMCode.Start:
          code = this.checkSwitch(code)
          break
        case FSMCode.CheckSwitchOn:
          code = this.checkStatusX(code)
          break
        case FSMCode.CheckSwitchOff:
          code = this.checkStatus(code)
          break
        case FSMCode.CheckStatusOff:
        case FSMCode.DNDModeDisabled:
          code = this.end(code)
          break
        case FSMCode.CheckStatusOn:
          code = this.turnOff(code)
          break
        case FSMCode.CheckStatusOnX:
          code = this.checkTime(code)
          break
        case FSMCode.CheckStatusOffX:
          code = this.checkTimeX(code)
          break
        case FSMCode.CheckTimeFailed:
          code = this.checkActivityX(code)
          break
        case FSMCode.CheckTimeSuccessX:
          code = this.checkActivity(code)
          break
        case FSMCode.CheckActivityFalse:
          code = this.turnOn(code)
          break
        case FSMCode.CheckActivityTrueX:
        case FSMCode.DNDModeEnabled:
        case FSMCode.CheckActivityTrue:
        case FSMCode.CheckTimeSuccess:
        case FSMCode.DNDModeDisabledX:
        case FSMCode.CheckTimeFailedX:
          code = this.setTimeout(code)
          break
        case FSMCode.CheckActivityFalseX:
          code = this.turnOffX(code)
          break
        case FSMCode.CheckAgain:
          code = this.checkSwitch(code)
          break
        default:
          logger.error(`${code} fsmMain error`)
          this.fsmStatus = FSM_ERROR
          return
      }
    }
    if (code === FSMCode.WaitAsync) {
      this.fsmStatus = FSM_WAITING
    } else if (code === FSMCode.End) {
      this.fsmStatus = FSM_END
    }
  }

  /**
   * fsm function for switch checking
   * @function checkSwitch
   * @param {number} code - fsm code
   * @returns {number} switch on or switch off
   * @private
   */
  checkSwitch (code) {
    var switchValue = DNDCommon.getSwitch()
    logger.info(`FSMCheckSwitch ${switchValue}`)
    return switchValue === 'on' ? FSMCode.CheckSwitchOn : FSMCode.CheckSwitchOff
  }

  /**
   * fsm function for current dnd mode status checking
   * @function checkStatusX
   * @param {number} code - fsm code
   * @returns {number} status On or status off
   * @private
   */
  checkStatusX (code) {
    var status = DNDCommon.getStatus()
    logger.info(`FSMCheckStatusX ${status}`)
    return status === 'on' ? FSMCode.CheckStatusOnX : FSMCode.CheckStatusOffX
  }

  /**
   * fsm function for current dnd mode status checking
   * @function checkStatus
   * @param {number} code - fsm code
   * @returns {number} status on or status off
   * @private
   */
  checkStatus (code) {
    var status = DNDCommon.getStatus()
    logger.info(`FSMCheckStatus ${status}`)
    return status === 'on' ? FSMCode.CheckStatusOn : FSMCode.CheckStatusOff
  }

  /**
   * fsm end
   * @function end
   * @param {number} code - fsm code
   * @returns {number} end
   * @private
   */
  end (code) {
    logger.info('FSMEnd')
    return FSMCode.End
  }

  /**
   * fsm disable dnd mode
   * @function turnOff
   * @param {number} code - fsm code
   * @returns {number} dnd mode disabled
   * @private
   */
  turnOff (code) {
    logger.info('turnOff')
    this.common.disable()
    return FSMCode.DNDModeDisabled
  }

  /**
   * fsm check dnd mode time
   * @function checkTime
   * @param {number} code - fsm code
   * @returns {number} success or failed
   * @private
   */
  checkTime (code) {
    var rst = DNDCommon.getDNDTime()
    logger.info(`FSMCheckTime ${rst}`)
    return rst > 0 ? FSMCode.CheckTimeSuccess : FSMCode.CheckTimeFailed
  }

  /**
   * fsm check dnd mode time
   * @function checkTimeX
   * @param {number} code - fsm code
   * @returns {number} success or failed
   * @private
   */
  checkTimeX (code) {
    var rst = DNDCommon.getDNDTime()
    logger.info(`FSMCheckTimeX ${rst}`)
    return rst > 0 ? FSMCode.CheckTimeSuccessX : FSMCode.CheckTimeFailedX
  }

  /**
   * fsm disable dnd mode
   * @function turnOffX
   * @param {number} code - fsm code
   * @returns {number} dnd mode disabled
   * @private
   */
  turnOffX (code) {
    logger.info('turnOffX')
    this.common.disable()
    return FSMCode.DNDModeDisabledX
  }

  /**
   * fsm wait for start or end or something else(new option from cloud)
   * @function setTimeout
   * @param {number} code - fsm code
   * @returns {number} wait async
   * @private
   */
  setTimeout (code) {
    var waitMs = DNDCommon.getDNDTime()
    this.waitSleep = (code === FSMCode.CheckActivityTrue || code === FSMCode.CheckActivityTrueX)
    if (!this.waitSleep) {
      if (waitMs >= 0) {
        logger.info(`waiting to exit night mode, timeout:[${waitMs / 1000}s]`)
      } else {
        logger.info(`waiting to enter night mode, timeout:[${-waitMs / 1000}s]`)
      }
    } else {
      if (waitMs < 0) {
        logger.info(`wait for sleeping to turn on`)
      } else {
        logger.info(`wait for sleeping to turn off`)
      }
    }
    if (waitMs < 0) {
      waitMs = -waitMs
    }
    this.fsmTimer = setTimeout(() => {
      this.start(FSMCode.CheckAgain)
    }, waitMs)
    this.fsmWaitingBreaker = () => {
      clearTimeout(this.fsmTimer)
      this.fsmWaitingBreaker = undefined
      this.fsmTimer = undefined
      this.start(FSMCode.CheckAgain)
    }
    logger.info(`wait ${waitMs}ms for next dnd mode checking ${this.fsmWaitingBreaker}`)
    return FSMCode.WaitAsync
  }

  /**
   * fsm check the machine's working status
   * @function checkActivity
   * @param {number} code - fsm code
   * @returns {number} CheckActivityTrue if working, CheckActivityFalse if not working
   * @private
   */
  checkActivity (code) {
    if (!this.isOptionBreaker) {
      var activity = this.common.isActivity()
      logger.info(`FSMCheckActivity ${activity}`)
      return activity ? FSMCode.CheckActivityTrue : FSMCode.CheckActivityFalse
    } else {
      logger.info(`FSMCheckActivity from option changed, always return FALSE`)
      return FSMCode.CheckActivityFalse
    }
  }

  /**
   * fsm check the machine's working status
   * @function checkActivity
   * @param {number} code - fsm code
   * @returns {number} CheckActivityTrueX if working, CheckActivityFalseX if not working
   * @private
   */
  checkActivityX (code) {
    if (!this.isOptionBreaker) {
      var activity = this.common.isActivity()
      logger.info(`FSMCheckActivityX ${activity}`)
      return activity ? FSMCode.CheckActivityTrueX : FSMCode.CheckActivityFalseX
    } else {
      return FSMCode.CheckActivityFalseX
    }
  }

  /**
   * fsm turn on dnd mode
   * @function turnOn
   * @param {number} code - fsm code
   * @returns {number} DNDModeEnabled
   * @private
   */
  turnOn (code) {
    logger.info('turnOn')
    this.common.enable()
    return FSMCode.DNDModeEnabled
  }
}

module.exports = DNDMode
