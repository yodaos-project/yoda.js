var flora = require('@yoda/flora')

var uri = 'unix:/var/run/flora.sock#testAgent'
var channel
var args

var cliArgs = process.argv.slice(2)
while (cliArgs.length > 0) {
  var $1 = cliArgs.shift()
  switch ($1) {
    case '-u':
    case '--uri':
      uri = cliArgs.shift()
      break
    default:
      if (channel == null) {
        channel = $1
      } else if (args == null) {
        args = $1
      }
  }
}

console.log(`sending message to channel(${channel}) with body(${args})...`)

function main () {
  var cli = new flora.Agent(uri)
  cli.start()

  var msg = []
  if (args) {
    args = JSON.parse(args)
    if (!Array.isArray(args)) {
      throw new Error('args is not an array')
    }
    msg = args
  }

  cli.post(channel, msg)

  cli.close()
}

main()
