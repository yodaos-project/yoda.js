'use strict'

function Time (second, minute, hour, day) {
  this.day = day || 0
  this.hour = hour || 0
  this.minute = minute || 0
  this.second = second || 0
}

Time.prototype.setSeconds = function (secs) {
  this.day = secs / 86400
  this.hour = (secs % 86400) / 3600
  this.minute = (secs % 86400 % 3600) / 60
  this.second = secs % 86400 % 3600 % 60
}

Time.prototype.getSeconds = function () {
  return this.day * 86400 + this.hour * 3600 + this.minute * 60 + this.second
}

Time.prototype.toString = function () {
  var s = ''
  if (this.day > 0) {
    s = s + this.day + '天'
  }
  if (this.hour > 0) {
    s = s + this.hour + '小时'
  }
  if (this.minute > 0) {
    s = s + this.minute + '分钟'
  }
  if (this.second > 0) {
    s = s + this.second + '秒'
  }
  return s
}

Time.prototype.reset = function () {
  this.day = 0
  this.hour = 0
  this.minute = 0
  this.second = 0
}

exports.Time = Time
