var mm = require('@yodaos/mm')
var mock = require('@yodaos/mm/mock')
var constant = require('../../constant')

var test = mm.test
test = mm.beforeEach(test, t => {
  t.suite = mm.bootstrap()
  t.end()
})
test = mm.afterEach(test, t => {
  t.suite.teardown()
  t.end()
})

test('should remove declared method on focus loss', t => {
  t.plan(3)

  var application = t.suite.getApplication()
  var declaredGetStreamChannel = false
  var removedGetStreamChannel = false
  mock.proxyMethod(application.agent, 'declareMethod', {
    before: function (self, args) {
      if (args[0] === constant.GetStreamChannel) {
        declaredGetStreamChannel = true
      }
    }
  })
  mock.proxyMethod(application.agent, 'removeMethod', {
    before: function (self, args) {
      if (args[0] === constant.GetStreamChannel) {
        removedGetStreamChannel = true
      }
    }
  })
  t.suite.audioFocus
    .on('gained', focus => {
      t.assert(declaredGetStreamChannel, 'should declared GetStreamChannel')
      t.assert(!removedGetStreamChannel, 'should not remove GetStreamChannel once gained')
      focus.abandon()
    })
    .on('lost', () => {
      t.assert(removedGetStreamChannel, 'should remove GetStreamChannel on loss')
      t.end()
    })

  application.startVoice('tts-stream')
})
