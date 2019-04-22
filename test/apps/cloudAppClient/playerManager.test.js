var test = require('tape')
var helper = require('../../helper')
var PlayerManager = require(`${helper.paths.apps}/cloudappclient/playerManager`)

test('test setByAppId and change event', (t) => {
  t.plan(4)
  var pm = new PlayerManager()
  pm.on('change', (appId, oldPid, newPid) => {
    t.strictEqual(appId, '@testAppId', 'change event emit with a correct appId')
    t.strictEqual(oldPid, '1001', 'change event emit with a correct oldPid')
    t.strictEqual(newPid, '1002', 'change event emit with a correct newPid')
  })
  pm.setByAppId('@testAppId', '1001')
  pm.on('update', (handle) => {
    t.deepEqual(handle, { '@testAppId': '1002' }, 'update event emit with a correct value')
  })
  pm.setByAppId('@testAppId', '1002')
})
