var Metric = require('./_metric')

class Slice {
  constructor (labels) {
    this.start = Date.now()
    this.labels = labels
  }
}

class Histogram extends Metric {
  start (labels) {
    return new Slice(labels)
  }

  end (slice) {
    if (!(slice instanceof Slice)) {
      return
    }
    return this._record(slice.labels, Date.now() - slice.start)
  }
}

module.exports = Histogram
