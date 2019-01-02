var Component = require('@yoda/bolero').Component

class Bar extends Component {
  constructor (runtime) {
    super(runtime)
    this.word = 'bar'
  }

  hello () {
    return this.component.foo.hello() + this.word
  }
}

module.exports = Bar
