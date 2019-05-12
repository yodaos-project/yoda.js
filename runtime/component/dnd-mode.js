'use strict'

var property = require('@yoda/property')
var logger = require('logger')('dndmode')
var config = require('../lib/config').getConfig('dnd-mode-define.json')

class DNDCommon {
  constructor (visibility, broadcast) {
    this.visibility = visibility
    this.broadcast = broadcast
    this.broadcast.registerBroadcastChannel(config.BROADCAST_CHANNEL)
  }
  /**
   * Disable dnd mode
   * @function disable
   */
  disable () {
    // TODO disable dnd-mode
    DNDCommon.setStatus('off')
    logger.info('dnd mode turned off')
    this.broadcast.dispatch(config.BROADCAST_CHANNEL, 'off')
  }

  /**
   * Enable dnd mode
   * @function enable
   */
  enable () {
    // TODO enable dnd-mode
    DNDCommon.setStatus('on')
    logger.info('dnd mode turned on')
    this.broadcast.dispatch(config.BROADCAST_CHANNEL, 'on')
  }

  /**
   * Get dnd mode time span from now to start/end, return positive number if in dnd mode time
   * @function getDNDTime
   * @returns {number} - if result >= 0, it's the millisecond to end time
   *                   - if result < 0, it's the millisecond to start time
   */
  static getDNDTime () {
    function formatDate (dt) {
      return `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()} ${dt.getHours()}:${dt.getMinutes()}:${dt.getSeconds()}`
    }
    var now = new Date()
    var weekSetting = DNDCommon.getWeekSetting()
    var start = DNDCommon.formatTime(DNDCommon.getStartTime(), 22, 0) // default start time is '22:00'
    var end = DNDCommon.formatTime(DNDCommon.getEndTime(), 7, 0) // default end time is '07:00'
    var weekDayStart = start.getDay()
    var loopCount = 0
    while (!weekSetting[weekDayStart % 7]) {
      weekDayStart++
      loopCount++
      if (loopCount > 6) {
        logger.info('all days of week are disabled, never triggered')
        return Number.MAX_VALUE
      } else {
        start.setDate(start.getDate() + 1)
        end.setDate(end.getDate() + 1)
      }
    }
    if (start >= end) {
      end.setDate(end.getDate() + 1)
    }
    logger.info(`check local time(${now.getTimezoneOffset() / 60}) now:${formatDate(now)} \
      start:${formatDate(start)}(week day:${start.getDay()}) end:${formatDate(end)}`)
    if (now >= start && now < end) {
      return end - now
    } else if (now < start) {
      return now - start
    } else {
      throw (new Error(`the dnd-mode end time(${formatDate(end)}) should always be larger \
        than now (${formatDate(now)})`))
    }
  }

  /**
   * Get the week setting value
   * @function getWeekSetting
   * @returns {Array} week setting value
   */
  static getWeekSetting () {
    /**
     * default setting: all week days are enabled
     * the index of setting is the week day, e.g., 0-sunday 1-monday.
     * the value of setting is the week day switch
     * e.g., `setting[0] === true` means it's enabled on sunday.
     */
    var setting = [true, true, true, true, true, true, true]
    var week = property.get(config.WEEK_KEY, 'persist')
    if (week.length === 7) {
      for (var i = 0; i < 7; ++i) {
        setting[i] = week[i] !== '0'
      }
    }
    return setting
  }
  /**
   * Set week days of the dnd mode
   * @function setWeekSetting
   * @param {string} weekSetting - the week setting as format '1111111'
   *                             - '1' is enabeld, '0' is disabled, the index of char is the week day
   */
  static setWeekSetting (weekSetting) {
    property.set(config.WEEK_KEY, weekSetting, 'persist')
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
    property.set(config.SWITCH_KEY, switchValue, 'persist')
  }

  /**
   * Get the dnd mode status
   * @function getStatus
   * @returns {string} status 'on'/'off'
   */
  static getStatus () {
    return property.get(config.STATUS_KEY, 'persist') === 'on' ? 'on' : 'off'
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
    property.set(config.STATUS_KEY, status, 'persist')
  }

  /**
   * Get start time of the dnd mode
   * @function getStartTime
   * @returns {string} the start time with hours and minutes (+8 tz for now)
   */
  static getStartTime () {
    var s = property.get(config.START_TIME_KEY, 'persist')
    if (s !== undefined) {
      return s
    } else {
      return '22:00'
    }
  }

  /**
   * Set start time of the dnd mode
   * @function setStartTime
   * @param {string} startTime - the start time with hours and minutes
   */
  static setStartTime (startTime) {
    property.set(config.START_TIME_KEY, startTime, 'persist')
  }

  /**
   * Get end time of the dnd mode
   * @function getEndTime
   * @returns {string} the end time with hours and minutes (+8 tz for now)
   */
  static getEndTime () {
    var s = property.get(config.END_TIME_KEY, 'persist')
    if (s !== undefined) {
      return s
    } else {
      return '8:00'
    }
  }

  /**
   * Set end time of the dnd mode
   * @function getEndTime
   * @param {string} endTime - the end time with hours and minutes
   */
  static setEndTime (endTime) {
    property.set(config.END_TIME_KEY, endTime, 'persist')
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
    property.set(config.AWAKE_SWITCH_KEY, awakeSwitch, 'persist')
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
      var array
      if (typeof timeStr === 'string' && (array = timeStr.split(':')).length === 2) {
        hour = parseInt(array[0])
        minute = parseInt(array[1])
      }
    } catch (err) {
      logger.warn(`dnd mode time paser error: ${timeStr}`)
      hour = defaultHour
      minute = defaultMinute
    }
    d.setHours(hour)
    d.setMinutes(minute)
    return d
  }

  /**
   * Get the device active status
   * @function isActivity
   * @returns {string|null} app id if active or null if sleep
   */
  isActivity () {
    return this.visibility.getKeyAndVisibleAppId()
  }
}

