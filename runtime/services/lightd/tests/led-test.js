var light = require('@yoda/light')

var handle
var l = 0
handle = setInterval(() => {
  light.fill(l, l, l)
  light.write()
  console.log(l)
  l = l + 5
  if (l >= 256) {
    clearInterval(handle)
  }
}, 15)
