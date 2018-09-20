var test = require('tape')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var helper = require('../../helper')
var Manager = require(`${helper.paths.apps}/cloudappclient/manager.js`)

var eventBus = new EventEmitter()

function Skill(exe, nlp, action) {
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
/**
 * weather
 */
test('manager: cut skill create and start', (t) => {
  t.plan(4)
  var manager = new Manager(null, Skill)
  var count = 0
  eventBus.on('start:appid-cut', () => {
    count++
    t.equal(count, 1, 'count == 1')
    t.pass('appId-cut emit start')
  })
  manager.on('empty', () => {
    count++
    t.equal(count, 2, 'count == 2')
    t.pass('manager emit empty')
  })
  manager.onrequest({
    appId: 'appid-cut'
  }, {
    appId: 'appid-cut',
    response: {
      action: {
        shouldEndSession: false,
        form: 'cut'
      }
    }
  })
  manager.skills[0].emit('exit')
})

/**
 * chat
 */
test('manager: service skill create and start', (t) => {
  t.plan(4)
  var manager = new Manager(null, Skill)
  var count = 0
  eventBus.on('start:appid-service', () => {
    count++
    t.equal(count, 1, 'count == 1')
    t.pass('appId-service emit start')
  })
  manager.on('empty', () => {
    count++
    t.equal(count, 2, 'count == 2')
    t.pass('manager emit empty')
  })
  manager.onrequest({
    appId: 'appid-service'
  }, {
    appId: 'appid-service',
    response: {
      action: {
        shouldEndSession: false,
        form: 'service'
      }
    }
  })
  manager.skills[0].emit('exit')
})

/**
 * music
 */
test('manager: scene skill create and start', (t) => {
  t.plan(4)
  var manager = new Manager(null, Skill)
  var count = 0
  eventBus.on('start:appid-scene', () => {
    count++
    t.equal(count, 1, 'count == 1')
    t.pass('appId-scene emit start')
  })
  manager.on('empty', () => {
    count++
    t.equal(count, 2, 'count == 2')
    t.pass('manager emit empty')
  })
  manager.onrequest({
    appId: 'appid-scene'
  }, {
    appId: 'appid-scene',
    response: {
      action: {
        shouldEndSession: false,
        form: 'scene'
      }
    }
  })
  manager.skills[0].emit('exit')
})
/**
 * story->chat
 */
test('manager test-2: scene->cut', (t) => {
  t.plan(10)
  var count = 0
  var manager = new Manager(null, Skill)
  eventBus.on('start:appid2-scene', () => {
    count++
    t.equal(count, 1, 'count == 1')
    t.pass('appId2-scene emit start')
  })
  eventBus.on('pause:appid2-scene', () => {
    count++
    t.equal(count, 2, 'count == 2')
    t.pass('appId2-scene emit pause')
  })
  eventBus.on('resume:appid2-scene', () => {
    count++
    t.equal(count, 4, 'count == 4')
    t.pass('appId2-scene emit resume')
    // scene app complete
    manager.skills[0].emit('exit')
  })
  eventBus.on('start:appid3-cut', () => {
    count++
    t.equal(count, 3, 'count == 3')
    t.pass('appId3-cut emit start')
  })
  manager.on('empty', () => {
    count++
    t.equal(count, 5, 'count == 5')
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
        form: 'service',
        shouldEndSession: false
      }
    }
  })
  // cut app complete
  manager.skills[1].emit('exit')
})

/**
 * story->weather->music
 */
