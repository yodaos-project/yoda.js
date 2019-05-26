'use strict'

var test = require('tape')
var Manager = require('/opt/apps/cloudappclient/manager')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var MockDirective = require('./mock-directive')

var eventBus = new EventEmitter()

function Skill (exe, nlp, action) {
  EventEmitter.call(this)
  this.appId = action.appId
  this.form = action.response.action.form
  this.shouldEndSession = action.response.action.shouldEndSession
  this.directives = []
  this.paused = false
  this.task = 0
  this.exe = exe
  this.handleEvent()
  this.transform(action.response.action.directives || [])
}
inherits(Skill, EventEmitter)

Skill.prototype.onrequest = function (action, append) {
  if (this.paused === false) {
    this.emit('start')
  }
}

Skill.prototype.handleEvent = function () {
  this.on('start', () => {
    eventBus.emit(`start:${this.appId}`)
  })
  this.on('pause', () => {
    eventBus.emit(`pause:${this.appId}`)
  })
  this.on('resume', () => {
    eventBus.emit(`resume:${this.appId}`)
    if (this.task <= 0 && this.directives.length <= 0) {
      this.emit('exit')
    }
  })
  this.on('destroy', () => {
    eventBus.emit(`destroy:${this.appId}`)
  })
  this.on('exit', () => {
    eventBus.emit(`exit:${this.appId}`)
  })
}

Skill.prototype.requestOnce = function (nlp, action, callback) {
  callback()
}

Skill.prototype.transform = function (directives, append) {

}

test('test EXIT: requestOnce\'s should called after execute directive', (t) => {
  t.plan(1)
  var exe = new MockDirective()
  var manager = new Manager(exe, Skill)

  eventBus.on('start:appid1', () => {
    t.fail('appid1 should not emit start event')
  })

  manager.onrequestOnce({
    appId: 'appid1'
  }, {
    appId: 'appid1',
    response: {
      action: {
        shouldEndSession: false,
        form: 'cut',
        directives: [{
          type: 'test'
        }]
      }
    }
  }, () => {
    t.pass('requestOnce should called')
  })
})

test('test EXIT: requestOnce\'s should called and manager should continue execute', (t) => {
  t.plan(6)
  var exe = new MockDirective()
  var manager = new Manager(exe, Skill)

  eventBus.on('start:appid-test-requestOnce-continue1', () => {
    t.pass('appid-test-requestOnce-continue1 should emit start event')
  })
  eventBus.on('pause:appid-test-requestOnce-continue1', () => {
    t.pass('appid-test-requestOnce-continue1 should emit pause event')
    // Simulate continuous tasks
    manager.skills[0].task = 1
  })
  eventBus.on('resume:appid-test-requestOnce-continue1', () => {
    t.pass('appid-test-requestOnce-continue1 should emit resume event')
  })
  eventBus.on('destroy:appid-test-requestOnce-continue1', () => {
    t.fail('appid-test-requestOnce-continue1 should not emit destroy event')
  })

  eventBus.on('start:appid-test-requestOnce-continue2', () => {
    t.fail('appid-test-requestOnce-continue2 should not emit start event')
  })

  manager.onrequest({
    appId: 'appid-test-requestOnce-continue1'
  }, {
    appId: 'appid-test-requestOnce-continue1',
    response: {
      action: {
        shouldEndSession: false,
        form: 'scene',
        directives: [{
          type: 'test'
        }]
      }
    }
  })

  manager.onrequestOnce({
    appId: 'appid-test-requestOnce-continue2'
  }, {
    appId: 'appid-test-requestOnce-continue2',
    response: {
      action: {
        shouldEndSession: false,
        form: 'cut',
        directives: [{
          type: 'test'
        }]
      }
    }
  }, (err, continuous) => {
    t.strictEqual(err, null, 'err should be null')
    t.pass('requestOnce should called')
    t.strictEqual(continuous, true, 'continuous should be true')
  })
})

test('test EXIT 2: requestOnce\'s should called and manager should continue execute', (t) => {
  t.plan(10)
  var exe = new MockDirective()
  var manager = new Manager(exe, Skill)

  manager.on('empty', () => {
    t.pass('manager should be emit empty event')
  })
  eventBus.on('start:appid-test-requestOnce-continue3', () => {
    t.pass('appid-test-requestOnce-continue3 should emit start event')
  })
  eventBus.on('pause:appid-test-requestOnce-continue3', () => {
    t.pass('appid-test-requestOnce-continue3 should emit pause event')
  })
  eventBus.on('resume:appid-test-requestOnce-continue3', () => {
    t.pass('appid-test-requestOnce-continue3 should emit resume event')
  })
  eventBus.on('destroy:appid-test-requestOnce-continue3', () => {
    t.fail('appid-test-requestOnce-continue3 should not emit destroy event')
  })
  eventBus.on('exit:appid-test-requestOnce-continue3', () => {
    t.pass('appid-test-requestOnce-continue3 should emit exit event')
  })

  eventBus.on('start:appid-test-requestOnce-continue4', () => {
    t.fail('appid-test-requestOnce-continue4 should not emit start event')
  })
  eventBus.on('destroy:appid-test-requestOnce-continue4', () => {
    t.pass('appid-test-requestOnce-continue4 should emit destroy event')
  })
  eventBus.on('exit:appid-test-requestOnce-continue4', () => {
    t.pass('appid-test-requestOnce-continue4 should emit exit event')
  })

  manager.onrequest({
    appId: 'appid-test-requestOnce-continue3'
  }, {
    appId: 'appid-test-requestOnce-continue3',
    response: {
      action: {
        shouldEndSession: false,
        form: 'scene',
        directives: [{
          type: 'test'
        }]
      }
    }
  })

  manager.onrequestOnce({
    appId: 'appid-test-requestOnce-continue4'
  }, {
    appId: 'appid-test-requestOnce-continue4',
    response: {
      action: {
        shouldEndSession: false,
        form: 'cut',
        directives: [{
          type: 'test'
        }]
      }
    }
  }, (err, continuous) => {
    t.strictEqual(err, null, 'err should be null')
    t.pass('requestOnce should called')
    t.strictEqual(continuous, false, 'continuous should be false')
  })
})
