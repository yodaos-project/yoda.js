'use strict'

var endoscope = require('@yoda/endoscope')

var eventMetric = new endoscope.Counter('yodaos:benchmark:test_counter', {
  labels: [
    'id',
    'url'
  ]
})

function main () {
  var start = process.hrtime()
  for (var i = 0; i < 10000; i++) {
    eventMetric.inc({ id: '1234', url: 'yoda-app://example' })
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
