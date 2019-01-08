var logger = require('logger')('battery')

var battery = require('@yoda/battery')

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
    this.queryInterval = null

    this.shouldAnnounceLowPower = false
  }

  handleFloraInfo (msg) {
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

    switch (true) {
      case data.batTemp >= 55:
        this.dangerousState = 'high'
        this.setupBatteryTemperatureQueryInterval()
        break
      case data.batTemp <= 0:
        this.dangerousState = 'low'
        this.setupBatteryTemperatureQueryInterval()
        break
      default:
        this.dangerousState = 'normal'
        this.tearDownBatteryTemperatureQueryInterval()
    }

    if (this.memoInfo == null) {
      this.memoInfo = data
      return
    }

    var idle = this.component.lifetime.getCurrentAppId() == null

    for (var markIdx in lowPowerWaterMark) {
      var mark = lowPowerWaterMark[markIdx]
      if (this.memoInfo.batLevel > mark && data.batLevel <= mark) {
        this.shouldAnnounceLowPower = !idle /** announce next time if not idle */
        logger.info(`low power level water mark ${mark} applied, should announce on wake up? ${this.shouldAnnounceLowPower}`)
        this.runtime.openUrl(`yoda-skill://battery/low_power_${mark}?is_play=${!idle}`, { preemptive: idle })
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

  setupBatteryTemperatureQueryInterval () {
    if (this.queryInterval) {
      return
    }
    this.queryInterval = setInterval(() => {
      if (this.dangerousState === 'normal') {
        clearInterval(this.queryInterval)
        return
      }

      battery.getBatteryInfo()
        .then(data => {
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
              break
          }
        })
    }, 30 * 1000)
  }

  tearDownBatteryTemperatureQueryInterval () {
    clearInterval(this.queryInterval)
    this.queryInterval = null
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
      return false
    }
    this.component.turen.pickup(false)
    this.shouldAnnounceLowPower = false

    for (var markIdx in lowPowerWaterMark) {
      var mark = lowPowerWaterMark[markIdx]
      if (this.memoInfo.batLevel <= mark) {
        return this.runtime.openUrl(`yoda-skill://battery/low_power_${mark}`)
          .then(() => true)
      }
    }
  }
  // MARK: - END Interceptions
}

module.exports = Battery
