var flora = require('@yoda/flora')

var channel = process.argv[2]
var args = process.argv[3]

console.log(`sending message to channel(${channel}) with body(${args})...`)

function main () {
  var cli = new flora.Agent(`unix:/var/run/flora.sock#testAgent`)
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
