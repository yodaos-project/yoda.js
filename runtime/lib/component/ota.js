var promisify = require('util').promisify

var logger = require('logger')('comp-ota')

var ota = require('@yoda/ota')
var getInfoIfFirstUpgradedBootAsync = promisify(ota.getInfoIfFirstUpgradedBoot)
var getInfoOfPendingUpgradeAsync = promisify(ota.getInfoOfPendingUpgrade)

class OTA {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component
    this.forceUpdateAvailable = false
  }

  /**
   * Starts a force update on voice coming etc.
   */
  startForceUpdate (info) {
    /**
     * Skip upcoming voice, announce available force update and start ota.
     */
    logger.info('pending force update, delegates activity to @ota.')
    return Promise.all([
      /**
       * prevent force update from being interrupted.
       */
      this.runtime.setMicMute(true, { silent: true }),
      this.runtime.setPickup(false)
    ]).then(() =>
      this.runtime.openUrl(`yoda-skill://ota/force_upgrade?image_path=${encodeURIComponent(info.imagePath)}`)
    ).then(() => this.runtime.startMonologue('@yoda/ota'))
  }

  // MARK: - Interceptions
  turenDidWakeUp () {
    if (!this.forceUpdateAvailable) {
      return false
    }
    if (this.component.lifetime.isMonopolized()) {
      logger.info('lifetime is been monopolized, skip ota on woken up.')
      return false
    }
    var nowHour = new Date().getHours()
    if (nowHour >= 22/** 22pm */ || nowHour <= 7 /** 7am */) {
      return Promise.resolve(false)
    }
    this.forceUpdateAvailable = false

    return getInfoOfPendingUpgradeAsync()
      .then(upgradeInfo => {
        if (upgradeInfo == null) {
          return false
        }
        logger.info('got pending update info', upgradeInfo)
        return ota.condition.getAvailabilityOfOta(upgradeInfo)
          .then(availability => {
            switch (availability) {
              case true:
                return this.startForceUpdate(upgradeInfo)
                  .then(() => true)
              case 'low_power':
              case 'extremely_low_power':
                this.forceUpdateAvailable = true
                return false
              case 'new_version':
                return false
            }
          })
      })
  }

  runtimeDidLogin () {
    return getInfoIfFirstUpgradedBootAsync()
      .then(info => {
        logger.info('got upgrade ota info', info)
        if (!info) {
          return false
        }
        this.runtime.openUrl(`yoda-skill://ota/on_first_boot_after_upgrade?changelog=${encodeURIComponent(info.changelog)}`)
        return true
      }, err => {
        logger.error('get upgrade info on first upgrade boot failed', err.stack)
        return false
      })
  }
  // MARK: - END Interceptions
}

module.exports = OTA
