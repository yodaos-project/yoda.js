var test = require('tape')
var Service = require('/usr/yoda/services/multimediad/service')

function Light () {

}
Light.prototype.invoke = function () {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, 500)
  })
}

function getServiceInstance () {
  var light = new Light()
  return new Service(light)
}

test('test multimediad service: start and stop', function (t) {
  t.plan(2)
  var service = getServiceInstance()
  var playerId = service.start('@test', './firstguide.ogg', 'playback')
  service.on('prepared', function (id, dur, pos) {
    t.strictEqual(+id, playerId, 'player emit prepared event with a correct id')
    service.stop('@test')
  })
  service.on('cancel', function (id) {
    t.strictEqual(+id, playerId, 'player emit cancel event with a correct id')
  })
})

test('test multimediad service: pause and resume', function (t) {
  t.plan(2)
  var service = getServiceInstance()
  var playerId = service.start('@test', './firstguide.ogg', 'playback')
  service.on('prepared', function (id, dur, pos) {
    process.nextTick(() => {
      service.pause('@test')
    })
  })
  service.on('paused', function (id, dur, pos) {
    t.strictEqual(+id, playerId, 'player emit paused event with a correct id')
    service.resume('@test')
  })
  service.on('resumed', function (id, dur, pos) {
    t.strictEqual(+id, playerId, 'player emit resumed event with a correct id')
    service.stop('@test')
  })
})
