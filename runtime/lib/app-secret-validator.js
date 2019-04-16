var flora = require('@yoda/flora')
var LRU = require('lru-cache')

class AppSecretValidator {
  constructor (max, agent) {
    this.cache = new LRU(max || 10)
    this.lruList = []
    this.max = max
    if (agent == null) {
      agent = new flora.Agent('unix:/var/run/flora.sock')
      // TODO: unref agent
      agent.start()
    }
    this.agent = agent
  }

  decrypt (secret) {
    var appId = this.cache.get(secret)
    if (appId != null) {
      return Promise.resolve(appId)
    }
    return this.agent.call('yodart.verify-and-decrypt-app-secret', [ secret ], 'vui', 1000)
      .then(resp => {
        if (resp.retCode === 1) {
          this.cache.set(secret, false)
          return false
        }
        if (resp.msg && resp.msg[0]) {
          var appId = resp.msg[0]
          this.cache.set(secret, appId)
          return appId
        }
        throw new Error('Unable to resolve secret')
      })
  }
}

module.exports = AppSecretValidator
