'use strict'

var test = require('tape')
var config = require('../../helper/config')
var Manager = require('/opt/apps/cloudappclient/manager')
var Skill = require('/opt/apps/cloudappclient/skill')
var MockDirective = require('./mock-directive')
var logger = require('logger')('test-cloudappclient-manager')

var directive = new MockDirective()
var mockNlp = config.nlp
mockNlp.cloud = true
var mockAction = config.action

test('skills is null, add cut skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'cut'
  t.equal(manager.skills.length, 0, 'skills is null')
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var skill = manager.skills[0]
  t.equal(skill.appId, mockAction.appId, `skill is ${skill.appId}`)
  t.equal(skill.form, mockAction.response.action.form, `skill type is ${skill.form}`)
  t.end()
})

test('skills is null, add scene skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'scene'
  t.equal(manager.skills.length, 0, 'skills is null')
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var skill = manager.skills[0]
  t.equal(skill.appId, mockAction.appId, `skill is ${skill.appId}`)
  t.equal(skill.form, mockAction.response.action.form, `skill type is ${skill.form}`)
  t.end()
})

test('skills have cut skill, add scene skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'cut'
  t.equal(manager.skills.length, 0, 'skills is null')
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var cskill = manager.skills[0]
  t.equal(cskill.appId, mockAction.appId, `skill is ${cskill.appId}`)
  t.equal(cskill.form, mockAction.response.action.form, `skill type is ${cskill.form}`)
  mockAction.response.action.form = 'scene'
  mockAction.appId = 'scene-skill'
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var sskill = manager.skills[0]
  t.equal(sskill.appId, mockAction.appId, `skill is ${sskill.appId}`)
  t.equal(sskill.form, mockAction.response.action.form, `skill type is ${sskill.form}`)
  t.end()
})

test('skills have cut skill, add cut skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'cut'
  t.equal(manager.skills.length, 0, 'skills is null')
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var cskill = manager.skills[0]
  t.equal(cskill.appId, mockAction.appId, `skill is ${cskill.appId}`)
  t.equal(cskill.form, mockAction.response.action.form, `skill type is ${cskill.form}`)
  mockAction.appId = 'cut-skill'
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var skill = manager.skills[0]
  t.equal(skill.appId, mockAction.appId, `skill is ${skill.appId}`)
  t.equal(skill.form, mockAction.response.action.form, `skill type is ${skill.form}`)
  t.end()
})

test('skills have scene skill, add cut skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'scene'
  mockAction.appId = 'scene-skill'
  t.equal(manager.skills.length, 0, 'skills is null')
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var skill = manager.skills[0]
  t.equal(skill.appId, mockAction.appId, `skill is ${skill.appId}`)
  t.equal(skill.form, mockAction.response.action.form, `skill type is ${skill.form}`)
  mockAction.response.action.form = 'cut'
  mockAction.appId = 'cut-skill'
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 2)
  var skillscene = manager.skills[0]
  var skillcut = manager.skills[1]
  t.equal(skillcut.appId, 'cut-skill', `skill is ${skillcut.appId}`)
  t.equal(skillcut.form, 'cut', `skillcut type is ${skillcut.form}`)
  t.equal(skillscene.appId, 'scene-skill', `skill is ${skillscene.appId}`)
  t.equal(skillscene.form, 'scene', `skillscene type is ${skillscene.form}`)
  t.end()
})

test('skills have scene skill, add scene skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'scene'
  mockAction.appId = 'scene-skill-one'
  t.equal(manager.skills.length, 0, 'skills is null')
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var skill = manager.skills[0]
  t.equal(skill.appId, mockAction.appId, `skill is ${skill.appId}`)
  t.equal(skill.form, mockAction.response.action.form, `skill type is ${skill.form}`)
  mockAction.response.action.form = 'scene'
  mockAction.appId = 'scene-skill-two'
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var sskill = manager.skills[0]
  t.equal(sskill.appId, mockAction.appId, `skill is ${sskill.appId}`)
  t.equal(sskill.form, mockAction.response.action.form, `skill type is ${sskill.form}`)
  t.end()
})

test('loop add scene skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'scene'
  for (var i = 0; i < 100; i++) {
    mockAction.appId = `scene-skill-${i}`
    manager.onrequest(mockNlp, mockAction)
    t.equal(manager.skills.length, 1)
    var skill = manager.skills[0]
    t.equal(skill.appId, mockAction.appId, `skill is ${skill.appId}`)
    t.equal(skill.form, mockAction.response.action.form, `skill type is ${skill.form}`)
  }
  t.end()
})

test('skills have scene skill, loop add cut skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'scene'
  mockAction.appId = 'scene-skill'
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var skill = manager.skills[0]
  t.equal(skill.appId, mockAction.appId, `skill is ${skill.appId}`)
  t.equal(skill.form, mockAction.response.action.form, `skill type is ${skill.form}`)
  mockAction.response.action.form = 'cut'
  for (var i = 0; i < 100; i++) {
    mockAction.appId = `cut-skill-${i}`
    manager.onrequest(mockNlp, mockAction)
    t.equal(manager.skills.length, 2)
    var skillscene = manager.skills[0]
    var skillcut = manager.skills[1]
    t.equal(skillscene.appId, 'scene-skill', `skillscene is ${skillscene.appId}`)
    t.equal(skillscene.form, 'scene', `skill type is ${skillscene.form}`)
    t.equal(skillcut.appId, mockAction.appId, `skillcut is ${skillcut.appId}`)
    t.equal(skillcut.form, 'cut', `skill type is ${skillcut.form}`)
  }
  t.end()
})

test('loop add cut skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'cut'
  for (var i = 0; i < 100; i++) {
    mockAction.appId = `cut-skill-${i}`
    manager.onrequest(mockNlp, mockAction)
    t.equal(manager.skills.length, 1)
    var skill = manager.skills[0]
    t.equal(skill.appId, mockAction.appId, `skill is ${skill.appId}`)
    t.equal(skill.form, mockAction.response.action.form, `skill type is ${skill.form}`)
  }
  t.end()
})

test('skills have cut skill, loop add scene skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'cut'
  mockAction.appId = 'cut-skill'
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var skill = manager.skills[0]
  t.equal(skill.appId, mockAction.appId, `skill is ${skill.appId}`)
  t.equal(skill.form, mockAction.response.action.form, `skill type is ${skill.form}`)
  mockAction.response.action.form = 'scene'
  for (var i = 0; i < 100; i++) {
    mockAction.appId = `scene-skill-${i}`
    manager.onrequest(mockNlp, mockAction)
    t.equal(manager.skills.length, 1)
    var skillscene = manager.skills[0]
    t.equal(skillscene.appId, mockAction.appId, `skillscene is ${skillscene.appId}`)
    t.equal(skillscene.form, mockAction.response.action.form, `skill type is ${skillscene.form}`)
  }
  t.end()
})

test('skills is null, append cut skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'cut'
  t.equal(manager.skills.length, 0)
  manager.append(mockNlp, mockAction)
  t.equal(manager.skills.length, 0)
  t.end()
})

test('skills have cut skill, append the same skill', t => {
  var manager = new Manager(directive, Skill)
  mockAction.response.action.form = 'cut'
  mockAction.appId = 'cut-skill'
  t.equal(manager.skills.length, 0)
  manager.onrequest(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  var skill = manager.skills[0]
  logger.info('------>', skill.directives)
  manager.append(mockNlp, mockAction)
  t.equal(manager.skills.length, 1)
  t.end()
})
