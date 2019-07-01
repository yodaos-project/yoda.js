var Metric = require('./_metric')

class Enum extends Metric {
  constructor (name, opts) {
    if (typeof opts !== 'object') {
      opts = { states: [] }
    }
    if (!Array.isArray(opts.labels)) {
      opts.labels = []
    }
    if (opts.labels.indexOf('state') < 0) {
      opts.labels.push('state')
    }
    super(name, opts)
    this.states = opts.states
  }

  state (labels, state) {
    if (arguments.length === 1) {
      state = labels
      labels = undefined
    }
    if (Array.prototype.indexOf.call(this.states, state) < 0) {
      return
    }
    labels = Object.assign({ state: state }, labels)
    this._record(labels, 1)
  }
}

module.exports = Enum
