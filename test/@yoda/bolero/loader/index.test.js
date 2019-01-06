var test = require('tape')
var path = require('path')
var Component = require('@yoda/bolero/base-class')
var Loader = require('@yoda/bolero/loader')

test('should loads classes', t => {
  t.plan(3)

  var runtime = {}
  class Foo extends Component {
    constructor (arg) {
      t.strictEqual(runtime, arg)
      super(arg)
    }

    hello () {
      return 'hello'
    }
  }

  class Bar extends Component {
    constructor (arg) {
      t.strictEqual(runtime, arg)
      super(arg)
    }

    hello () {
      return this.component.foo.hello()
    }
  }

  var loader = new Loader(runtime, 'component')
  loader.register('foo', Foo)
  loader.register('bar', Bar)
  t.strictEqual(runtime.component.bar.hello(), 'hello')
})

test('should load path', t => {
  t.plan(1)
  var runtime = {}
  var loader = new Loader(runtime, 'component')
  loader.load(path.join(__dirname, 'fixture'))
  t.strictEqual(runtime.component.bar.hello(), 'foobar')
})

test('should skip path if not exist', t => {
  t.plan(1)
  var runtime = {}
  var loader = new Loader(runtime, 'component')
  loader.load(path.join(__dirname, 'does-not-exist'))
  t.pass()
})
