var inherits = require('util').inherits

var AppRuntime = require('/usr/lib/yoda/runtime/lib/app-runtime')

module.exports = MockAppRuntime

function MockAppRuntime () {
  AppRuntime.call(this)
  this.nextTickTrigger = setInterval(() => {}, 10)

  this.ttsId = 1
}
inherits(MockAppRuntime, AppRuntime)

/**
 *
 * @param {string[]} paths - app root paths (not **apps root** path)
 */
MockAppRuntime.prototype.init = function init (paths) {
  if (!Array.isArray(paths)) {
    throw new TypeError('Expect an array on first argument of MockAppRuntime#init.')
  }
  return Promise.all(paths.map(it => this.loader.loadApp(it)))
}

MockAppRuntime.prototype.ttsMethod = function (name, args) {
  switch (name) {
    case 'speak': {
      var ttsId = this.ttsId
      this.ttsId += 1
      setTimeout(() => {
        this.dbusSignalRegistry.emit(`callback:tts:${ttsId}`, 'end')
      }, 2000)
      return Promise.resolve([ ttsId ])
    }
    default: {
      return Promise.reject(new Error('TTS Method not mocked'))
    }
  }
}

MockAppRuntime.prototype.destruct = function destruct () {
  clearInterval(this.nextTickTrigger)
}
