'use strict'

var Task = require('./task')
var ScheduledTask = require('./scheduled-task')
var validation = require('./pattern-validation')
var parser = require('./parser')

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
      var currentInterval = parser.parseExpressionSync(current.expression)
      var referedInterval = parser.parseExpressionSync(refered.expression)
      // no concurrency alarm or reminder
      if (Math.floor(currentInterval.next().getTime() / 1000) !== Math.floor(referedInterval.next().getTime() / 1000)) {
        return true
      } else {
        // current is reminder
        if (priority[current.type] > priority[refered.type]) {
          return true
        } else if (priority[current.type] === priority[refered.type] && current.type === 'Alarm') {
          if (current.createTime > refered.createTime) {
            return true
          } else {
            return false
          }
        } else {
          if (current.createTime > refered.createTime) {
            return true
          }
        }
      }
      return false
    }
    /**
     * get combined reminders tts
     *
     * @returns {string} combined tts.
     */
    this.combineReminderTts = function () {
      if (self.reminderQueue.length === 0) {
        return ''
      }
      var sortQueue = self.reminderQueue.sort()
      var combinedTTS = ''
      for (var i = 0; i < sortQueue.length; i++) {
        combinedTTS += self.jobs[sortQueue[i]].tts
      }
      return combinedTTS
    }
    /**
     * clear reminders tts queue
     */
    this.clearReminderQueue = function () {
      self.reminderQueue = []
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
            createTime: self.jobs[id].createTime
          }
          var referedObj = {
            type: self.jobs[key].type,
            expression: self.jobs[key].expression,
            createTime: self.jobs[key].createTime
          }
          var compareResult = compareTask(id, currentObj, referedObj)
          if (!compareResult) {
            isRunnable = false
            // return false;
            break
          }
          isRunnable = true
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
      if (id) {
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
        self.jobs[param.id].job.destroy()
        delete self.jobs[param.id]
      }
      var task = new Task(expression, func)
      var scheduleJob = new ScheduledTask(task, options)
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
          url: param.url
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
