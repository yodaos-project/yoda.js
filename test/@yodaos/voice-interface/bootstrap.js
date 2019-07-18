var flora = require('@yoda/flora')
var mock = require('./voice-engine')
var VoiceEngine = require('@yodaos/voice-interface').VoiceEngine

module.exports = function bootstrap () {
  var agent = new flora.Agent('unix:/var/run/flora.sock')
  agent.start()
  var voiceEngine = new VoiceEngine(agent)
  mock.setup()
  return voiceEngine
}

module.exports.teardown = function teardown (voiceEngine) {
  voiceEngine.agent.close()
  mock.teardown()
}
