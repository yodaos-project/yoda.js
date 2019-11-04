var Agent = require('@yoda/flora').Agent

class Exporter {
  constructor (name) {
    this.name = name
    this.agent = new Agent(process.env.YODA_FLORA_URI)
    this.agent.start()
  }

  export (it) {
    this.agent.post(
      this.name,
      [
        it.name,
        Object.keys(it.labels || {})
          .map(key => [ key, it.labels[key] == null ? undefined : String(it.labels[key]) ]),
        it.value
      ]
    )
  }
}

module.exports = Exporter
