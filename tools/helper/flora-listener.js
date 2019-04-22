var flora = require('@yoda/flora')

var uri = 'unix:/var/run/flora.sock'
var names = []

var cliArgs = process.argv.slice(2)
while (cliArgs.length > 0) {
  var $1 = cliArgs.shift()
  switch ($1) {
    case '-u':
    case '--uri':
      uri = cliArgs.shift()
      break
    default:
      if ($1) {
        names.push($1)
      }
  }
}

var agent = new flora.Agent(uri)

var typeNames = [ 'INSTANT', 'PERSIST' ]

function listen (name, msg, type) {
  var typeName = typeNames[type] || 'UNKNOWN_TYPE'
  console.log(`[${new Date().toISOString()}] ${typeName}[${name}] ` + msg.map(it => JSON.stringify(it)).join(', '))
}
names.forEach(key => {
  console.log(`Subscribing '${key}'...`)
  agent.subscribe(key, listen.bind(this, key))
})
agent.start()
