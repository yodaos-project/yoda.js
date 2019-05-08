'use strict'

var battery = require('@yoda/battery')
var helper = require('../../helper')
var EventEmitter = require('events').EventEmitter

var _injectInfo = {}
battery.getBatteryInfo = () => Promise.resolve(_injectInfo)
exports.setBatteryInfo = function setBatteryInfo (data) {
  _injectInfo = Object.assign({}, data)
}

var batteryApp = require(`${helper.paths.apps}/battery/app`)
function createActivity () {
  var activity = new EventEmitter()
  activity.media = new EventEmitter()
  activity.assertIntent = function (intent, asserts) {
    Object.assign(activity, asserts)
    activity.emit('request', { intent: intent }, {})
  }
  activity.assertURL = function (url, asserts) {
    Object.assign(activity, asserts)
    activity.emit('url', url)
  }
  require(`${helper.paths.apps}/battery/app`)(activity)
  return activity
}
exports.createActivity = createActivity
