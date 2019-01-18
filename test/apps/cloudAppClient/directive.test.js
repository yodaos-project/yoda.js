var test = require('tape')
var EventEmitter = require('events').EventEmitter
var helper = require('../../helper')
var Directive = require(`${helper.paths.apps}/cloudappclient/directive.js`).Directive

var exe = new Directive()
var eventBus = new EventEmitter()

exe.do('frontend', 'tts', (item, next) => {
  eventBus.emit(`tts:${item.id}:${item.action}`)
  if (item.action === 'speak') {
    eventBus.on(`tts:${item.id}:end`, next)
  } else {
    next()
  }
})

exe.do('frontend', 'media', (dt, next) => {
  eventBus.emit(`media:${dt.id}:${dt.action}`)
  if (dt.action === 'play') {
    eventBus.on(`media:${dt.id}:end`, next)
  } else {
    next()
  }
})

test('directive: test next process', (t) => {
  t.plan(2)

  var dts = [{
    type: 'tts',
    action: 'speak',
    id: 1
  }, {
    type: 'media',
    action: 'play',
    id: 2
  }, {
    type: 'tts',
    action: 'cancel',
    id: -1
  }]
  eventBus.on('tts:1:speak', () => {
    t.pass('tts speak emit')
  })
  eventBus.on('media:2:play', () => {
    t.pass('media play emit')
  })
  eventBus.on('tts:-1:cancel', () => {
    t.fail('tts -1 should not emit')
  })
  exe.execute(dts, 'frontend', () => {
    t.fail('directive should not end')
  })
  eventBus.emit('tts:1:end')
})

test('directive2: test end callback', (t) => {
  t.plan(6)

  var dts1 = [{
    type: 'tts',
    action: 'speak',
    id: 3
  }, {
    type: 'media',
    action: 'play',
    id: 4
  }, {
    type: 'tts',
    action: 'cancel',
    id: -2
  }]
  eventBus.on('tts:3:speak', () => {
    t.pass('tts3 speak emit')
  })
  eventBus.on('media:4:play', () => {
    t.pass('media4 play emit')
  })
  eventBus.on('tts:-2:cancel', () => {
    t.fail('tts -2 should not emit')
  })
  exe.execute(dts1, 'frontend', () => {
    t.fail('dts1 should not end')
  })
  eventBus.emit('tts:3:end')

  var dts2 = [{
    type: 'tts',
    action: 'speak',
    id: 5
  }, {
    type: 'media',
    action: 'play',
    id: 6
  }, {
    type: 'tts',
    action: 'cancel',
    id: -3
  }]
  eventBus.on('tts:5:speak', () => {
    t.pass('tts 5 speak emit')
  })
  eventBus.on('media:6:play', () => {
    t.pass('tts 6 play emit')
  })
  eventBus.on('tts:-3:cancel', () => {
    t.pass('tts -3 emit')
  })
  exe.execute(dts2, 'frontend', () => {
    t.pass('dts2 end')
  })

  eventBus.emit('tts:5:end')
  eventBus.emit('media:6:end')
})

test('directive3: test nowait property', (t) => {
  var directives = [{
    id: 30,
    type: 'tts',
    action: 'speak',
    nowait: true
  }, {
    id: 31,
    type: 'media',
    action: 'play'
  }]

  eventBus.on('tts:30:speak', () => {
    t.pass('tts start speaking.')
  })
  eventBus.on('media:31:play', () => {
    t.pass('media start playing.')
  })
  exe.execute(directives, 'frontend', () => {
    t.end()
  })
  setTimeout(() => {
    // no need to set tts:end
    eventBus.emit('media:31:end')
  }, 500)
})
