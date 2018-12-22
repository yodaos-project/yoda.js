var Component = require('@yoda/bolero').Component

class Foo extends Component {
  constructor (runtime) {
    super(runtime)
    this.word = 'foo'
  }

  hello () {
    return this.word
  }
}

module.exports = Foo
