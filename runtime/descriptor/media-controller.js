'use strict'
/**
 * @namespace yodaRT.activity
 */

var _ = require('@yoda/util')._
var Descriptor = require('../lib/descriptor')

var InfoKeys = [
  'title',
  'artist',
  'playbackDuration',
  'playbackElapsedTime',
  'playbackRate'
]

var CommandTypes = [
  'togglePausePlay',
  'play',
  'pause'
]

/**
 * @memberof yodaRT.activity.Activity
 * @class MediaControllerClient
 * @hideconstructor
 * @extends EventEmitter
 */
class MediaControllerDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'mediaController')
  }

  setNowPlayingInfo (ctx) {
    var appId = ctx.appId
    var info = ctx.args[0]
    return this.component.mediaController.setNowPlayingInfo(appId, _.pick(info, InfoKeys))
  }

  dispatchCommand (ctx) {
    var command = ctx.args[0]
    var extra = ctx.args[1]
    if (CommandTypes.indexOf(command) < 0) {
      throw new Error(`Unsupported command '${command}'`)
    }
    return this.component.mediaController.dispatchCommand(command, extra)
  }
}

MediaControllerDescriptor.events = {
  command: {
    type: 'event'
  }
}

MediaControllerDescriptor.methods = {
  /**
   * set now playing info
   * @memberof yodaRT.activity.Activity.MediaControllerClient
   * @instance
   * @function setNowPlayingInfo
   * @param {object} [info] - the now playing info.
   * @param {string} [info.title] - now playing title
   * @param {string} [info.artist] - now playing artist
   * @param {number} [info.playbackDuration] - Playback duration in milliseconds
   * @param {number} [info.playbackElapsedTime] - Playback elapsed time in milliseconds
   * @param {number} [info.playbackRate] - Playback speed rate, `1` for normal speed.
   * @returns {Promise<void>}
   */
  setNowPlayingInfo: {
    returns: 'promise'
  },
  /**
   * set now playing info
   * @memberof yodaRT.activity.Activity.MediaControllerClient
   * @instance
   * @function setNowPlayingInfo
   * @param {object} [info] - the now playing info.
   * @param {string} [info.title] - now playing title
   * @param {string} [info.artist] - now playing artist
   * @param {number} [info.playbackDuration] - Playback duration in milliseconds
   * @param {number} [info.playbackElapsedTime] - Playback elapsed time in milliseconds
   * @param {number} [info.playbackRate] - Playback speed rate, `1` for normal speed.
   * @returns {Promise<void>}
   */
  dispatchCommand: {
    returns: 'promise'
  }
}

module.exports = MediaControllerDescriptor
