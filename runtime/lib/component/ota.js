var logger = require('logger')('comp-ota')

var ota = require('@yoda/ota')

class OTA {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component
    this.forceUpdateAvailable = false
  }

  /**
   * Starts a force update on voice coming etc.
   */
  startForceUpdate () {
    /**
     * Skip upcoming voice, announce available force update and start ota.
     */
    logger.info('pending force update, delegates activity to @ota.')
    ota.getInfoOfPendingUpgrade((err, info) => {
      if (err || info == null) {
        logger.error('failed to fetch pending update info, skip force updates', err && err.stack)
        return
      }
      logger.info('got pending update info', info)
      Promise.all([
        /**
         * prevent force update from being interrupted.
         */
        this.runtime.setMicMute(true, { silent: true }),
        this.runtime.setPickup(false)
      ]).then(() =>
        this.runtime.openUrl(`yoda-skill://ota/force_upgrade?changelog=${encodeURIComponent(info.changelog)}`)
      ).then(() => this.runtime.startMonologue('@yoda/ota'))
    })
  }

  // MARK: - Interceptions
  turenDidWakeUp () {
    if (!this.forceUpdateAvailable) {
      return false
    }
    this.startForceUpdate()
    return true
  }
  // MARK: - END Interceptions
}

module.exports = OTA
