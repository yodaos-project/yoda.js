var fs = require('fs')
var promisify = require('util').promisify
var path = require('path')

var _ = require('@yoda/util')._

var readdirAsync = promisify(fs.readdir)

module.exports = class Barbapapa {
  constructor (instantiateArgs) {
    this.registry = {}
    this.instantiateArgs = instantiateArgs
  }

  load (compDir) {
    return readdirAsync(compDir, 'utf8')
      .then(entities => {
        return entities
          .filter(it => _.endsWith(it, '.js'))
          .map(it => {
            var comp = require(it)
            this.register(path.basename(it, '.js'), comp, comp.dependencies || [])
          })
      })
  }

  register (name, Klass, dependencies) {
    if (this.registry[name]) {
      throw new Error(`Conflict registration on '${name}'.`)
    }
    if (dependencies == null) {
      dependencies = []
    }
    if (!Array.isArray(dependencies)) {
      throw new Error(`Expect an array of dependencies of '${name}'`)
    }
    var container = { Klass: Klass, dependencies: dependencies }
    var depsDesc = dependencies.reduce((accu, depName) => {
      var dep = this.registry[depName]
      if (dep == null) {
        throw new Error(`Unknown dependency on '${depName}' by '${name}'.`)
      }
      accu[depName] = {
        value: dep.instance,
        writable: true,
        enumerable: true,
        configurable: true
      }
      return accu
    }, {})
    var BoundConstructor = Function.prototype.bind.apply(Klass, [ null ].concat(this.instantiateArgs))
    var instance = container.instance = new BoundConstructor()
    Object.defineProperties(instance, depsDesc)
    this.registry[name] = container
  }

  init () {
    Object.keys(this.registry).forEach(name => {
      var inst = this.registry[name].instance
      if (inst.init) {
        inst.init()
      }
    })
  }

  destruct () {
    Object.keys(this.registry).forEach(name => {
      var inst = this.registry[name].instance
      if (inst.destruct) {
        inst.destruct()
      }
    })
  }

  resolve (name) {
    var container = this.registry[name]
    if (container == null) {
      return null
    }
    return container.instance
  }
}