test('manager test-3: scene1->cut->scene2', (t) => {
  t.plan(13)
  var count = 0
  var manager = new Manager(null, Skill)
  eventBus.on('start:appid4-scene', () => {
    count++
    t.equal(count, 1, 'count == 1')
    t.pass('appId4-scene emit start')
  })
  eventBus.on('pause:appid4-scene', () => {
    count++
    t.equal(count, 2, 'count == 2')
    t.pass('appId4-scene emit pause')
  })
  eventBus.on('resume:appid4-scene', () => {
    count++
    // t.equal(count, 5, 'count == 5')
    t.fail('appId4-scene emit resume')
    // scene app complete
    manager.skills[0].emit('exit')
  })
  eventBus.on('destroy:appid4-scene', () => {
    count++
    t.equal(count, 4, 'count == 4')
    t.pass('appid4-scene emit destroy')
  })

  eventBus.on('start:appid5-cut', () => {
    count++
    t.equal(count, 3, 'count == 3')
    t.pass('appId5-cut emit start')
  })
  eventBus.on('destroy:appid5-cut', () => {
    count++
    t.equal(count, 5, 'count == 5')
    t.pass('appId5-cut emit destroy')
  })

  eventBus.on('start:appid6-scene', () => {
    count++
    t.equal(count, 6, 'count == 6')
    t.pass('appId6-scene emit start')
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

/**
 * story->chat->story->music
 */
test('manager test-4: scene1->cut->scene1[resume]->scene2', t => {
  t.plan(13)
  var count = 0
  var manager = new Manager(null, Skill)
  eventBus.on('start:appid-test4-scene1', () => {
    count++
    t.equal(count, 1, 'count == 1')
    t.pass('appid-test4-scene1 emit start')
  })
  eventBus.on('pause:appid-test4-scene1', () => {
    count++
    t.equal(count, 2, 'count == 2')
    t.pass('appid-test4-scene1 emit pause')
  })
  eventBus.on('resume:appid-test4-scene1', () => {
    count++
    t.equal(count, 4, 'count == 4')
    t.pass('appid-test4-scene1 emit resume')
    // scene app complete
    manager.onrequest({
      appId: 'appid-test4-scene2'
    }, {
      appId: 'appid-test4-scene2',
      response: {
        action: {
          form: 'scene',
          shouldEndSession: false
        }
      }
    })
  })
  eventBus.on('destroy:appid-test4-scene1', () => {
    count++
    t.equal(count, 5, 'count == 5')
    t.pass('appid-test4-scene1 emit destroy')
  })

  eventBus.on('start:appid-test4-cut1', () => {
    count++
    t.equal(count, 3, 'count == 3')
    t.pass('appid-test4-cut1 emit start')
    setTimeout(() => {
      manager.skills[1].emit('exit')
    }, 1)
  })
  eventBus.on('destroy:appid-test4-cut1', () => {
    t.fail('appid-test4-cut1 emit destroy')
  })

  eventBus.on('start:appid-test4-scene2', () => {
    count++
    t.equal(count, 6, 'count == 6')
    t.pass('appid-test4-scene2 emit start')
    setTimeout(() => {
      manager.skills[0].emit('exit')
    }, 1)
  })

  manager.on('empty', () => {
    t.pass('manager test4 emit empty')
  })

  // scene app create
  manager.onrequest({
    appId: 'appid-test4-scene1'
  }, {
    appId: 'appid-test4-scene1',
    response: {
      action: {
        form: 'scene',
        shouldEndSession: false
      }
    }
  })
  // cut app create
  manager.onrequest({
    appId: 'appid-test4-cut1'
  }, {
    appId: 'appid-test4-cut1',
    response: {
      action: {
        form: 'service',
        shouldEndSession: false
      }
    }
  })
})

/**
 * weather->story->music
 */
test('manager test-5: cut->scene1[start]->scene2', t => {
  t.plan(20)
  var count = 0
  var manager = new Manager(null, Skill)
  manager.on('updateStack', stack => {
    if (count === 0) {
      t.equal(stack.length, 1)
      t.equal(stack[0].appId, 'appid-test5-cut1')
      t.equal(stack[0].form, 'cut')
    }
    if (count === 2) {
      t.equal(stack.length, 1)
      t.equal(stack[0].appId, 'appid-test5-scene1')
      t.equal(stack[0].form, 'scene')
    }
    if (count === 4) {
      t.equal(stack.length, 1)
      t.equal(stack[0].appId, 'appid-test5-scene2')
      t.equal(stack[0].form, 'scene')
    }
    console.info('stack', stack)
  })
  eventBus.on('start:appid-test5-cut1', () => {
    count++
    t.equal(count, 1, 'count == 1')
    t.pass('appid-test5-cut1 emit start')
  })
  eventBus.on('destroy:appid-test5-cut1', () => {
    count++
    t.equal(count, 2, 'count == 2')
    t.pass('appid-test5-cut1 emit destroy')
  })
  eventBus.on('start:appid-test5-scene1', () => {
    count++
    t.equal(count, 3, 'count == 3')
    t.pass('appid-test5-scene1 emit start')
    manager.onrequest({
      appId: 'appid-test5-scene2'
    }, {
      appId: 'appid-test5-scene2',
      response: {
        action: {
          form: 'scene',
          shouldEndSession: false
        }
      }
    })
  })
  eventBus.on('pause:appid-test5-scene1', () => {
    t.fail('appid-test5-scene1 emit pause')
  })
  eventBus.on('resume:appid-test5-scene1', () => {
    t.fail('appid-test5-scene1 emit resume')
  })
  eventBus.on('destroy:appid-test5-scene1', () => {
    count++
    t.equal(count, 4, 'count == 4')
    t.pass('appid-test5-scene1 emit destroy')
  })
  eventBus.on('start:appid-test5-scene2', () => {
    count++
    t.equal(count, 5, 'count == 5')
    t.pass('appid-test5-scene2 emit start')
    manager.skills[0].emit('exit')
  })
  manager.on('empty', () => {
    t.pass('manager test5 emit empty')
  })
  // cut app create
  manager.onrequest({
    appId: 'appid-test5-cut1'
  }, {
    appId: 'appid-test5-cut1',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: false
      }
    }
  })
  // scene app create
  manager.onrequest({
    appId: 'appid-test5-scene1'
  }, {
    appId: 'appid-test5-scene1',
    response: {
      action: {
        form: 'scene',
        shouldEndSession: false
      }
    }
  })
})

/**
 * weather->chat->music
 */
test('manager test-6: cut1->cut2->scene', t => {
  t.plan(11)
  var count = 0
  var manager = new Manager(null, Skill)
  manager.on('updateStack', stack => {
    console.info('stack', stack)
  })
  eventBus.on('start:appid-test6-cut1', () => {
    count++
    t.equal(count, 1, 'count == 1')
    t.pass('appid-test6-cut1 emit start')
  })
  eventBus.on('destroy:appid-test6-cut1', () => {
    count++
    t.equal(count, 2, 'count == 2')
    t.pass('appid-test6-cut1 emit destroy')
  })
  eventBus.on('start:appid-test6-cut2', () => {
    count++
    t.equal(count, 3, 'count == 3')
    t.pass('appid-test6-cut2 emit start')
    manager.onrequest({
      appId: 'appid-test6-scene'
    }, {
      appId: 'appid-test6-scene',
      response: {
        action: {
          form: 'scene',
          shouldEndSession: false
        }
      }
    })
  })
  eventBus.on('destroy:appid-test6-cut2', () => {
    count++
    t.equal(count, 4, 'count == 4')
    t.pass('appid-test6-cut2 emit destroy')
  })
  eventBus.on('start:appid-test6-scene', () => {
    count++
    t.equal(count, 5, 'count == 5')
    t.pass('appid-test6-scene emit start')
    manager.skills[0].emit('exit')
  })
  manager.on('empty', () => {
    t.pass('manager test6 emit empty')
  })

  // cut app create
  manager.onrequest({
    appId: 'appid-test6-cut1'
  }, {
    appId: 'appid-test6-cut1',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: false
      }
    }
  })
  // cut app create
  manager.onrequest({
    appId: 'appid-test6-cut2'
  }, {
    appId: 'appid-test6-cut2',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: false
      }
    }
  })
})

