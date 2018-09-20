var test = require('tape')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var helper = require('../../helper')
var Manager = require(`${helper.paths.apps}/cloudappclient/manager.js`)

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
  })
  this.on('destroy', () => {
    eventBus.emit(`destroy:${this.appId}`)
  })
}
Skill.prototype.transform = function (directives, append) {

}

test('manager: test create skill and start', (t) => {
  t.plan(2)
  var manager = new Manager(null, Skill)
  eventBus.on('start:appid1', () => {
    t.pass('appId1 emit start')
  })
  manager.on('empty', () => {
    t.pass('manager emit empty')
  })
  manager.onrequest({
    appId: 'appid1'
  }, {
    appId: 'appid1',
    response: {
      action: {
        shouldEndSession: false,
        form: 'cut'
      }
    }
  })
  manager.skills[0].emit('exit')
})

test('manager2: test scene and cut skill', (t) => {
  t.plan(5)
  var manager = new Manager(null, Skill)
  eventBus.on('start:appid2-scene', () => {
    t.pass('appId2-scene emit start')
  })
  eventBus.on('pause:appid2-scene', () => {
    t.pass('appId2-scene emit pause')
  })
  eventBus.on('resume:appid2-scene', () => {
    t.pass('appId2-scene emit resume')
    // scene app complete
    manager.skills[0].emit('exit')
  })
  eventBus.on('start:appid3-cut', () => {
    t.pass('appId3-cut emit start')
  })
  manager.on('empty', () => {
    t.pass('manager2 emit empty')
  })

  // scene app create
  manager.onrequest({
    appId: 'appid2-scene'
  }, {
    appId: 'appid2-scene',
    response: {
      action: {
        form: 'scene',
        shouldEndSession: false
      }
    }
  })
  // cut app create
  manager.onrequest({
    appId: 'appid3-cut'
  }, {
    appId: 'appid3-cut',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: false
      }
    }
  })
  // cut app complete
  manager.skills[1].emit('exit')
})

test('manager3: test scene destroy', (t) => {
  t.plan(7)
  var manager = new Manager(null, Skill)
  eventBus.on('start:appid4-scene', () => {
    t.pass('appId4-scene emit start')
  })
  eventBus.on('pause:appid4-scene', () => {
    t.pass('appId4-scene emit pause')
  })
  eventBus.on('resume:appid4-scene', () => {
    t.pass('appId4-scene emit resume')
    // scene app complete
    manager.skills[0].emit('exit')
  })
  eventBus.on('destroy:appid4-scene', () => {
    t.pass('appid4-scene emit destroy')
  })

  eventBus.on('start:appid5-cut', () => {
    t.pass('appId5-cut emit start')
  })
  eventBus.on('destroy:appid5-cut', () => {
    t.pass('appId5-cut emit destroy')
  })

  eventBus.on('start:appid6-scene', () => {
    t.pass('appId6-cut emit start')
  })

  manager.on('empty', () => {
    t.pass('manager3 emit empty')
  })

  // scene app create
  manager.onrequest({
    appId: 'appid4-scene'
  }, {
    appId: 'appid4-scene',
    response: {
      action: {
        form: 'scene',
        shouldEndSession: false
      }
    }
  })
  // cut app create
  manager.onrequest({
    appId: 'appid5-cut'
  }, {
    appId: 'appid5-cut',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: false
      }
    }
  })
  // scene app create
  manager.onrequest({
    appId: 'appid6-scene'
  }, {
    appId: 'appid6-scene',
    response: {
      action: {
        form: 'scene',
        shouldEndSession: false
      }
    }
  })
  // cut app complete
  manager.skills[0].emit('exit')
})

test('manager3: test skill exit event', (t) => {
  t.plan(2)
  var manager = new Manager(null, Skill)
  eventBus.on('start:appid-cut-test-exit', () => {
    t.pass('appid-cut-test-exit emit start')
    manager.skills[0].emit('exit')
  })
  manager.on('empty', () => {
    t.pass('manager3 emit empty')
  })

  manager.onrequest({
    appId: 'appid-cut-test-exit'
  }, {
    appId: 'appid-cut-test-exit',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: false
      }
    }
  })
})
