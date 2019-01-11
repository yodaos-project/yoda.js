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
    var nowHour = new Date().getHours()
    if (nowHour >= 22/** 22pm */ || nowHour <= 7 /** 7am */) {
      return Promise.resolve(false)
    }
    // TODO: move to ota.conditions
    if (this.component.battery.batSupported) {
      if (!this.component.battery.isCharging()) {
        if (this.component.battery.getBatteryLevel() < 50) {
          return false
        }
      }
    }
    this.forceUpdateAvailable = false

    return getInfoOfPendingUpgradeAsync()
      .then(upgradeInfo => {
        if (upgradeInfo == null) {
          return false
        }
        logger.info('got pending update info', upgradeInfo)
        return ota.conditions.getAvailabilityOfOta(upgradeInfo)
          .then(available => {
            if (!available) {
              return false
            }
            return this.startForceUpdate(upgradeInfo)
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
        this.openUrl(`yoda-skill://ota/on_first_boot_after_upgrade?changelog=${encodeURIComponent(info.changelog)}`)
        return true
      }, err => {
        logger.error('get upgrade info on first upgrade boot failed', err.stack)
        return false
      })
  }
  // MARK: - END Interceptions
}

module.exports = OTA
