var _ = require('@yoda/util')._
var property = require('@yoda/property')
var logger = require('logger')('skill-host')

class SkillHost {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component

    this.component.flora.declareMethod('rokid.skilloptions', this.methodSkillOptions.bind(this))
  }

  querySkillOptions (deviceOptions) {
    var options = {
      device: Object.assign({
        version: property.get('ro.build.version.release'),
        power: {
          powerValue: _.get(this.component.battery.memoInfo, 'batLevel'),
          charging: _.get(this.component.battery.memoInfo, 'batChargingOnline')
        }
      }, deviceOptions),
      application: {}
    }

    return this.component.flora.call('rokid.skills.state', [], 'cloudappclient')
      .then(reply => {
        var skillState = JSON.parse(reply.msg[0])
        options.application = skillState
        return options
      })
      .catch(err => {
        logger.error('unexpected error on call "rokid.skills.state":', err)
        return options
      })
  }

  methodSkillOptions (reqMsg, res) {
    this.querySkillOptions().then(skillOptions => {
      res.end(0, [ JSON.stringify(skillOptions) ])
    })
  }
}

module.exports = SkillHost
