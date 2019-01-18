'use strict'

class StageList {
  constructor () {
    this.stages = []
    this.index = 0
  }

  add (stageName, callback) {
    this.stages.push({
      name: stageName,
      cb: callback
    })
  }

  run () {
    var p
    if (this.stages.length > 0) {
      p = this.stages[0].cb(this.stages[0].name)
      var tmp = p
      for(var i = 1; i < this.stages.length; ++i) {
        tmp = tmp.then((function (index) {
          this.stages[index].cb(this.stages[index].name)
        }).bind(this, i))
      }
      return p
    } else {
      return Promise.resolve()
    }
  }
}

module.exports = StageList