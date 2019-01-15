/**
 * @module @yoda/bolero
 */

var fs = require('fs')
var path = require('path')

var logger = require('logger')('bolero/loader')
var _ = require('@yoda/util')._

/**
 * Module loader. Loads modules under a directory as a lazily instantiated getter to target.
 */
class Loader {
  /**
   *
   * @param {object} runtime - an object named runtime.
   * @param {string} property - target property name on runtime object.
   */
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

  /**
   * Loads the directory and defines getters on target.
   *
   * @param {array} compDirs - components directories to be loaded.
   * @param {object} stages - components load stages.
   */
  load (compDirs, stages) {
    var dirs = []
    var rst = []
    compDirs.forEach((dir) => {
      var files = []
      try {
        files = fs.readdirSync(dir)
        dirs.push({ dir: dir, files: files })
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err
        }
        logger.error(`directory '${dir}' doesn't exist, skipping...`)
      }
    })

    dirs.forEach((dirInfo) => {
      dirInfo.files.forEach(it => {
        stages.base_component.forEach(fileName => {
          if (fileName === it) {
            var comp = require(path.join(dirInfo.dir, it))
            this.register(path.basename(it, '.js'), comp, comp.dependencies || [])
          }
        })
      })
    })
    process.nextTick(() => {
      dirs.forEach((dirInfo) => {
        rst = rst.concat(dirInfo.files.filter(it => _.endsWith(it, '.js'))
          .map(it => {
            var comp = require(path.join(dirInfo.dir, it))
            try{
              this.register(path.basename(it, '.js'), comp, comp.dependencies || [])
            } catch (err) {
              //todo remove filename after first loading
            }
          }))
      })
    })
    return rst
  }

  /**
   * Attach the class to target with the name camel cased.
   *
   * @private
   * @param {string} name - name of the class
   * @param {Function} Klass - Class constructor
   */
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

  /**
   * Register the class.
   *
   * @param {string} name - name of the class
   * @param {Function} Klass - Class constructor
   */
  register (name, Klass) {
    name = _.camelCase(name)
    if (this.registry[name]) {
      throw new Error(`Conflict registration on '${name}'.`)
    }
    this.registry[name] = Klass
    this.loadToTarget(name, Klass)
  }
}

module.exports = Loader
