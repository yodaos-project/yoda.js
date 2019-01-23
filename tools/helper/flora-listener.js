var flora = require('@yoda/flora')

var agent = new flora.Agent('unix:/var/run/flora.sock')

var typeNames = [ 'INSTANT', 'PERSIST' ]

function listen (name, msg, type) {
  var typeName = typeNames[type] || 'UNKNOWN_TYPE'
  console.log(`${typeName}[${name}] ` + msg.map(it => JSON.stringify(it)).join(', '))
}
process.argv.slice(2).forEach(key => {
  console.log(`Subscribing '${key}'...`)
  agent.subscribe(key, listen.bind(this, key))
})
agent.start()
