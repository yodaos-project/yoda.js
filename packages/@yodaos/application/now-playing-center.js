var EventEmitter = require('events')
var symbol = require('./symbol')

class NowPlayingCenter extends EventEmitter {
  /**
   *
   * @private
   * @param {*} api
   */
  constructor (api) {
    super()
    this[symbol.api] = api
    this.info = null
    this._onCommand = (command) => {
      this.emit('command', command)
    }
  }

  /**
   * Get current app now playing info.
   */
  getNowPlayingInfo () {
    return this.info
  }

  /**
   * Set current app now playing info. `null` if unset.
   * @param {object|null} info
   */
  setNowPlayingInfo (info) {
    if (info == null) {
      this[symbol.api].removeListener('command', this._onCommand)
    } else {
      this[symbol.api].on('command', this._onCommand)
    }
    this[symbol.api].setNowPlayingInfo(info)
    return this.info
  }
}

NowPlayingCenter.CommandType = {
  TOGGLE_PAUSE_PLAY: 'togglePausePlay',
  PLAY: 'play',
  PAUSE: 'pause'
}

module.exports = NowPlayingCenter
var nowPlayingCenter
Object.defineProperty(module.exports, 'default', {
  enumerable: true,
  configurable: true,
  get: () => {
    if (nowPlayingCenter == null) {
      var api = global[Symbol.for('yoda#api')].mediaController
      nowPlayingCenter = new NowPlayingCenter(api)
    }
    return nowPlayingCenter
  }
})
