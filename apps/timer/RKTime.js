'use strict'

function RKTime (second, minute, hour, day) {
  this.day = day
  this.hour = hour
  this.minute = minute
  this.second = second
}

RKTime.prototype.setSecond = function (second) {
  this.day = second / 86400
  this.hour = (second % 86400) / 3600
  this.minute = (second % 86400 % 3600) / 60
  this.second = second % 86400 % 3600 % 60
}

RKTime.prototype.getSecond = function () {
  return this.day * 86400 + this.hour * 3600 + this.minute * 60 + this.second
}

RKTime.prototype.toString = function () {
  return 'RKTime'
}

RKTime.prototype.reset = function () {
  this.day = 0
  this.hour = 0
  this.minute = 0
  this.second = 0
}

exports.RKTime = RKTime