class DNDMode {
  /**
   * constructor of DNDMode
   * @function constructor
   * @param {object} runtime - app runtime
   */
  constructor (runtime) {
    this.common = new DNDCommon(runtime.component.visibility)
    this.fsmStatus = config.FSM_READY
    this.fsmTimer = undefined
    this.waitSleep = false
    this.fsmWaitingBreaker = undefined
    this.isOptionBreaker = false
    runtime.component.lifetime.on('idle', this.onDeviceIdle.bind(this))
  }
  /**
   * when the device changes from active to idle, this function will be triggered
   * @function onDeviceIdle
   */
  onDeviceIdle () {
    if (this.waitSleep && this.fsmStatus === config.FSM_WAITING) {
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
    if (typeof option.action === 'string' && option.action === 'open') {
      DNDCommon.setSwitch('on')
    } else {
      DNDCommon.setSwitch('off')
    }
    var startTime = '22:00'
    var endTime = '7:00'
    var weekSetting = '1111111'
    if (typeof option.startTime === 'string') {
      startTime = option.startTime
    }
    if (typeof option.endTime === 'string') {
      endTime = option.endTime
    }
    if (typeof option.weekSetting === 'string') {
      weekSetting = option.weekSetting
    }
    DNDCommon.setStartTime(startTime)
    DNDCommon.setEndTime(endTime)
    DNDCommon.setWeekSetting(weekSetting)
    logger.info(`dnd mode config changed, recheck dnd mode`)
    this.isOptionBreaker = true
    if (this.fsmStatus === config.FSM_WAITING) {
      if (this.fsmWaitingBreaker) {
        logger.info('fsm waiting break')
        this.fsmWaitingBreaker()
      }
    } else if (this.fsmStatus === config.FSM_END) {
      this.start(config.FSMCode.Start)
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
    if (this.fsmStatus === config.FSM_WAITING) {
      if (this.fsmWaitingBreaker) {
        logger.info('fsm waiting break')
        this.fsmWaitingBreaker()
      }
    } else if (this.fsmStatus === config.FSM_END) {
      this.start(config.FSMCode.Start)
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
    this.start(config.FSMCode.Start)
  }

  /**
   * fsm main
   * @function start
   * @param {number} code - fsm code
   * @private
   */
  start (code) {
    while (code !== config.FSMCode.End && code !== config.FSMCode.WaitAsync) {
      logger.info(`fsmMain ${code}`)
      this.fsmStatus = config.FSM_RUNNING
      if (typeof config.FSMCode[code] === 'string') {
        if (typeof this[config.FSMCode[code]] === 'function') {
          code = this[config.FSMCode[code]](code)
        } else {
          logger.error(`${code} fsmMain error`)
          this.fsmStatus = config.FSM_ERROR
          return
        }
      }
    }
    if (code === config.FSMCode.WaitAsync) {
      this.fsmStatus = config.FSM_WAITING
    } else if (code === config.FSMCode.End) {
      this.fsmStatus = config.FSM_END
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
    var switchValue = property.get(config.SWITCH_KEY, 'persist')
    logger.info(`FSMCheckSwitch ${switchValue}`)
    return switchValue === 'on' ? config.FSMCode.CheckSwitchOn : config.FSMCode.CheckSwitchOff
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
    return status === 'on' ? config.FSMCode.CheckStatusOnX : config.FSMCode.CheckStatusOffX
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
    return status === 'on' ? config.FSMCode.CheckStatusOn : config.FSMCode.CheckStatusOff
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
    return config.FSMCode.End
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
    return config.FSMCode.DNDModeDisabled
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
    return rst > 0 ? config.FSMCode.CheckTimeSuccess : config.FSMCode.CheckTimeFailed
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
    return rst > 0 ? config.FSMCode.CheckTimeSuccessX : config.FSMCode.CheckTimeFailedX
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
    return config.FSMCode.DNDModeDisabledX
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
    this.waitSleep = (code === config.FSMCode.CheckActivityTrue || code === config.FSMCode.CheckActivityTrueX)
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
      this.start(config.FSMCode.CheckAgain)
    }, waitMs)
    this.fsmWaitingBreaker = () => {
      clearTimeout(this.fsmTimer)
      this.fsmWaitingBreaker = undefined
      this.fsmTimer = undefined
      this.start(config.FSMCode.CheckAgain)
    }
    logger.info(`wait ${waitMs}ms for next dnd mode checking ${this.fsmWaitingBreaker}`)
    return config.FSMCode.WaitAsync
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
      return activity ? config.FSMCode.CheckActivityTrue : config.FSMCode.CheckActivityFalse
    } else {
      logger.info(`FSMCheckActivity from option changed, always return FALSE`)
      return config.FSMCode.CheckActivityFalse
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
      return activity ? config.FSMCode.CheckActivityTrueX : config.FSMCode.CheckActivityFalseX
    } else {
      return config.FSMCode.CheckActivityFalseX
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
    return config.FSMCode.DNDModeEnabled
  }
}

module.exports = DNDMode
