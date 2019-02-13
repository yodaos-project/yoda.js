var test = require('tape')
var property = require('@yoda/property')

var rtHelper = require('../rt-helper')
var mock = require('../../helper/mock')

var initComponents = [ 'appLoader', 'custodian', 'dispatcher', 'flora', 'lifetime', 'light', 'permission', 'sound', 'turen' ]

function getAppRuntime () {
  var runtime = rtHelper.getAppRuntime(initComponents)
  runtime.component.dbusRegistry = {
    callMethod: () => Promise.resolve()
  }
  return runtime
}

test('should not break if runtime has not been disabled', t => {
  t.plan(8)
  rtHelper.loadBaseConfig()
  var runtime = getAppRuntime()

  property.set('sys.firstboot.init', '0', 'persist')
  mock.mockPromise(runtime.component.dispatcher, 'delegate', null, false)
  mock.mockReturns(runtime, 'isStartupFlagExists', false)

  mock.mockPromise(runtime.component.light, 'ttsSound', (appId, name) => {
    t.strictEqual(appId, '@yoda')
    t.strictEqual(name, 'system://firstboot.ogg')
  })
  mock.mockPromise(runtime.component.light, 'play', (appId, name) => {
    t.strictEqual(appId, '@yoda')
    t.strictEqual(name, 'system://boot.js')
  })
  mock.mockPromise(runtime.component.light, 'appSound', (appId, name) => {
    t.strictEqual(appId, '@yoda')
    t.strictEqual(name, 'system://boot.ogg')
  })
  mock.mockReturns(runtime.component.custodian, 'prepareNetwork', () => {
    t.pass('should prepare network')
  })
  runtime.init()
    .then(() => {
      t.strictEqual(runtime.hasBeenDisabled(), false)
      runtime.deinit()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.deinit()
      t.end()
    })
})

test('should not announce first boot guide if is not first boot', t => {
  t.plan(6)
  rtHelper.loadBaseConfig()
  var runtime = getAppRuntime(initComponents)

  property.set('sys.firstboot.init', '1', 'persist')
  mock.mockPromise(runtime.component.dispatcher, 'delegate', null, false)
  mock.mockReturns(runtime, 'isStartupFlagExists', false)

  mock.mockPromise(runtime.component.light, 'ttsSound', (appId, name) => {
    if (name === 'system://firstboot.ogg') {
      t.fail('unreachable path')
    }
  })
  mock.mockPromise(runtime.component.light, 'play', (appId, name) => {
    t.strictEqual(appId, '@yoda')
    t.strictEqual(name, 'system://boot.js')
  })
  mock.mockPromise(runtime.component.light, 'appSound', (appId, name) => {
    t.strictEqual(appId, '@yoda')
    t.strictEqual(name, 'system://boot.ogg')
  })
  mock.mockReturns(runtime.component.custodian, 'prepareNetwork', () => {
    t.pass('should prepare network')
  })
  runtime.init()
    .then(() => {
      t.strictEqual(runtime.hasBeenDisabled(), false)
      runtime.deinit()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.deinit()
      t.end()
    })
})

test('should break announcements if runtime disabled', t => {
  t.plan(2)
  rtHelper.loadBaseConfig()
  var runtime = getAppRuntime(initComponents)

  runtime.disableRuntimeFor('test')

  property.set('sys.firstboot.init', '0', 'persist')
  mock.mockPromise(runtime.component.dispatcher, 'delegate', null, false)
  mock.mockReturns(runtime, 'isStartupFlagExists', false)

  mock.mockPromise(runtime.component.light, 'ttsSound', (appId, name) => {
    if (name === 'system://firstboot.ogg') {
      t.fail('unreachable path')
    }
  })
  mock.mockPromise(runtime.component.light, 'play', (appId, name) => {
    if (name === 'system://boot.js') {
      t.fail('unreachable path')
    }
  })
  mock.mockPromise(runtime.component.light, 'appSound', (appId, name) => {
    if (name === 'system://boot.ogg') {
      t.fail('unreachable path')
    }
  })
  mock.mockReturns(runtime.component.custodian, 'prepareNetwork', () => {
    t.fail('unreachable path')
  })
  runtime.init()
    .then(() => {
      t.strictEqual(runtime.hasBeenDisabled(), true)
      runtime.enableRuntimeFor('test')
      t.strictEqual(runtime.hasBeenDisabled(), false)

      runtime.deinit()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.deinit()
      t.end()
    })
})

test('should break in announcing if runtime disabled', t => {
  t.plan(4)
  rtHelper.loadBaseConfig()
  var runtime = getAppRuntime(initComponents)

  property.set('sys.firstboot.init', '0', 'persist')
  mock.mockPromise(runtime.component.dispatcher, 'delegate', null, false)
  mock.mockReturns(runtime, 'isStartupFlagExists', false)

  mock.mockPromise(runtime.component.light, 'ttsSound', (appId, name) => {
    t.strictEqual(appId, '@yoda')
    t.strictEqual(name, 'system://firstboot.ogg')
    runtime.disableRuntimeFor('test')
  })
  mock.mockPromise(runtime.component.light, 'play', (appId, name) => {
    if (name === 'system://boot.js') {
      t.fail('unreachable path')
    }
  })
  mock.mockPromise(runtime.component.light, 'appSound', (appId, name) => {
    if (name === 'system://boot.ogg') {
      t.fail('unreachable path')
    }
  })
  mock.mockReturns(runtime.component.custodian, 'prepareNetwork', () => {
    t.fail('unreachable path')
  })
  runtime.init()
    .then(() => {
      t.strictEqual(runtime.hasBeenDisabled(), true)
      runtime.enableRuntimeFor('test')
      t.strictEqual(runtime.hasBeenDisabled(), false)

      runtime.deinit()
      t.end()
    })
    .catch(err => {
      t.error(err)

      runtime.deinit()
      t.end()
    })
})
