var test = require('tape')
var bootstrap = require('../bootstrap')
var endoscope = require('@yoda/endoscope')

test('should record counter', t => {
  t.plan(4)
  var exporter = bootstrap.exporter((it) => {
    t.strictEqual(it.name, 'example_metric_counter')
    t.deepEqual(it.labels, { method: 'POST', url: '/path' })
    t.strictEqual(it.value, 1)
  })
  endoscope.addExporter(exporter)
  var metric = new endoscope.Counter('example_metric_counter', { labels: [ 'method', 'url' ] })
  t.deepEqual(metric.labels, ['method', 'url'])
  metric.inc({ method: 'POST', url: '/path' })
  endoscope.removeExporter(exporter)
  t.end()
})

test('should init metrics with labels array', t => {
  t.plan(4)
  var exporter = bootstrap.exporter((it) => {
    t.strictEqual(it.name, 'example_metric_counter')
    t.deepEqual(it.labels, { method: 'POST', url: '/path' })
    t.strictEqual(it.value, 1)
  })
  endoscope.addExporter(exporter)
  var metric = new endoscope.Counter('example_metric_counter', [ 'method', 'url' ])
  t.deepEqual(metric.labels, ['method', 'url'])
  metric.inc({ method: 'POST', url: '/path', foo: 'bar' })
  endoscope.removeExporter(exporter)
  t.end()
})
