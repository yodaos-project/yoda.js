'use strict'

var endoscope = require('@yoda/endoscope')

var eventMetric = new endoscope.Enum('yodaos:benchmark:test_event', {
  labels: [
    'id',
    'url'
  ],
  states: [
    '0',
    '1',
    '2',
    '3',
    '4'
  ]
})

function main () {
  var start = process.hrtime()
  for (var i = 0; i < 10000; i++) {
    eventMetric.state({ id: '1234', url: 'yoda-app://example' }, String(i % 5))
  }

  var end = process.hrtime()
  var secs = end[0] - start[0]
  var nanosecs = end[1] - start[1]
  if (nanosecs < 0) {
    --secs
    nanosecs += 1 * Math.pow(10, 9)
  }
  console.log('takes', secs, 'secs', nanosecs / Math.pow(10, 6), 'millisecs')
  console.log('op avg', (secs * Math.pow(10, 3) + nanosecs / Math.pow(10, 6)) / 10000, 'millisecs')
}

main()
