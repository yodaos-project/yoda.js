var flora = require('@yoda/flora')

module.exports.once = once
function once (name, options) {
  if (options == null) {
    options = {}
  }
  var url = options.url || `unix:/var/run/flora.sock#disposable_for_${name}`
  var timeout = options.timeout || 15000
  var agent = new flora.Agent(url)
  return new Promise((resolve, reject) => {
    var timer = setTimeout(() => {
      agent.close()
      reject(new Error(`flora.once timeount for ${timeout}`))
    }, timeout)
    agent.subscribe(name, msg => {
      clearTimeout(timer)
      agent.close()
      resolve(msg)
    })
    agent.start()
  })
}
