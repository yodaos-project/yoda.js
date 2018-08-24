'use strict'

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits

function Skill (exe, nlp, action) {
  console.log(action.appId + ' was create')
  EventEmitter.call(this)
  this.appId = action.appId
  this.form = action.response.action.form
  this.directives = []
  this.paused = false
  this.exe = exe
  this.handleEvent()
  this.transform(action.response.action.directives || [])
}
inherits(Skill, EventEmitter)

Skill.prototype.onrequest = function (directives) {
  this.transform(directives || [])
  if (this.paused === false) {
    this.emit('start')
  }
}

Skill.prototype.handleEvent = function () {
  this.on('start', () => {
    console.log(this.appId + ' emit start')
    this.exe.execute(this.directives, 'frontend', () => {
      this.directives = []
      this.emit('exit')
    })
    this.paused = false
  })
  this.on('pause', () => {
    console.log(this.appId + ' emit pause')
    this.exe.execute([{
      type: 'media',
      action: 'pause',
      data: {}
    }], 'frontend')
    this.paused = true
  })
  this.on('resume', () => {
    console.log(this.appId + ' emit resume')
    this.exe.execute([{
      type: 'media',
      action: 'resume',
      data: {}
    }], 'frontend')
    if (this.directives.length > 0) {
      this.exe.execute(this.directives, 'frontend', () => {
        this.directives = []
        this.emit('exit')
      })
    }
    this.paused = false
  })
  this.on('destroy', () => {
    console.log(this.appId + ' emit destroy')
    this.exe.stop('frontend')
  })
}

Skill.prototype.transform = function (directives, append) {
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
    skill.on('exit', this.next.bind(this))
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
    this.skills[pos].onrequest(action.response.action.directives || [])
  }
}

Manager.prototype.next = function () {
  this.skills.pop()
  var cur = this.getCurrentSkill()
  if (cur !== false) {
    cur.emit('resume')
  }
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
}

Manager.prototype.getCurrentSkill = function () {
  if (this.skills.length <= 0) {
    return false
  }
  return this.skills[this.skills.length - 1]
}

module.exports = Manager
