var logger = require('logger')('sound')
var AudioManager = require('@yoda/audio').AudioManager

module.exports = Sound
/**
 * Convenience methods to configures speaker easily in runtime.
 * @param {AppRuntime} runtime
 */
function Sound (runtime) {
  this.runtime = runtime
  this.manager = AudioManager

  this.defaultVolume = 30
}

/**
 * Initialize system volume.
 */
Sound.prototype.initVolume = function initVolume () {
  var vol = this.getUserLandVolume()
  logger.info(`init speaker volume to ${vol}`)
  this.manager.setVolume(vol)
  if (this.isMuted()) {
    this.unmute()
  }
}

/**
 * Get user land speaker channel volume.
 */
Sound.prototype.getUserLandVolume = function getUserLandVolume () {
  /** FIXME: only volume on channel STREAM_TTS could be fetched right now */
  return Math.floor(this.manager.getVolume(AudioManager.STREAM_TTS))
}

/**
 * Set volume. If speaker is muted, unmute on natural number volume.
 *
 * @param {number} volume
 */
Sound.prototype.setVolume = function setVolume (volume) {
  if (volume <= 0) {
    this.manager.setMute(true)
  }

  if (this.isMuted() && volume > 0) {
    this.manager.setMute(false)
  }
  this.manager.setVolume(volume)
}

/**
 * Get volume
 */
Sound.prototype.getVolume = function getVolume () {
  return this.manager.getVolume()
}

/**
 * Unmute speaker.
 */
Sound.prototype.unmute = function unmute () {
  logger.info('unmute speaker')
  this.manager.setVolume(this.defaultVolume)
  this.manager.setMute(false)
}

/**
 * Unmute speaker volume if it's muted and given skillId is not
 * volume app (which depends on state of speaker).
 */
Sound.prototype.unmuteIfNecessary = function unmuteIfNecessary (skillId) {
  if (this.isMuted() && !this.isVolumeApp(skillId)) {
    this.unmute()
  }
}

/**
 * Determines if speaker is muted.
 */
Sound.prototype.isMuted = function isMuted () {
  return this.manager.isMuted() || this.getUserLandVolume() <= 0
}

/**
 * Determines if given skillId is related to system volume app.
 */
Sound.prototype.isVolumeApp = function isVolumeApp (skillId) {
  return skillId === '7D0F5E5D57CD496B940654D7C8963AE0'
}
