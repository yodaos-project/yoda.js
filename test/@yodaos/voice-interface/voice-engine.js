var flora = require('@yoda/flora')

var ENGINE_PICKUP_CHANNEL = 'yodaos.voice-interface.engine.pickup'
var ENGINE_MUTED_CHANNEL = 'yodaos.voice-interface.engine.muted'
var ENGINE_VIGILANCE_CHANNEL = 'yodaos.voice-interface.engine.vigilance'

module.exports.setup = setup
module.exports.teardown = teardown

var agent
function setup () {
  agent = new flora.Agent('unix:/var/run/flora.sock#launcher')

  var isPickup = false
  var isMuted = false
  var isVigilant = false
  agent.declareMethod(ENGINE_PICKUP_CHANNEL, (reqMsg, res) => {
    console.debug(`Received ${ENGINE_PICKUP_CHANNEL} call`, reqMsg)
    if (reqMsg && reqMsg.length > 0) {
      isPickup = !!reqMsg[0]
    }
    return res.end(0, [isPickup ? 1 : 0])
  })
  agent.declareMethod(ENGINE_MUTED_CHANNEL, (reqMsg, res) => {
    console.debug(`Received ${ENGINE_MUTED_CHANNEL} call`, reqMsg)
    if (reqMsg && reqMsg.length > 0) {
      isMuted = !!reqMsg[0]
    }
    return res.end(0, [isMuted ? 1 : 0])
  })
  agent.declareMethod(ENGINE_VIGILANCE_CHANNEL, (reqMsg, res) => {
    console.debug(`Received ${ENGINE_VIGILANCE_CHANNEL} call`, reqMsg)
    if (reqMsg && reqMsg.length > 0) {
      isVigilant = !!reqMsg[0]
    }
    return res.end(0, [isVigilant ? 1 : 0])
  })
  agent.start()
}

function teardown () {
  agent && agent.close()
}
