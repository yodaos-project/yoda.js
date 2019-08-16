class Registry {
  constructor () {
    this.exporters = []
  }

  addExporter (it) {
    this.exporters.push(it)
  }

  export (metric) {
    this.exporters.forEach(it => it.export(metric))
  }
}

module.exports = Registry
