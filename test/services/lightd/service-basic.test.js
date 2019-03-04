var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')

test('test function: isSystemURI', (t) => {
  t.plan(2)
  var service = new Service()
  var res = service.isSystemURI('/opt/light/setMuted.js')
  t.strictEqual(res, true, '/opt/light/setMuted.js should be systemspaceURI')

  res = service.isSystemURI('/opt/light/xxxunknown.js')
  t.strictEqual(res, false, '/opt/light/xxxunknown.js should be userspaceURI')
})

test('test function: canRender(systemspace is always higher than userspace)', (t) => {
  t.plan(1)
  var service = new Service()
  service.prevUri = '/opt/light/setMuted.js'

  var res = service.canRender('/opt/light/inCall.js', 2)
  t.strictEqual(res, false, 'The userspace light of URI[/opt/light/inCall.js] should not be render.')
})

test('test function: canRender(systemspace, the smaller the number, the higher the priority)', (t) => {
  t.plan(1)
  var service = new Service()
  service.prevUri = '/opt/light/setMuted.js'
  service.prevZIndex = 2

  var res = service.canRender('/opt/light/setVolume.js')
  t.strictEqual(res, true, 'The systemspace light of URI[/opt/light/setVolume.js] should be render.')
})

test('test function: canRender(userspace, the larger the number, the higher the number of layers)', (t) => {
  t.plan(1)
  var service = new Service()
  service.prevUri = '/opt/light/inCall.js'
  service.prevZIndex = 0

  var res = service.canRender('/opt/light/xxxunknown.js', 2)
  t.strictEqual(res, true, 'The userspace light of URI[/opt/light/xxxunknown.js] should be render.')
})
