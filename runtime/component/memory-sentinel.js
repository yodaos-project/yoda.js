var childProcess = require('child_process')
var promisify = require('util').promisify
var logger = require('logger')('memory-sentinel')
var config = require('../lib/config').getConfig('memory-sentinel.json')

var execAsync = promisify(childProcess.exec)

var MemoryWarningChannel = 'yodaos.memory-sentinel.low-memory-warning'

class MemorySentinel {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component
    this.appScheduler = runtime.component.appScheduler

    this.memTotal = -1
    this.backgroundAppHWM = Infinity
    this.keyAndVisibleAppHWM = Infinity
    this.warningDeviceLWM = -1
    this.fatalDeviceLWM = -1

    this.memMemo = null

    this.config = Object.assign({
      'enabled': true,

      'backgroundAppHighWaterMarkRatio': 1.0,
      'keyAndVisibleAppHighWaterMarkRatio': 1.0,
      'warningDeviceLowWaterMarkRatio': 1.0,
      'fatalDeviceLowWaterMarkRatio': 1.0,

      /** {High,Low}WaterMarks are preferred than {High,Low}WaterMarkRatio */
      'backgroundAppHighWaterMark': 0,
      'keyAndVisibleAppAppHighWaterMark': 0,
      'warningDeviceLowWaterMark': 0,
      'fatalDeviceLowWaterMark': 0,

      'patrolInterval': 5000
    }, config)
  }

  init () {
    if (!this.config.enabled) {
      return
    }
    this.component.broadcast.registerBroadcastChannel(MemoryWarningChannel)
    this.loadDeviceInfo()
    setInterval(() => {
      this.loadAppMemInfo()
        .then(() => this.compelHighWaterMark())
        .then(() => this.compelFreeAvailableMemory())
        .then(() => {
          this.memMemo = null
        })
    }, this.config.patrolInterval)
  }

  /**
   * Check app memory high water mark. Apps that is not key and visible app are
   * checked against `backgroundAppHighWaterMark`. The key and visible app is
   * checked against the `keyAndVisibleAppHighWaterMark`.
   */
  compelHighWaterMark () {
    var pids = Object.keys(this.memMemo)

    var step = (idx) => {
      if (idx >= pids.length) {
        return Promise.resolve()
      }
      var pid = pids[idx]
      var appId = this.appScheduler.pidAppIdMap[pid]
      if (appId == null) {
        /** app may have exited already */
        delete this.memMemo[pid]
        return step(idx + 1)
      }
      var isKeyAndVisible = this.component.visibility.getKeyAndVisibleAppId() === appId
      var mem = this.memMemo[pid]
      if (mem <= (isKeyAndVisible ? this.keyAndVisibleAppHWM : this.backgroundAppHWM)) {
        return step(idx + 1)
      }
      logger.warn(`app(${appId}:${pid}) memory reached ${isKeyAndVisible ? 'key and visible app' : 'background app'} high water mark, killing app...`)
      delete this.memMemo[pid]
      return this.appScheduler.suspendApp(appId, { force: true })
        .then(
          () => step(idx + 1),
          err => {
            logger.error(`Unexpected error on suspending app(${appId}:${pid})`, err.stack)
            return step(idx + 1)
          }
        )
    }

    return step(0)
  }

  /**
   * check device free memory available. Send warning or kill victim if possible.
   * Victims were determined by if the app is key and visible and if the app is
   * daemon app and the current memory usage. Key and visible apps and daemon apps
   * would be excluded from the process. The most memory consumer would be _elected_
   * as victim.
   */
  compelFreeAvailableMemory () {
    return this.getAvailableMemory().then(mem => {
      if (mem > this.warningDeviceLWM) {
        return
      }
      logger.warn(`device memory(${mem}kb) less than ${this.warningDeviceLWM}kb, broadcasting warning...`)
      this.component.broadcast.dispatch(MemoryWarningChannel)

      if (mem > this.fatalDeviceLWM) {
        return
      }
      logger.warn(`device memory(${mem}kb) less than ${this.fatalDeviceLWM}kb, finding victim...`)
      var victim = this.findVictim()
      if (victim == null) {
        logger.warn(`no available victim found...`)
        return
      }
      var pid = victim.pid
      var appId = this.appScheduler.pidAppIdMap[pid]
      logger.warn(`found victim(${appId}:${pid}), killing app...`)
      return this.appScheduler.suspendApp(appId, { force: true })
    })
  }

  findVictim () {
    var keyAndVisibleAppId = this.component.visibility.getKeyAndVisibleAppId()
    var pids = Object.keys(this.memMemo)

    return pids.reduce((accu, pid) => {
      var appId = this.appScheduler.pidAppIdMap[pid]
      if (appId === keyAndVisibleAppId || (this.component.appLoader.getAppManifest(appId) || {}).daemon) {
        return accu
      }
      var mem = this.memMemo[pid]
      /**
       * Apps idled for 10minutes (10 * 60 * 1000ms) are considered as same as additional 6m memory consuming.
       */
      var factor = mem + (Date.now() - (this.component.appScheduler.getAppStat(appId) || {}).idleAt) / 100
      if (accu == null || factor > accu.factor) {
        return { pid: pid, mem: mem, factor: factor }
      }
      return accu
    }, null)
  }

  getProcessMemoryUsage (pid) {
    return execAsync(`awk '/VmRSS:/{ rss = $2 } END { print rss }' /proc/${pid}/status`)
      .then(stdout => Number(stdout))
  }

  getAvailableMemory () {
    return execAsync(`awk '/MemAvailable:/{ mem = $2 } END { print mem }' /proc/meminfo`)
      .then(stdout => Number(stdout))
  }

  loadAppMemInfo () {
    this.memMemo = {}
    var pids = Object.keys(this.appScheduler.pidAppIdMap)

    var step = (idx) => {
      if (idx >= pids.length) {
        return Promise.resolve()
      }
      var pid = pids[idx]
      return this.getProcessMemoryUsage(pid)
        .then(
          mem => {
            this.memMemo[pid] = mem
          },
          err => {
            logger.warn(`unexpected error on load process(${pid}) memory info`, err.stack)
          }
        )
        .then(() => step(idx + 1))
    }

    return step(0)
  }

  loadDeviceInfo () {
    if (this.config.backgroundAppHighWaterMark > 0) {
      this.backgroundAppHWM = this.config.backgroundAppHighWaterMark
    }
    if (this.config.keyAndVisibleAppHighWaterMark > 0) {
      this.keyAndVisibleAppHWM = this.config.keyAndVisibleAppHighWaterMark
    }
    if (this.config.warningDeviceLowWaterMark > 0) {
      this.warningDeviceLWM = this.config.warningDeviceLowWaterMark
    }
    if (this.config.fatalDeviceLowWaterMark > 0) {
      this.fatalDeviceLWM = this.config.fatalDeviceLowWaterMark
    }
    return new Promise(resolve => {
      childProcess.exec(`awk '/MemTotal:/{ ttl = $2 } END { print ttl }' /proc/meminfo`, (err, stdout) => {
        if (err) {
          logger.error('Unable to read /proc/meminfo.', new Error('Fatal Error'))
          return process.exit(1)
        }
        var memTotal = this.memTotal = Number(stdout)
        if (!(isFinite(this.backgroundAppHWM) && this.backgroundAppHWM > 0)) {
          this.backgroundAppHWM = Math.floor(memTotal * this.config.backgroundAppHighWaterMarkRatio)
        }
        if (!(isFinite(this.keyAndVisibleAppHWM) && this.keyAndVisibleAppHWM > 0)) {
          this.keyAndVisibleAppHWM = Math.floor(memTotal * this.config.keyAndVisibleAppHighWaterMarkRatio)
        }
        if (!(isFinite(this.warningDeviceLWM) && this.warningDeviceLWM > 0)) {
          this.warningDeviceLWM = Math.floor(memTotal * this.config.warningDeviceLowWaterMarkRatio)
        }
        if (!(isFinite(this.fatalDeviceLWM) && this.fatalDeviceLWM > 0)) {
          this.fatalDeviceLWM = Math.floor(memTotal * this.config.fatalDeviceLowWaterMarkRatio)
        }
        resolve()
      })
    })
  }
}

module.exports = MemorySentinel
