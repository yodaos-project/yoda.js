var Service = require('@yodaos/application').Service

module.exports = Service({
  created: function created () {
    console.log('demo service created')
    this.finish()
  },
  destroyed: function destroyed () {
    console.log('demo service destroyed')
  }
})
