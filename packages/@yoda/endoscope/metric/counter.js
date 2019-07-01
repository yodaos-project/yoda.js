var Metric = require('./_metric')

class Counter extends Metric {
  inc (labels, count) {
    if (count == null) {
      count = 1
    }
    if (count < 0) {
      return
    }
    this._record(labels, count)
  }
}

module.exports = Counter
