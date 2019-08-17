var test = require('tape')
var mock = require('../../../helper/mock')
var FloraExporter = require('@yoda/endoscope/exporter/flora')

test('should export records', t => {
  t.plan(2)
  var exporter = new FloraExporter('yodaos.endoscope.export')
  mock.mockReturns(exporter.agent, 'post', (name, msg) => {
    t.strictEqual(name, 'yodaos.endoscope.export')
    t.deepEqual(msg, ['foo_metric', [['method', 'POST'], ['url', '/path']], 1])
  })
  exporter.export({ name: 'foo_metric', labels: { method: 'POST', url: '/path' }, value: 1 })

  exporter.agent.close()
  t.end()
})

test('should export records with null labels', t => {
  t.plan(2)
  var exporter = new FloraExporter('yodaos.endoscope.export')
  mock.mockReturns(exporter.agent, 'post', (name, msg) => {
    t.strictEqual(name, 'yodaos.endoscope.export')
    t.deepEqual(msg, ['foo_metric', [], 1])
  })
  exporter.export({ name: 'foo_metric', labels: null, value: 1 })

  exporter.agent.close()
  t.end()
})
