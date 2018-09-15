'use strict'

module.exports = (function () {
  /**
   * Creates a new scheduled task.
   *
   * @param {Task} task - task to schedule.
   * @param {boolean} options - whether to start the task immediately.
   */
  function ScheduledTask (task, options) {
    var self = this
    task.on('started', function () {
      self.status = 'running'
    })

    task.on('done', function () {
      self.status = 'waiting'
    })

    task.on('failed', function () {
      self.status = 'failed'
    })
    this.task = function () {
      task.update(new Date())
    }

    this.tick = null
    if (options.scheduled !== false) {
      this.start()
    }
  }

  /**
   * Starts updating the task.
   *
   * @returns {ScheduledTask} instance of this task.
   */
  ScheduledTask.prototype.start = function () {
    this.status = 'scheduled'
    if (this.task && !this.tick) {
      this.tick = setInterval(this.task, 1000)
    }

    return this
  }

  /**
   * Stops updating the task.
   *
   * @returns {ScheduledTask} instance of this task.
   */
  ScheduledTask.prototype.stop = function () {
    this.status = 'stoped'
    if (this.tick) {
      clearInterval(this.tick)
      this.tick = null
    }

    return this
  }

  ScheduledTask.prototype.getStatus = function () {
    return this.status
  }
  /**
   * Destroys the scheduled task.
   */
  ScheduledTask.prototype.destroy = function () {
    this.stop()
    this.task = null
    this.status = 'destroyed'
  }

  return ScheduledTask
}())
