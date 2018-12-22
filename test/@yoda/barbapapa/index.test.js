var test = require('tape')
var Barbapapa = require('@yoda/barbapapa')

test('should resolve dependencies', t => {
  t.plan(3)
  class Foo {

  }
  Foo.dependencies = [ 'bar' ]

  class Bar {

  }

  var barbapapa = new Barbapapa()
  barbapapa.register('bar', Bar)
  t.notLooseEqual(barbapapa.resolve('bar'), null, 'bar shall be instantiated')
  barbapapa.register('foo', Foo, Foo.dependencies)
  t.notLooseEqual(barbapapa.resolve('foo'), null, 'foo shall be instantiated')
  t.notLooseEqual(barbapapa.resolve('foo').bar, null, 'bar shall be injected into foo')
})
