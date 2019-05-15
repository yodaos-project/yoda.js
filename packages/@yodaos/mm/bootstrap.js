var Url = require('url')
var EventEmitter = require('events')

var _ = require('@yoda/util')._
var symbol = require('@yodaos/application/symbol')
var AudioFocus = require('@yodaos/application/audio-focus')
var classLoader = require('@yodaos/application/class-loader')
var speechSynthesis = require('@yodaos/speech-synthesis').speechSynthesis
var speechSymbol = require('@yodaos/speech-synthesis/symbol')

function bootstrap (api) {
  return new TestSuite(api)
}

class TestSuite {
  constructor (api) {
    this.api = api || global[symbol.api]

    this.audioFocus = new TSAudioFocus(this.api)
    this.speechSynthesis = new TSSpeechSynthesis(this.api)
  }

  getApplication () {
    return this.api[symbol.application]
  }

  getService (name) {
    return classLoader.getComponent(this.getApplication(), name, 'service')
  }

  openUrl (url) {
    var urlObj = Url.parse(url, true)
    var manifest = classLoader.getManifest(this.api)
    if (_.find(manifest.hosts, it => it[0] === urlObj.hostname) == null) {
      throw new Error(`Cannot open url with hostname '${urlObj.hostname}' in test`)
    }
    return this.api.emit('url', urlObj)
  }

  teardown () {
    this.audioFocus.unhook()
    this.speechSynthesis.stopRecord()
  }
}

class TSAudioFocus extends EventEmitter {
  constructor (api) {
    super()
    this.api = api || global[symbol.api]
    var registry = this.api.audioFocus[symbol.audioFocus.registry]
    if (registry == null) {
      registry = AudioFocus.setup(api.audioFocus)
    }
    registry[symbol.audioFocus.hook] = this.hook.bind(this)
  }

  hook () {
    this.emit.apply(this, arguments)
  }

  unhook () {
    delete this.api.audioFocus[symbol.audioFocus.registry][symbol.audioFocus.hook]
  }
}

class TSSpeechSynthesis extends EventEmitter {
  constructor () {
    super()
    this.records = []
    this.events = []
    this.hookBound = this.hook.bind(this)
  }

  startRecord () {
    if (speechSynthesis[speechSymbol.hook] && speechSynthesis[speechSymbol.hook] !== this.hookBound) {
      throw new Error('Another test was not torn down before TSSpeechSynthesis#startRecord')
    }
    speechSynthesis[speechSymbol.hook] = this.hookBound
  }

  stopRecord () {
    delete speechSynthesis[speechSymbol.hook]
  }

  getRecords () {
    return this.records
  }

  getEvents () {
    return this.events
  }

  clearRecords () {
    this.records = []
    this.events = []
  }

  hook (event, utter) {
    var utterFields = _.pick(utter, 'text')
    if (event === 'speak') {
      this.records.push(utterFields)
    }
    this.events.push(Object.assign({ type: event }, utterFields))
    this.emit(event, utter)
  }
}

module.exports = bootstrap
