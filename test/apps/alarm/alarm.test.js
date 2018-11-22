
var test = require('tape')
var helper = require('../../helper')
var Task = require(`${helper.paths.apps}/alarm/task.js`)
var ScheduledTask = require(`${helper.paths.apps}/alarm/ScheduledTask.js`)

function getMockTime () {
  var now = new Date()
  var arr = []
  arr.push(now.getSeconds() + 1)
  arr.push(now.getMinutes())
  arr.push(now.getHours())
  arr.push(now.getDate())
  arr.push(now.getMonth())
  arr.push('*')
  return arr.join(' ')
}

test('alarm: start play ring', (t) => {
  var pattern = getMockTime()
  var MockTask = new Task(pattern, () => {
    t.pass('alarm start play ring')
  })
  var MockScheduledTask = new ScheduledTask(MockTask, { scheduled: false })
  MockScheduledTask.start()
})
