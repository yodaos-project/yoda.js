var test = require('tape')

var mm = require('../../helper/mock')
var bootstrap = require('../../bootstrap')

test('should schedule job', t => {
  t.plan(3)
  var tt = bootstrap()
  var chronos = tt.component.chronos

  mm.mockPromise(tt.runtime, 'openUrl', (url) => {
    t.strictEqual(url, 'yoda-app://foobar')
    t.strictEqual(chronos.findNextJobs(), Infinity)
    t.strictEqual(chronos.jobs.length, 0)
  })
  chronos.schedule({
    triggerAt: Date.now() + 100,
    url: 'yoda-app://foobar'
  })
})

test('should schedule repeating job', t => {
  t.plan(5)
  var tt = bootstrap()
  var chronos = tt.component.chronos

  var cnt = 0
  mm.mockPromise(tt.runtime, 'openUrl', (url) => {
    ++cnt
    t.strictEqual(url, 'yoda-app://foobar')
    if (cnt === 3) {
      chronos.cancel('yoda-app://foobar')
      t.strictEqual(chronos.findNextJobs(), Infinity)
      t.strictEqual(chronos.jobs.length, 0)
    }
  })
  chronos.schedule({
    repeat: true,
    triggerAt: Date.now() + 100,
    interval: 100,
    url: 'yoda-app://foobar'
  })
})

test('should push job to next queue if next delta is equal to job\'s', t => {
  t.plan(7)
  var tt = bootstrap()
  var chronos = tt.component.chronos

  mm.mockPromise(tt.runtime, 'openUrl', (url) => {
    t.strictEqual(url, 'yoda-app://foobar')
    t.strictEqual(chronos.findNextJobs(), Infinity)
    t.strictEqual(chronos.jobs.length, 0)
  })
  var triggerAt = Date.now() + 100
  chronos.schedule({
    triggerAt: triggerAt,
    url: 'yoda-app://foobar'
  })
  chronos.schedule({
    triggerAt: triggerAt,
    url: 'yoda-app://foobar'
  })
  t.strictEqual(chronos.nextJobs.length, 2)
})

test('should reschedule on next jobs all cancelled', t => {
  t.plan(3)
  var tt = bootstrap()
  var chronos = tt.component.chronos

  mm.mockPromise(tt.runtime, 'openUrl', (url) => {
    t.strictEqual(url, 'yoda-app://foobar-2')
    t.strictEqual(chronos.findNextJobs(), Infinity)
    t.strictEqual(chronos.jobs.length, 0)
  })
  chronos.schedule({
    triggerAt: Date.now() + 100,
    url: 'yoda-app://foobar-1'
  })
  chronos.schedule({
    triggerAt: Date.now() + 1000,
    url: 'yoda-app://foobar-2'
  })
  chronos.cancel('yoda-app://foobar-1')
})

test('Test interface of query():', t => {
  t.plan(6)
  var tt = bootstrap()
  var chronos = tt.component.chronos

  for (var i = 1; i <= 5; i++) {
    chronos.schedule({
      triggerAt: Date.now() + i * 1000,
      url: `yoda-app://forbar-${i}`
    })
  }
  t.equal(chronos.query('yoda-app://forbar-1'), true)
  t.equal(chronos.query('yoda-app://forbar-1/path'), false)
  t.equal(chronos.query('yoda-app://forbar-3'), true)
  t.equal(chronos.query('yoda-app://forbar-3/path?q=yes'), false)
  t.equal(chronos.query('yoda-app://forbar-5'), true)
  t.equal(chronos.query('yoda-app://forbar-7'), false)
  for (i = 1; i <= 5; i++) {
    chronos.cancel(`yoda-app://forbar-${i}`)
  }
})
