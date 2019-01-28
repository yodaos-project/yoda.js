'use strict'

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var logger = require('logger')('cloudAppClient-manager')
var eventRequest = require('./eventRequestApi')
var eventRequestMap = require('./eventRequestMap.json')
var _ = require('@yoda/util')._

function Manager (exe, Skill) {
  EventEmitter.call(this)
  this.exe = exe
  this.Skill = Skill
  this.skills = []
  this.isAppActive = true
  // for gsensor roll in back,like strongpause
  this.manualPause = false
}
inherits(Manager, EventEmitter)

Manager.prototype.setManualPauseFLag = function (flag) {
  this.manualPause = flag
}

Manager.prototype.getManualPauseFLag = function () {
  return this.manualPause
}

Manager.prototype.onrequest = function (nlp, action) {
  if (!action || !action.appId) {
    logger.error(`Missing the appId! The action value is: [${JSON.stringify(action)}]`)
    if (this.skills.length === 0) {
      logger.log('there is no skill to run, emit [empty] event because missing appId!')
      this.emit('empty')
    } else {
      this.resume()
    }
    return
  }
  var directives = _.get(action, 'response.action.directives', [])
  if (directives.length <= 0) {
    logger.warn(`directive is empty! The action value is: [${JSON.stringify(action)}]`)
    if (this.skills.length === 0) {
      logger.log('there is no skill to run, emit [empty] event because directive is empty!')
      this.emit('empty')
    } else {
      logger.log('try to resume current skill')
      this.resume()
    }
    return
  }
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
    var form = _.get(action, 'response.action.form')
    if (form === 'scene') {
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
  this.emit('exit', skill)
  // if this flag equls true,means strong pause,so we do not exec next
  if (this.getManualPauseFLag() === true) {
    return
  }
  var cur = this.getCurrentSkill()
  if (cur && cur.appId !== skill.appId) {
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
    cur.emit('destroy')
    cur.emit('exit')
  }
}

Manager.prototype.resume = function () {
  this.isAppActive = true
  var cur = this.getCurrentSkill()
  if (cur !== false) {
    cur.emit('resume')
  } else {
    logger.log('not found skill, skipping resume skill')
  }
}

Manager.prototype.destroy = function () {
  this.isAppActive = false
  for (var i = 0; i < this.skills.length; i++) {
    this.skills[i].emit('destroy')
  }
  this.skills = []
}

/**
 * destroy a skill by given appId
 * @param {string} appId The appId
 */
Manager.prototype.destroyByAppId = function (appId) {
  var cur = this.getCurrentSkill()
  // there is currently no skill to execute.
  if (cur === false) {
    process.nextTick(() => {
      this.emit('empty')
    })
    return
  }
  // Ignore this operation if the skill is not found.
  if (cur.appId !== appId) {
    return
  }
  // destroy this skill and execute next skill.
  cur.emit('destroy')
  cur.emit('exit')
}

Manager.prototype.getCurrentSkill = function () {
  if (this.skills.length <= 0) {
    return false
  }
  return this.skills[this.skills.length - 1]
}

Manager.prototype.sendEventRequest = function (type, name, data, args, cb) {
  logger.log(`[sendReq] type(${type}) name(${name}) data(${JSON.stringify(data)}) args(${JSON.stringify(args)})`)
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
      logger.log(`[eventRes](${type}, ${name}) Res(${JSON.stringify(response)}`)
      if (response === '{}') {
        return cb && cb()
      }
      var action = JSON.parse(response)
      this.append(null, action)
      cb && cb()
    })
  } else if (type === 'media') {
    eventRequest.mediaEvent(eventRequestMap[type][name], data.appId, args, (response) => {
      logger.log(`[eventRes](${type}, ${name}) Res(${JSON.stringify(response)}`)
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
Manager.prototype.generateAction = function (data) {
  var action = {
    startWithActiveWord: false,
    appId: data.appId,
    response: {
      action: {
        form: 'scene',
        shouldEndSession: false,
        directives: [data]
      }
    }

  }
  return action
}
Manager.prototype.getSceneSkillIndex = function () {
  var index = -1
  this.skills.forEach((skill, idx) => {
    logger.info(`skill = ${skill.hasPlayer} ${skill.form} ${skill.saveRecoverData} ${idx}`)
    if (skill.hasPlayer && skill.form === 'scene') {
      index = idx
    }
  })
  return index
}
module.exports = Manager
