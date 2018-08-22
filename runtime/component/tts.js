'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

function Tts (permission) {
  EventEmitter.call(this)
  this.permission = permission
}
inherits(Tts, EventEmitter)

/**
 * 文字转语音并播放。播放成功返回播放句柄，失败则返回undefined，同时回调中第一个参数为err。
 * @param {string} appId 应用的AppID
 * @param {string} text 播放的文字
 * @param {function} cb 播放完成或播放错误回调函数
 * @return {number} handle 播放的句柄，失败返回undefined
 */
Tts.prototype.say = function (appId, text, cb) {
  if (typeof text === 'string') {
    if (this.permission.check(appId, 'tts')) {
      console.log('tts: ' + text)
      setTimeout(() => {
        cb(null)
      }, 0)
      return new Date().getTime() + ''
    } else {
      cb(new Error('permission deny'))
    }
  } else {
    cb(new Error('text must be string'))
  }
}

module.exports = Tts
