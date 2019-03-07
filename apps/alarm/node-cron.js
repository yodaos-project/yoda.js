'use strict'

var Task = require('./task')
var ScheduledTask = require('./scheduled-task')
var validation = require('./pattern-validation')
// var parser = require('./parser')
var CronExpression = require('./expression')

var priority = {
  'Remind': 100,
  'Alarm': 50
}
module.exports = (function () {
  function cronTab () {
    var self = this
    self.jobs = {}
    self.backups = {}
    self.reminderQueue = []
    /**
     * compare tasks
     *  1. if there is only one task at the moment, return true.
     *  2. if there are concurrent tasks at the moment:
     *      1. both reminders and clocks, only reminders can be run, clocks cannot be run.
     *      2. only reminders: combine reminders tts and play once.
     *      3. only clocks: run the last setting clock.
     */
    function compareTask (id, current, refered) {
      var currentInterval = CronExpression.parseSync(current.expression)
      var referedInterval = CronExpression.parseSync(refered.expression)
      // no concurrency alarm or reminder
      if (Math.floor(currentInterval.next().getTime() / 1000) !== Math.floor(referedInterval.next().getTime() / 1000)) {
        return true
      } else {
        if (priority[current.type] > priority[refered.type]) {
          return true
        } else if (priority[current.type] === priority[refered.type]) {
          if (current.createTime > refered.createTime) {
            return true
          } else {
            return false
          }
        } else {
          return false
        }
      }
    }

    /**
     * clear reminders tts queue
     */
    this.clearReminderQueue = function () {
      self.reminderQueue = []
    }

    function clearPrevReminders (current, refered) {
      var currentInterval = CronExpression.parseSync(current.expression)
      var referedInterval = CronExpression.parseSync(refered.expression)
      var currentTime = Math.floor(currentInterval.next().getTime() / 1000)
      var referedTime = Math.floor(referedInterval.next().getTime() / 1000)
      // no concurrency alarm or reminder
      if (currentTime > referedTime + 1) {
        return true
      }
      return false
    }

    this.getJobConfig = function (id) {
      var isRunnable = false
      if (self.jobs[id].type === 'Remind') {
        if (self.reminderQueue.indexOf(id) < 0) {
          self.reminderQueue.push(id)
        }
      }
      for (var key in self.jobs) {
        if (key !== id) {
          var currentObj = {
            type: self.jobs[id].type,
            expression: self.jobs[id].expression,
            createTime: self.jobs[id].createTime,
            tts: self.jobs[id].tts
          }
          var referedObj = {
            type: self.jobs[key].type,
            expression: self.jobs[key].expression,
            createTime: self.jobs[key].createTime
          }
          var compareResult = compareTask(id, currentObj, referedObj)
          if (currentObj.type === 'Remind') {
            if (clearPrevReminders(currentObj, referedObj)) {
              self.reminderQueue.splice(key, 1)
            }
            isRunnable = compareResult
          } else {
            isRunnable = compareResult
          }
          if (!compareResult) {
            break
          }
        } else {
          isRunnable = true
        }
      }
      return isRunnable
    }

    this.getJobStatus = function (id) {
      return self.jobs[id].job.getStatus()
    }
    this.getBackup = function (options) {
      return self.backups
    }
    this.clear = function (id) {
      if (id && self.jobs[id]) {
        self.jobs[id].job.destroy()
        delete self.jobs[id]
      } else {
        for (var key in self.jobs) {
          self.jobs[key].job.destroy()
        }
        self.jobs = {}
      }
    }

    this.stop = function (id) {
      if (id) {
        self.jobs[id].job.stop()
      } else {
        for (var key in self.jobs) {
          self.jobs[key].job.stop()
        }
      }
    }

    /**
     * Creates a new task to execute given function when the cron
     *  expression ticks.
     *
     * @param {string} expression - cron expression.
     * @param {Function} func - task to be executed.
     * @param {object} param - param for task config.
     * @param {object} options - whether to start the task immediately.
     * @returns {ScheduledTask} update function.
     */
    this.create = function (expression, func, param, options) {
      if (typeof options === 'boolean') {
        options = {
          scheduled: options
        }
      }

      if (!options) {
        options = {
          scheduled: true
        }
      }
      if (self.jobs.hasOwnProperty(param.id)) {
        console.log(param.id + ' destroyed!')
        self.jobs[param.id].job.destroy()
        delete self.jobs[param.id]
      }
      var task = new Task(expression, func)
      var scheduleJob = new ScheduledTask(task, options)
      console.log(param.id + ' created!')
      // var jobVessel = {};
      if (scheduleJob) {
        self.jobs[param.id] = {
          id: param.id,
          type: param.type,
          job: scheduleJob,
          pattern: task.initialPattern,
          expression: expression,
          createTime: param.createTime,
          tts: param.tts,
          url: param.url,
          time: param.time,
          date: param.date
        }
      }
      return scheduleJob
    }
  }

  function validate (expression) {
    try {
      validation(expression)
    } catch (e) {
      return false
    }
    return true
  }
  return {
    Schedule: cronTab,
    validate: validate
  }
}())
