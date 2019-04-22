var flora = require('@yoda/flora')

var uri = 'unix:/var/run/flora.sock#testAgent'
var target = ''
var name
var args

var cliArgs = process.argv.slice(2)
while (cliArgs.length > 0) {
  var $1 = cliArgs.shift()
  switch ($1) {
    case '-u':
    case '--uri':
      uri = cliArgs.shift()
      break
    case '-t':
    case '--target':
      target = cliArgs.shift()
      break
    default:
      if (name == null) {
        name = $1
      } else if (args == null) {
        args = $1
      }
  }
}

console.log(`invoking remote method(${name}) with body(${args})...`)

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
