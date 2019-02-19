var flora = require('@yoda/flora')

var name = process.argv[2]
var target = process.argv[3]
var args = process.argv[4]

console.log(`invoking remote method(${name}) with body(${args})...`)

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

  var startedOn = Date.now()
  cli.call(name, msg, target)
    .then(reply => {
      var duration = Date.now() - startedOn
      console.log(`invokation completed after ${duration}ms.`)
      console.log(reply)
      cli.close()
    })
    .catch(err => {
      console.error('unexpected error on invoking', err)
      cli.close()
    })
}

main()
