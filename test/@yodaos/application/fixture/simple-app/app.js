var Application = require('@yodaos/application').Application

module.exports = Application({
  url: function url () {
    this.startService('a-service')
  }
})
