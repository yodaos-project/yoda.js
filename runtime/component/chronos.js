/**
 * @typedef Job
 * @property {boolean} repeat
 * @property {number} triggerAt
 * @property {number} interval
 * @property {string} url
 * @property {string} appId
 */

class Chronos {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component

    /** @type {Job[]} */
    this.nextJobs = []
    /** @type {number} */
    this.nextTime = Infinity
    this.timer = null

    /** @type {Job[]} */
    this.jobs = []
  }

  /**
   *
   * @param {Job} job
   */
  schedule (job) {
    this.jobs.push(job)
    var nextTime = this.calculateNextTime(job, Date.now())
    if (nextTime < this.nextTime) {
      this.nextTime = nextTime
      this.nextJobs = [ job ]
      /** nextTime changed, reschedule */
      this.go(false)
      return
    }
    if (nextTime === this.nextTime) {
      this.nextJobs.push(job)
      /** no need to reschedule */
    }
    /** ignoring the new job for now */
  }

  /**
   *
   * @param {string} url
   */
  cancel (url) {
    this.nextJobs = this.nextJobs.filter(it => it.url !== url)
    this.jobs = this.jobs.filter(it => it.url !== url)
    if (this.nextJobs.length === 0) {
      this.go()
    }
  }

  /**
   * go routine
   * @param {boolean} recalc=true
   */
  go (recalc) {
    clearTimeout(this.timer)
    var delta = this.nextTime - Date.now()
    if (recalc !== false) {
      delta = this.findNextJobs() - Date.now()
      if (delta === Infinity) {
        return
      }
    }
    this.timer = setTimeout(this.routine.bind(this, this.nextTime), delta)
  }

  /**
   *
   * @param {number} nextTime - expected next delta
   */
  routine (nextTime) {
    if (nextTime !== this.nextTime) {
      return
    }
    this.nextJobs.forEach(it => {
      this.runtime.openUrl(it.url)
    })
    this.go()
  }

  /**
   *
   * @returns {number} nextTime
   */
  findNextJobs () {
    var now = Date.now()
    var nextTime = Infinity
    var nextJobs = []
    this.jobs = this.jobs.filter(it => {
      var time = this.calculateNextTime(it, now)
      if (time < 0) {
        return false
      }
      if (time < nextTime) {
        nextTime = time
        nextJobs = [ it ]
        return true
      }
      if (time === nextTime) {
        nextJobs.push(it)
      }
      return true
    })

    this.nextTime = nextTime
    this.nextJobs = nextJobs
    return nextTime
  }

  /**
   * calculate next execution time of the job
   * @param {Job} job
   * @param {number} now
   */
  calculateNextTime (job, now) {
    var triggerAt = job.triggerAt
    if (triggerAt >= now) {
      return triggerAt
    }
    if (!job.repeat) {
      return -1
    }
    var delta = triggerAt - now
    return delta % job.interval + job.interval + now
  }
}

module.exports = Chronos
