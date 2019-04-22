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

test('test multimediad service event: speedchange', function (t) {
  t.plan(2)
  var service = getServiceInstance()
  var playerId = service.start('@test', './firstguide.ogg', 'playback')
  service.on('prepared', function (id, dur, pos) {
    t.strictEqual(+id, playerId, 'player emit prepared event with a correct id')
    service.setSpeed('@test', 1.5)
  })
  service.on('speedchange', function (id, dur, pos) {
    t.strictEqual(+id, playerId, 'player emit speedchange event with a correct id')
    service.stop('@test')
  })
})
