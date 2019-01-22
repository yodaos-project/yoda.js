var _ = require('@yoda/util')._
var property = require('@yoda/property')
var logger = require('logger')('skill-host')

class SkillHost {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component

    this.component.flora.declareMethod('rokid.skilloptions', this.querySkillOptions.bind(this))
  }

  querySkillOptions (reqMsg, res) {
    var options = {
      device: {
        version: property.get('ro.build.version.release'),
        power: {
          powerValue: _.get(this.component.battery.memoInfo, 'batLevel'),
          charging: _.get(this.component.battery.memoInfo, 'batChargingOnline')
        }
      },
      application: {}
    }

    return this.component.flora.call('rokid.skills.state', [], 'cloudappclient', 100)
      .then(reply => {
        var skillState = JSON.parse(reply.msg[0])
        options.application = skillState
        res.end(0, [ JSON.stringify(options) ])
      })
      .catch(err => {
        logger.error('unexpected error on call "rokid.skills.state":', err)
        res.end(0, [ JSON.stringify(options) ])
      })
  }
}

module.exports = SkillHost