test('manager test-7: start updateStack, cut1->cut2', t => {
  t.plan(10)
  var count = 0
  var manager = new Manager(null, Skill)
  manager.on('updateStack', stack => {
    if (count === 0) {
      t.equal(stack.length, 1)
      t.equal(stack[0].appId, 'appid-test7-cut1', 'cut1 updatestack')
      t.equal(stack[0].form, 'cut')
    }
    if (count === 1) {
      t.equal(stack.length, 1)
      t.equal(stack[0].appId, 'appid-test7-cut2', 'cut2 updatestack')
      t.equal(stack[0].form, 'cut')
    }
    console.info(`stack ${count}`, stack)
  })
  eventBus.on('start:appid-test7-cut1', () => {
    t.pass('appid-test7-cut1 emit start')
  })
  eventBus.on('destroy:appid-test7-cut1', () => {
    count++
    t.pass('appid-test7-cut1 emit destroy')
  })
  eventBus.on('start:appid-test7-cut2', () => {
    t.pass('appid-test7-cut2 emit start')
    manager.skills[0].emit('exit')
  })
  eventBus.on('destroy:appid-test7-cut2', () => {
    t.fail('appid-test7-cut2 emit destroy')
  })
  manager.on('empty', () => {
    t.pass('manager test7 emit empty')
  })

  // cut app create
  manager.onrequest({
    appId: 'appid-test7-cut1'
  }, {
    appId: 'appid-test7-cut1',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: false
      }
    }
  })
  // cut app create
  manager.onrequest({
    appId: 'appid-test7-cut2'
  }, {
    appId: 'appid-test7-cut2',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: false
      }
    }
  })
})

/**
 * bug id = 14813
 */
