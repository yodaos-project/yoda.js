var test = require('tape')
var bootstrap = require('../bootstrap')
var endoscope = require('@yoda/endoscope')

test('should record enum', t => {
  t.plan(3)
  var exporter = bootstrap.exporter((it) => {
    t.strictEqual(it.name, 'example_metric_state')
    t.deepEqual(it.labels, { method: 'POST', url: '/path', state: 'start' })
    t.strictEqual(it.value, 1)
  })
  endoscope.addExporter(exporter)
  var metric = new endoscope.Enum('example_metric_state', { labels: [ 'method', 'url' ], states: [ 'start', 'end' ] })
  metric.state({ method: 'POST', url: '/path', foo: 'bar' }, 'start')
  endoscope.removeExporter(exporter)
  t.end()
})

test('should pick non-enumerable labels', t => {
  t.plan(3)
  var exporter = bootstrap.exporter((it) => {
    t.strictEqual(it.name, 'example_metric_state')
    t.deepEqual(it.labels, { method: 'POST', url: '/path', state: 'start' })
    t.strictEqual(it.value, 1)
  })
  endoscope.addExporter(exporter)
  var metric = new endoscope.Enum('example_metric_state', { labels: [ 'method', 'url' ], states: [ 'start', 'end' ] })
  var labels = { url: '/path', foo: 'bar' }
  Object.defineProperties(labels, {
    method: {
      enumerable: false,
      value: 'POST'
    }
  })
  metric.state(labels, 'start')
  endoscope.removeExporter(exporter)
  t.end()
})
