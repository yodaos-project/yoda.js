'use strict'

var logger = require('logger')('alarm-application')
var Core = require('./alarm-core')
var Application = require('@yodaos/application').Application
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

/**
 * @class Alarm
 * @param {Application} application
 */
function Alarm (option, api) {
  logger.info('Alarm is create=====>')
  EventEmitter.call(this)
  this.api = global[Symbol.for('yoda#api')]
  this.initApplication(option)
  this.AlarmCore = new Core(this.api)
  this.AlarmCore.createConfigFile()
}
inherits(Alarm, EventEmitter)

/**
 * init application,listen url or broadcast
 */
Alarm.prototype.initApplication = function initApplication (option) {
  var self = this
  option = {
    url: function url (urlObj) {
      logger.info('initApplication urlObj =====>', urlObj)
      if (urlObj && urlObj.pathname === '/add') {
        self.addAlarm(urlObj)
      } else if (urlObj && urlObj.pathname === '/del') {
        self.delAlarm(urlObj)
      } else {
        logger.warn('url is not add/del, alarm app do not support')
      }
    },
    broadcast: function broadcast (event) {
      logger.info('alarm Application recv broadcast ', event)
      if (event === 'yodaos.on-ready') {

      } else if (event === 'yodaos.on-system-booted') {
        self.initAlarm()
      }
    }
  }
  this.application = Application(option)
}

Alarm.prototype.getApplication = function getApplication () {
  return this.application
}

Alarm.prototype.addAlarm = function addAlarm (urlObj) {
  if (!urlObj) {
    return
  }
  var alarmData = {
    type: urlObj.query.type,
    id: urlObj.query.id,
    time: urlObj.query.time,
    repeat: urlObj.query.repeat,
    dayofweek_on: urlObj.query.dayofweek_on,
    dayofmonth_on: urlObj.query.dayofmonth_on,
    dayofyear_on: urlObj.query.dayofyear_on,
    feedback_utterance: urlObj.query.feedback_utterance,
    feedback_isblocking: urlObj.query.feedback_isblocking,
    feedback_pickup: urlObj.query.feedback_pickup,
    feedback_pickup_time: urlObj.query.feedback_pickup_time,
    memo_text: urlObj.query.memo_text
  }
  this.AlarmCore.addAlarm(alarmData)
}

Alarm.prototype.delAlarm = function delAlarm (urlObj) {
  if (!urlObj) {
    return
  }
  var alarmData = {
    type: urlObj.query.type,
    id: urlObj.query.id
  }
  this.AlarmCore.delAlarm(alarmData)
}

Alarm.prototype.initAlarm = function initAlarm () {
  this.AlarmCore.initAlarm()
}

module.exports = (option, api) => new Alarm(option, api).getApplication()
