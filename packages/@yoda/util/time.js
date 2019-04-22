'use strict'

/**
 * Convert separated time numbers to a natual time string.
 * @param {number} seconds number of seconds
 * @param {number} minutes number of minutes
 * @param {number} hours number of hours
 * @param {number} days number of days
 * @param {string} locale the locale of language
 * @returns {string} - a natual time string.
 */
function toString (seconds, minutes, hours, days, locale) {
  var secs = toSeconds(seconds, minutes, hours, days)
  var day = Math.floor(secs / 86400)
  var hour = Math.floor((secs % 86400) / 3600)
  var minute = Math.floor((secs % 86400 % 3600) / 60)
  var second = secs % 86400 % 3600 % 60
  var s = ''
  locale = locale || 'zh-cn'
  switch (locale) {
    case 'zh-cn':
      if (day > 0) {
        s = s + day + '天'
      }
      if (hour > 0) {
        s = s + hour + '小时'
      }
      if (minute > 0) {
        s = s + minute + '分钟'
      }
      if (second > 0) {
        s = s + second + '秒'
      }
      if (s.length === 0) {
        s = '0秒'
      }
      break
    case 'en-gb':
    case 'en-us':
      if (day > 0) {
        s = s + day + ' day'
      }
      if (day > 1) {
        s = s + 's'
      }
      if (hour > 0) {
        if (s.length > 0) {
          s = s + ' and '
        }
        s = s + hour + ' hour'
      }
      if (hour > 1) {
        s = s + 's'
      }
      if (minute > 0) {
        if (s.length > 0) {
          s = s + ' and '
        }
        s = s + minute + ' minute'
      }
      if (minute > 1) {
        s = s + 's'
      }
      if (second > 0) {
        if (s.length > 0) {
          s = s + ' and '
        }
        s = s + second + ' second'
      }
      if (second > 1) {
        s = s + 's'
      }
      if (s.length === 0) {
        s = '0 second'
      }
      break
    default:
      break
  }
  return s
}

/**
 * Calcuate total seconds of the time.
 * @param {number} seconds number of seconds
 * @param {number} minutes number of minutes
 * @param {number} hours number of hours
 * @param {number} days number of days
 * @returns {number} - the total seconds.
 */
function toSeconds (seconds, minutes, hours, days) {
  days = days || 0
  hours = hours || 0
  minutes = minutes || 0
  seconds = seconds || 0
  return days * 86400 + hours * 3600 + minutes * 60 + seconds
}

module.exports.toString = toString
module.exports.toSeconds = toSeconds
