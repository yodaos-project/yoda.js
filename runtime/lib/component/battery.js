var logger = require('logger')('battery')

/** ordered by priority */
var lowPowerWaterMark = [ 8, 10, 20 ]

class Battery {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component

    this.batSupported = false
    this.memoInfo = null

    this.lastDangerousAnnounceTimeStamp = null
    this.dangerousState = 'normal'

    this.shouldAnnounceLowPower = false
  }

  init () {
    this.component.flora.subscribe('battery.info', this.handleFloraInfo.bind(this))
  }

  handleFloraInfo (caps) {
    if (this.runtime.hasBeenDisabled()) {
      logger.debug(`system disabled ${this.runtime.getDisabledReasons()}, ignoring battery events`)
      return
    }

    var msg = caps[0]
    var data
    try {
      data = JSON.parse(msg)
    } catch (err) {
      logger.error('Invalid data received from "battery.info".')
      return
    }
    if (!data.batSupported) {
      return
    }
    this.batSupported = true

    if (!data.batChargingOnline && data.batLevel <= 5) {
      return this.runtime.shutdown()
    }

    switch (true) {
      case data.batTemp >= 55:
        this.dangerousState = 'high'
        this.runtime.openUrl('yoda-skill://battery/temperature_light_55', { preemptive: false })
        break
      case data.batTemp <= 0:
        this.dangerousState = 'low'
        this.runtime.openUrl('yoda-skill://battery/temperature_light_0', { preemptive: false })
        break
      default:
        this.dangerousState = 'normal'
    }

    if (this.memoInfo == null) {
      this.memoInfo = data
      return
    }

    var idle = this.component.lifetime.getCurrentAppId() == null

    for (var markIdx in lowPowerWaterMark) {
      var mark = lowPowerWaterMark[markIdx]
      if (this.memoInfo.batLevel > mark && data.batLevel <= mark) {
        this.shouldAnnounceLowPower = true
        logger.info(`low power level water mark ${mark} applied`)
        break
      }
    }

    if (this.memoInfo.batChargingOnline !== data.batChargingOnline) {
      if (data.batChargingOnline) {
        this.runtime.openUrl(`yoda-skill://battery/power_on?is_play=${!idle}`, { preemptive: idle })
      } else {
        this.runtime.openUrl(`yoda-skill://battery/power_off?is_play=${!idle}`, { preemptive: idle })
      }
    }
    this.memoInfo = data
  }

  getWormholeResponse () {
    if (!this.batSupported) {
      return { hasBattery: false }
    }
    return {
      isAcConnected: this.memoInfo.batChargingOnline,
      batteryTemperature: this.memoInfo.batTemp,
      percent: this.memoInfo.batLevel,
      hasBattery: true
    }
  }

  isCharging () {
    if (this.memoInfo == null) {
      return false
    }
    if (!this.batSupported) {
      return false
    }
    if (this.memoInfo.batChargingOnline) {
      return false
    }
  }

  getBatteryLevel () {
    if (this.memoInfo == null) {
      return 0
    }
    if (!this.batSupported) {
      return 0
    }
    if (typeof this.memoInfo.batLevel !== 'number') {
      return 0
    }
    return this.memoInfo.batLevel
  }

  // MARK: - Interceptions
  delegateWakeUpIfDangerousStatus () {
    if (this.memoInfo == null) {
      return false
    }
    if (!this.batSupported) {
      return false
    }
    if (this.dangerousState === 'normal') {
      return false
    }
    var now = Date.now()
    if (this.lastDangerousAnnounceTimeStamp && (now - this.lastDangerousAnnounceTimeStamp) < 10 * 60 * 1000) {
      logger.info(`announced in 10 minutes, skip wakeup delegation`)
      return false
    }
    this.component.turen.pickup(false)
    this.lastDangerousAnnounceTimeStamp = now

    var url
    switch (this.dangerousState) {
      case 'high':
        url = 'yoda-skill://battery/temperature_55'
        break
      case 'low':
        url = 'yoda-skill://battery/temperature_0'
        break
      default:
        return false
    }
    return this.runtime.openUrl(url)
      .then(() => true)
  }

  delegateWakeUpIfBatteryInsufficient () {
    if (this.memoInfo == null) {
      return false
    }
    if (!this.batSupported) {
      return false
    }
    if (!this.shouldAnnounceLowPower) {
      return false
    }
    if (this.memoInfo.batChargingOnline) {
      logger.info(`battery is charging, skip wakeup delegation`)
      return false
    }
    this.component.turen.pickup(false)
    this.shouldAnnounceLowPower = false
    var idle = this.component.lifetime.getCurrentAppId() == null

    for (var markIdx in lowPowerWaterMark) {
      var mark = lowPowerWaterMark[markIdx]
      if (this.memoInfo.batLevel <= mark) {
        return this.runtime.openUrl(`yoda-skill://battery/low_power_${mark}?is_play=${!idle}`)
          .then(() => true)
      }
    }
  }
  // MARK: - END Interceptions
}

module.exports = Battery
