var test = require('tape')
var math = require('@yoda/util').math

test('random: each random number should lay in [0, 1)', t => {
  var r = math.random()
  t.equal(r >= 0 && r < 1, true)
  t.end()
})

test('random: average of 1000 random number should lay in (0.45~0.55)', t => {
  var sum = 0
  for (var i = 0; i < 1000; i++) {
    sum += math.random()
  }
  var average = sum / 1000
  t.equal(average > 0.45 && average < 0.55, true)
  t.end()
})

test('randInt: each random number should lay in [0, n)', t => {
  var n = 123
  var r = math.randInt(n)
  t.equal(r >= 0 && r < n, true)
  t.end()
})

test('randInt: average of 1000 random number should lay in (0.45~0.55) * n', t => {
  var n = 123
  var sum = 0
  for (var i = 0; i < 1000; i++) {
    sum += math.randInt(n)
  }
  var average = sum / 1000
  t.equal(average > 0.45 * n && average < 0.55 * n, true)
  t.end()
})

test('randBool: count 1000 random boolean, the rate of true/false should lay in (0.8~1.2)', t => {
  var sumTrue = 0
  for (var i = 0; i < 1000; i++) {
    if (math.randBool()) {
      sumTrue++
    }
  }
  var rate = sumTrue / 1000
  t.equal(rate > 0.45 && rate < 0.55, true)
  t.end()
})
