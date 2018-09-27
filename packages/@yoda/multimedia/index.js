'use strict'

/**
 * The multimedia includes `MediaPlayer` and `Sounder`. mediaplayer support for playing
 * variety of common media types, so that you can easily integrate audio into your applications.
 * `Sounder` is a simple player, support for playing wav type, for faster playback.
 * @module @yoda/multimedia
 */

module.exports = {
  MediaPlayer: require('./mediaplayer'),
  Sounder: require('./sounder')
}
