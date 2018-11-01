'use strict'

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var logger = require('logger')('cloudAppClient-manager')
var eventRequest = require('./eventRequestApi')
var eventRequestMap = require('./eventRequestMap.json')

function Manager (exe, Skill) {
  EventEmitter.call(this)
  this.exe = exe
  this.Skill = Skill
  this.skills = []
  this.isAppActive = true
}
inherits(Manager, EventEmitter)

Manager.prototype.onrequest = function (nlp, action) {
  logger.log('sos onrequest')
  // call onrequest method, app is alive
  this.isAppActive = true
  var pos = this.findByAppId(action.appId)
  if (pos > -1) {
    if (this.getCurrentSkill().appId !== action.appId) {
      // destroy current skill
      var prev = this.skills.pop()
      prev.emit('destroy')
      this.skills[pos].emit('resume')
    }
    this.skills[pos].onrequest(action)
  } else {
    var skill = new this.Skill(this.exe, nlp, action)
    if (action.response.action.form === 'scene') {
      this.skills.forEach((elm) => {
        elm.emit('destroy')
      })
      this.skills = [skill]
    } else {
      var cur = this.getCurrentSkill()
      if (cur === false) {
        this.skills.push(skill)
      } else if (cur.form === 'scene') {
        cur.emit('pause')
        this.skills.push(skill)
      } else {
        this.skills.pop()
        this.skills.push(skill)
        cur.emit('destroy')
      }
    }
    skill.on('exit', this.next.bind(this, skill))
    skill.emit('start')
  }
}

Manager.prototype.findByAppId = function (appId) {
  for (var i = 0; i < this.skills.length; i++) {
    if (this.skills[i].appId === appId) {
      return i
    }
  }
  return -1
}

Manager.prototype.append = function (nlp, action) {
  var pos = this.findByAppId(action.appId)
  if (pos > -1) {
    logger.log(`skill ${action.appId}  index ${pos} append request`)
    this.skills[pos].onrequest(action)
  } else {
    logger.log(`skill ${action.appId} not in stack, append ignore`)
  }
}

Manager.prototype.next = function (skill) {
  logger.log(`next skill`)
  var cur = this.getCurrentSkill()
  if (cur.appId !== skill.appId) {
    return
  }
  this.skills.pop()
  if (this.skills.length <= 0) {
    this.isAppActive = false
    return this.emit('empty')
  }
  cur = this.getCurrentSkill()
  if (cur !== false) {
    cur.emit('resume')
  }
}

Manager.prototype.pause = function () {
  this.isAppActive = false
  var cur = this.getCurrentSkill()
  if (!cur) {
    return
  }
  if (cur.form === 'scene') {
    // Skill.emit('pause', isAppPause)
    cur.emit('pause', true)
  }
  // clear the form is not a scene type of skill
  if (cur.form !== 'scene') {
    this.skills.pop()
    cur.emit('exit')
  }
}

Manager.prototype.resume = function () {
  this.isAppActive = true
  var cur = this.getCurrentSkill()
  if (cur !== false) {
    cur.emit('resume')
  }
}

Manager.prototype.destroy = function () {
  this.isAppActive = false
  for (var i = 0; i < this.skills.length; i++) {
    this.skills[i].emit('destroy')
  }
  this.skills = []
}

Manager.prototype.getCurrentSkill = function () {
  if (this.skills.length <= 0) {
    return false
  }
  return this.skills[this.skills.length - 1]
}

Manager.prototype.sendEventRequest = function (type, name, data, args, cb) {
  if (!data.appId) {
    logger.log('ignored eventRequest, because it is no appId given')
    return cb && cb()
  }
  if ((type === 'tts' || type === 'media') && name === 'cancel' && this.isAppActive) {
    if (this.getCurrentSkill().appId === data.appId) {
      logger.info(`ignored ${type} cancel eventRequest, because currently skill cancel it self`)
      cb && cb()
      return
    }
  }
  if (data.disableEvent === true) {
    logger.log('ignored eventRequest, bacause directive identify disableEvent as true')
    cb && cb()
    return
  }
  if (type === 'tts') {
    eventRequest.ttsEvent(eventRequestMap[type][name], data.appId, args, (response) => {
      logger.log(`====> tts eventRequest response: ${response}`)
      if (response === '{}') {
        return cb && cb()
      }
      var action = JSON.parse(response)
      this.append(null, action)
      cb && cb()
    })
  } else if (type === 'media') {
    eventRequest.mediaEvent(eventRequestMap[type][name], data.appId, args, (response) => {
      logger.log(`====> media eventRequest response: ${response}`)
      if (response === '{}') {
        return cb && cb()
      }
      var action = JSON.parse(response)
      this.append(null, action)
      cb && cb()
    })
  }
}

Manager.prototype.setEventRequestConfig = function (config) {
  eventRequest.setConfig(config || {})
}

module.exports = Manager
