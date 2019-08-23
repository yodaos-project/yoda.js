var test = require('tape')
var bootstrap = require('../bootstrap')
var endoscope = require('@yoda/endoscope')
var Metric = require('@yoda/endoscope/metric/_metric')

test('should record with null labels', t => {
  t.plan(3)
  var exporter = bootstrap.exporter((it) => {
    t.strictEqual(it.name, 'example_metric')
    t.deepEqual(it.labels, {})
    t.strictEqual(it.value, 1)
  })
  endoscope.addExporter(exporter)
  var metric = new Metric('example_metric', { labels: [ 'method', 'url' ] })
  metric._record(null, 1)
  endoscope.removeExporter(exporter)
  t.end()
})

test('should record with null extras', t => {
  t.plan(3)
  var exporter = bootstrap.exporter((it) => {
    t.strictEqual(it.name, 'example_metric')
    t.deepEqual(it.labels, {})
    t.strictEqual(it.value, 1)
  })
  endoscope.addExporter(exporter)
  var metric = new Metric('example_metric', { labels: [ 'method', 'url' ] })
  metric._record(null, 1, null)
  endoscope.removeExporter(exporter)
  t.end()
})

test('should pick non-enumerable labels', t => {
  t.plan(3)
  var exporter = bootstrap.exporter((it) => {
    t.strictEqual(it.name, 'example_metric')
    t.deepEqual(it.labels, { method: 'POST', url: '/path' })
    t.strictEqual(it.value, 1)
  })
  endoscope.addExporter(exporter)
  var metric = new Metric('example_metric', { labels: [ 'method', 'url' ] })
  var labels = { url: '/path', foo: 'bar' }
  Object.defineProperties(labels, {
    method: {
      enumerable: false,
      value: 'POST'
    }
  })
  metric._record(labels, 1)
  endoscope.removeExporter(exporter)
  t.end()
})
