class Registry {
  constructor () {
    this.exporters = []
  }

  addExporter (it) {
    this.exporters.push(it)
  }

  removeExporter (it) {
    var idx = this.exporters.indexOf(it)
    if (idx >= 0) {
      this.exporters.splice(idx, 1)
    }
  }

  export (metric) {
    this.exporters.forEach(it => it.export(metric))
  }
}

module.exports = Registry
