var test = require('tape')
var bootstrap = require('../bootstrap')
var endoscope = require('@yoda/endoscope')

test('should record histogram', t => {
  t.plan(3)
  var exporter = bootstrap.exporter((it) => {
    t.strictEqual(it.name, 'example_metric_histogram')
    t.deepEqual(it.labels, { method: 'POST', url: '/path' })
    t.strictEqual(typeof it.value, 'number')
  })
  endoscope.addExporter(exporter)
  var metric = new endoscope.Histogram('example_metric_histogram', { labels: [ 'method', 'url' ] })
  var slice = metric.start({ method: 'POST', url: '/path', foo: 'bar' })
  metric.end(slice)
  endoscope.removeExporter(exporter)
  t.end()
})
