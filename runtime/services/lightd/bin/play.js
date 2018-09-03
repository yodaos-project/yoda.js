var lightMethod = require('../tests/lightMethod')

var args = Array.prototype.slice.call(process.argv, 2)

var help = `
  Usage: iotjs play.js $name [$key=$value]...

  Example: iotjs play.js loading

      this will play /opt/light/loading.js

  $name - the file name of light's effect to play
  $key=$value - Key-value pairs will converted into objects
`

if (args.length <= 0) {
  console.log(help)
  process.exit(0)
}

var data = {}

args.slice(1).forEach(element => {
  var kv = element.split('=')
  data[kv[0]] = kv[1]
})

var lightPath = '/opt/light/' + args[0] + '.js'

console.log('play: ' + lightPath, data)

lightMethod('play', ['@lightCommand', lightPath, JSON.stringify(data)])
  .then((res) => {
    console.log('response: ', res)
    process.exit(0)
  })
  .catch((error) => {
    console.log('error: ', error)
    process.exit(0)
  })
