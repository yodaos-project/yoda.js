var Agent = require('@yoda/flora').Agent

class Exporter {
  constructor (name) {
    this.name = name
    this.agent = new Agent('unix:/var/run/flora.sock')
    this.agent.start()
  }

  export (it) {
    this.agent.post(
      this.name,
      [
        it.name,
        it.labels && Object.keys(it.labels)
          .map(key => [ key, it.labels[key] == null ? undefined : String(it.labels[key]) ]),
        it.value
      ]
    )
  }
}

module.exports = Exporter