test.skip('manager test-8: resume updateStack, scene->cut->scene', t => {
  t.plan(16)
  var count = 0
  var manager = new Manager(null, Skill)
  manager.on('updateStack', stack => {
    console.info(`stack ${count}`, stack)
    if (count === 0) {
      t.equal(stack.length, 1)
      t.equal(stack[0].appId, 'appid-test8-scene', 'scene updatestack')
      t.equal(stack[0].form, 'scene')
    }
    if (count === 1) {
      t.equal(stack.length, 2)
      t.equal(stack[1].appId, 'appid-test8-cut', 'cut updatestack')
      t.equal(stack[1].form, 'cut')
      t.equal(stack[0].appId, 'appid-test8-scene', 'scene updatestack')
      t.equal(stack[0].form, 'scene')
    }
    if (count === 2) {
      t.equal(stack.length, 1)
      t.equal(stack[0].appId, 'appid-test8-scene', 'scene updatestack')
      t.equal(stack[0].form, 'scene')
    }
  })
  eventBus.on('start:appid-test8-cut', () => {
    t.pass('appid-test8-cut emit start')
    manager.skills[1].emit('exit')
  })
  eventBus.on('destroy:appid-test8-cut', () => {
    t.fail('appid-test8-cut emit destroy')
  })
  eventBus.on('start:appid-test8-scene', () => {
    t.pass('appid-test8-scene emit start')
  })
  eventBus.on('pause:appid-test8-scene', () => {
    t.pass('appid-test8-scene emit pause')
    count++
  })
  eventBus.on('resume:appid-test8-scene', () => {
    t.pass('appid-test8-scene emit resume')
    count++
    manager.skills[0].emit('exit')
  })
  manager.on('empty', () => {
    t.pass('manager test8 emit empty')
  })
  // scene app create
  manager.onrequest({
    appId: 'appid-test8-scene'
  }, {
    appId: 'appid-test8-scene',
    response: {
      action: {
        form: 'scene',
        shouldEndSession: false
      }
    }
  })
  // cut app create
  manager.onrequest({
    appId: 'appid-test8-cut'
  }, {
    appId: 'appid-test8-cut',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: false
      }
    }
  })

})

test('manager test-9: destroy updateStack, cut->scene->cut', t => {
  t.plan(19)
  var count = 0
  var manager = new Manager(null, Skill)
  var cut2 = false
  manager.on('updateStack', stack => {
    console.info(`stack ${count}`, stack)
    if (count === 0) {
      t.equal(stack.length, 1)
      t.equal(stack[0].appId, 'appid-test9-cut', 'cut updatestack')
      t.equal(stack[0].form, 'cut')
    }
    if (count === 1) {
      t.equal(stack.length, 1)
      t.equal(stack[0].appId, 'appid-test9-scene', 'scene updatestack')
      t.equal(stack[0].form, 'scene')
    }
    if (count === 2) {
      t.equal(stack.length, 2)
      t.equal(stack[0].appId, 'appid-test9-scene', 'scene updatestack')
      t.equal(stack[0].form, 'scene')
      t.equal(stack[1].appId, 'appid-test9-cut', 'cut updatestack')
      t.equal(stack[1].form, 'cut')
    }
    if (count === 3) {
      t.equal(stack.length, 0)
    }
  })
  eventBus.on('start:appid-test9-cut', () => {
    // call twice
    t.pass('appid-test9-cut emit start')
    if (cut2) {
      manager.destroy()
    }
  })
  eventBus.on('destroy:appid-test9-cut', () => {
    // call twice
    t.pass('appid-test9-cut emit destroy')
    count++
  })
  eventBus.on('start:appid-test9-scene', () => {
    t.pass('appid-test9-scene emit start')
    cut2 = true
    manager.onrequest({
      appId: 'appid-test9-cut'
    }, {
      appId: 'appid-test9-cut',
      response: {
        action: {
          form: 'cut',
          shouldEndSession: false
        }
      }
    })

  })
  eventBus.on('pause:appid-test9-scene', () => {
    t.pass('appid-test9-scene emit pause')
    count++
  })
  eventBus.on('destroy:appid-test9-scene', () => {
    t.pass('appid-test9-scene emit destroy')
  })

  // cut app create
  manager.onrequest({
    appId: 'appid-test9-cut'
  }, {
    appId: 'appid-test9-cut',
    response: {
      action: {
        form: 'cut',
        shouldEndSession: false
      }
    }
  })

  // scene app create
  manager.onrequest({
    appId: 'appid-test9-scene'
  }, {
    appId: 'appid-test9-scene',
    response: {
      action: {
        form: 'scene',
        shouldEndSession: false
      }
    }
  })

})
