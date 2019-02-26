var test = require('tape')
var _ = require('@yoda/util')._
var mock = require('../../helper/mock')

var AppRuntime = require('@yoda/mock/lib/mock-app-runtime')

function mockAppSound (light) {
  mock.mockPromise(light, 'play', null, undefined)
  mock.mockPromise(light, 'stop', null, undefined)
  mock.mockPromise(light, 'appSound', () => {
    return new Promise(resolve => setTimeout(resolve, 1000))
  })
}

test('should clear counts on all request resolved', t => {
  t.plan(3)
  var runtime = new AppRuntime()
  var light = runtime.component.light
  mockAppSound(light)

  var promises = _.times(10).map(() => light.ttsSound('test', 'foo'))
  t.strictEqual(light.ttsSoundCountMap['test'], 10)
  mock.mockPromise(light, 'stop', () => {
    t.pass('stop should only be invoked once')
  })
  Promise.all(promises)
    .then(() => {
      t.looseEqual(light.ttsSoundCountMap['test'], null)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
