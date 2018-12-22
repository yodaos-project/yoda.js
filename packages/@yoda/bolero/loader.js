var fs = require('fs')
var path = require('path')

var _ = require('@yoda/util')._

class Loader {
  constructor (runtime, property) {
    this.registry = {}
    this.cache = {}
    this.runtime = runtime
    this.property = property

    if (this.runtime[this.property] == null) {
      this.runtime[this.property] = {}
    }
    this.target = this.runtime[this.property]
  }

  load (compDir) {
    var entities = fs.readdirSync(compDir)
    return entities
      .filter(it => _.endsWith(it, '.js'))
      .map(it => {
        var comp = require(path.join(compDir, it))
        this.register(path.basename(it, '.js'), comp, comp.dependencies || [])
      })
  }

  loadToTarget (name, Klass) {
    Object.defineProperty(this.target, name, {
      get: () => {
        var instance = this.cache[name]
        if (!instance) {
          instance = new Klass(this.runtime)
          this.cache[name] = instance
        }
        return instance
      }
    })
  }

  register (name, Klass) {
    name = _.camelCase(name)
    if (this.registry[name]) {
      throw new Error(`Conflict registration on '${name}'.`)
    }
    this.registry[name] = Klass
    this.loadToTarget(name, Klass)
  }

  ['get'] (name) {
    var container = this.registry[name]
    if (container == null) {
      return null
    }
    return container.instance
  }
}

module.exports = Loader
