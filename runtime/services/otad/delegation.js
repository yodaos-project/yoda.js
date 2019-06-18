var childProcess = require('child_process')
var floraDisposable = require('@yoda/flora/disposable')

class Delegation {
  /**
   *
   * @param {string[]} argv
   */
  constructor (argv) {
    this.programs = {
      prelude: null,
      fetchOtaInfo: null,
      checkIntegrity: null,
      notify: null
    }
    argv = argv || []
    while (argv.length > 0) {
      var $1 = argv.shift()
      switch ($1) {
        case '--require':
          this.require = true
          break
        case '--prelude':
          this.programs.prelude = argv.shift()
          break
        case '--fetcher':
          this.programs.fetchOtaInfo = argv.shift()
          break
        case '--integrity':
          this.programs.checkIntegrity = argv.shift()
          break
        case '--notify':
          this.programs.notify = argv.shift()
          break
      }
    }
  }

  prelude (callback) {
    floraDisposable.once('yodaos.runtime.phase')
      .then(msg => {
        if (msg[0] !== 'ready') {
          return false
        }
        return this.execute(this.programs.prelude)
      })
      .then(
        ret => callback(null, ret == null ? true : ret),
        err => callback(err)
      )
  }

  fetchOtaInfo (systemVersion, callback) {
    this.execute(this.programs.fetchOtaInfo, [ systemVersion ])
      .then(ret => {
        if (ret == null) {
          throw new Error('No result of fetchOtaInfo')
        }
        if (typeof ret === 'string') {
          ret = JSON.parse(ret)
        }
        return ret
      })
      .then(
        ret => callback(null, ret),
        err => callback(err)
      )
  }

  checkIntegrity (imagePath, integrity, callback) {
    this.execute(this.programs.checkIntegrity, [imagePath, integrity])
      .then(
        () => callback(null, true),
        err => callback(err, false)
      )
  }

  notify (version, imagePath, callback) {
    this.execute(this.programs.notify, [version, imagePath])
      .then(
        () => callback(null),
        err => callback(err)
      )
  }

  /**
   *
   * @param {string} program
   * @param {string[]} args
   * @returns {Promise<string | any>}
   */
  execute (program, args) {
    if (program == null) {
      return Promise.resolve()
    }
    if (this.require) {
      return Promise.resolve().then(() => {
        var it = require(program)
        return it.apply(global, args)
      })
    }
    return new Promise((resolve, reject) => {
      args.unshift(program)
      var command = args.join(' ')
      childProcess.exec(command, (err, stdout) => {
        if (err) {
          reject(err)
          return
        }
        resolve(stdout)
      })
    })
  }
}

module.exports = Delegation
