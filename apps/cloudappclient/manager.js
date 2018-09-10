'use strict'

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var eventRequest = require('./eventRequestApi')
var eventRequestMap = require('./eventRequestMap.json')
var logger = require('logger')('manager')

function Skill (exe, nlp, action) {
  logger.log(action.appId + ' was create')
  EventEmitter.call(this)
  this.appId = action.appId
  this.form = action.response.action.form
  this.directives = []
  this.paused = false
  this.task = 0
  this.exe = exe
  this.handleEvent()
  this.transform(action.response.action.directives || [])
}
inherits(Skill, EventEmitter)

Skill.prototype.onrequest = function (directives, append) {
  if (directives === undefined || directives.length <= 0) {
    return
  }
  logger.log(`skill ${this.appId} onrequest`)
  this.transform(directives || [], append)
  logger.log(`${this.appId} pause: ${this.paused}`, this.directives)
  if (this.paused === false) {
    this.emit('start')
  }
}

Skill.prototype.handleEvent = function () {
  this.on('start', () => {
    logger.log(this.appId + ' emit start', this.directives)
    this.paused = false
    this.task++
    this.exe.execute(this.directives, 'frontend', () => {
      this.task--
      logger.info('execute end', this.appId, this.directives, this.paused)
      if (this.paused === true) {
        return
      }
      if (this.task > 0) {
        return
      }
      if (this.directives.length > 0) {
        return this.emit('start')
      }
      this.directives = []
      logger.log(`${this.appId} exit because exe complete`)
      this.emit('exit')
    })
  })
  this.on('pause', () => {
    logger.log(this.appId + ' emit pause')
    this.exe.execute([{
      type: 'media',
      action: 'pause',
      data: {}
    }], 'frontend')
    this.paused = true
  })
  this.on('resume', () => {
    logger.log(this.appId + ' emit resume')
    this.exe.execute([{
      type: 'media',
      action: 'resume',
      data: {}
    }], 'frontend')
    if (this.directives.length > 0) {
      this.task++
      this.exe.execute(this.directives, 'frontend', () => {
        this.task--
        if (this.paused === true) {
          return
        }
        if (this.task > 0) {
          return
        }
        if (this.directives.length > 0) {
          return this.emit('start')
        }
        this.directives = []
        this.emit('exit')
      })
    }
    this.paused = false
  })
  this.on('destroy', () => {
    logger.log(this.appId + ' emit destroy')
    this.exe.stop('frontend')
  })
}

Skill.prototype.transform = function (directives, append) {
  logger.log(this.appId, directives, append)
  if (append !== true) {
    this.directives = []
  }
  if (directives === undefined || directives.length <= 0) {
    return
  }
  var ttsActMap = {
    'PLAY': 'say',
    'STOP': 'cancel'
  }
  var mediaActMap = {
    'PAUSE': 'pause',
    'PLAY': 'play',
    'RESUME': 'resume'
  }
  directives.forEach((ele) => {
    var tdt = {}
    if (ele.type === 'voice') {
      tdt = {
        type: 'tts',
        action: ttsActMap[ele.action],
        data: ele
      }
      tdt.data.appId = this.appId
      this.directives.push(tdt)
    } else if (ele.type === 'media') {
      tdt = {
        type: 'media',
        action: mediaActMap[ele.action],
        data: ele
      }
      tdt.data.appId = this.appId
      this.directives.push(tdt)
    } else if (ele.type === 'confirm') {
      tdt = {
        type: 'confirm',
        action: '',
        data: ele
      }
      tdt.data.appId = this.appId
      this.directives.push(tdt)
    } else if (ele.type === 'pickup') {
      tdt = {
        type: 'pickup',
        action: '',
        data: ele
      }
      tdt.data.appId = this.appId
      this.directives.push(tdt)
    } else if (ele.type === 'native') {
      tdt = {
        type: 'native',
        action: '',
        data: ele
      }
      tdt.data.appId = this.appId
      this.directives.push(tdt)
    }
  })
}

function Manager (exe) {
  EventEmitter.call(this)
  this.exe = exe
  this.skills = []
}
inherits(Manager, EventEmitter)

Manager.prototype.onrequest = function (nlp, action) {
  logger.log('sos onrequest')
  var pos = this.findByAppId(action.appId)
  if (pos > -1) {
    this.skills[pos].onrequest(action.response.action.directives)
  } else {
    var skill = new Skill(this.exe, nlp, action)
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
        cur.emit('destroy')
        this.skills.pop()
        this.skills.push(skill)
      }
    }
    skill.emit('start')
    skill.on('exit', this.next.bind(this, skill))
    this.emit('updateStack', this.updateStack())
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
    this.skills[pos].onrequest(action.response.action.directives || [])
  } else {
    logger.log(`skill ${action.appId} not in stack, append ignore`)
    // this.onrequest(nlp, action)
  }
}

Manager.prototype.next = function (skill) {
  logger.log(`next skill`)
  var cur = this.getCurrentSkill()
  if (cur.appId !== skill.appId) {
    return
  }
  this.skills.pop()
  cur = this.getCurrentSkill()
  if (cur !== false) {
    cur.emit('resume')
  }
  this.emit('updateStack', this.updateStack())
}

Manager.prototype.pause = function () {
  var cur = this.getCurrentSkill()
  if (cur !== false) {
    cur.emit('pause')
  }
}

Manager.prototype.resume = function () {
  var cur = this.getCurrentSkill()
  if (cur !== false) {
    cur.emit('resume')
  }
}

Manager.prototype.destroy = function () {
  for (var i = 0; i < this.skills.length; i++) {
    this.skills[i].emit('destroy')
  }
  this.skills = []
  this.emit('updateStack', [])
}

Manager.prototype.getCurrentSkill = function () {
  if (this.skills.length <= 0) {
    return false
  }
  return this.skills[this.skills.length - 1]
}

Manager.prototype.updateStack = function () {
  var stack = []
  for (var i = 0; i < this.skills.length; i++) {
    stack.push({
      appId: this.skills[i].appId,
      form: this.skills[i].form
    })
  }
  return stack
}

Manager.prototype.sendEventRequest = function (type, name, data, args, cb) {
  if (type === 'tts' && name === 'cancel') {
    if (this.getCurrentSkill().appId === data.appId) {
      logger.log('current tts cancel event, ignore')
      cb && cb()
      return
    }
  }
  if (data.disableEvent === true) {
    logger.log('disable event, ignore')
    cb && cb()
    return
  }
  if (type === 'tts') {
    eventRequest.ttsEvent(eventRequestMap[type][name], data.appId, args, (response) => {
      logger.log(`====> tts response: ${response}`)
      var action = JSON.parse(response)
      this.append(null, action)
      cb && cb()
    })
  } else if (type === 'media') {
    eventRequest.mediaEvent(eventRequestMap[type][name], data.appId, args, (response) => {
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
