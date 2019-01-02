'use strict'

class BaseClass {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component
  }
}

module.exports = BaseClass
