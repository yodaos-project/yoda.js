/**
 * @typedef NowPlayingInfo
 * @property {string} appId
 * @property {string} title
 * @property {string} artist
 * @property {} playbackState
 * @property {number} playbackDuration
 * @property {number} playbackElapsedTime
 * @property {number} playbackRate
 */

class MediaController {
  constructor (runtime) {
    this.runtime = runtime
    this.descriptor = runtime.descriptor

    /** @type {NowPlayingInfo} */
    this.nowPlayingInfo = null
  }

  appDidExit (appId) {
    if (this.nowPlayingInfo == null) {
      return
    }
    if (this.nowPlayingInfo.appId !== appId) {
      return
    }
    this.nowPlayingInfo = null
  }

  setNowPlayingInfo (appId, info) {
    if (info == null) {
      if (this.nowPlayingInfo != null && this.nowPlayingInfo.appId === appId) {
        this.nowPlayingInfo = null
      }
      return
    }
    info.appId = appId
    this.nowPlayingInfo = info
    return this.nowPlayingInfo
  }

  dispatchCommand (command, extra) {
    if (this.nowPlayingInfo == null) {
      return false
    }
    var appId = this.nowPlayingInfo.appId
    this.descriptor.mediaController.emitToApp(appId, 'command', [
      Object.assign({}, extra, {
        type: command
      })
    ])
    return true
  }
}

module.exports = MediaController
