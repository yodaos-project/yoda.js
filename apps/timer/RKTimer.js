'use strict'

var RKTime = require('./RKTime').RKTime

function RKTimer (millisecond, second, minute, hour, day) {
  this.day = day
  this.hour = hour
  this.minute = minute
  this.second = second
  this.millisecond = millisecond
  this.callback = null
  this.callbackOwner = null
  this.handle = 0
  this.isRunning = false
}

RKTimer.prototype.reset = function () {
  this.day = this.hour = this.minute = this.second = this.millisecond = 0
  this.isRunning = false
  this.callback = null
  this.callbackOwner = null
}

RKTimer.prototype.start = function (callback, callbackOwner) {
  this.reset()
  this.isRunning = true
  this.handle = setInterval(this.timer.bind(this), 50)
  this.callback = callback
  this.callbackOwner = callbackOwner
}

RKTimer.prototype.timer = function () {
  var ret = false
  this.millisecond = this.millisecond + 50
  if (this.millisecond >= 1000) {
    this.millisecond = 0
    this.second = this.second + 1
  }

  if (this.second >= 60) {
    this.second = 0
    this.minute = this.minute + 1
  }

  if (this.minute >= 60) {
    this.minute = 0
    this.hour = this.hour + 1
  }

  if (this.hour >= 24) {
    this.hour = 0
    this.day = this.day + 1
  }

  if (typeof this.callback === 'function') {
    ret = this.callback(this.callbackOwner, this)
  }

  if (ret) {
    this.stop()
  }
}

RKTimer.prototype.getTime = function () {
  return new RKTime(this.second, this.minute, this.hour, this.day)
}

RKTimer.prototype.getSecond = function () {
  return this.day * 86400 + this.hour * 3600 + this.minute * 60 + this.second
}

RKTimer.prototype.isRunningning = function () {
  return this.isRunning
}

RKTimer.prototype.stop = function () {
  clearInterval(this.handle)
  this.isRunning = false
  this.callback = null
  this.callbackOwner = null
}

exports.RKTimer = RKTimer
