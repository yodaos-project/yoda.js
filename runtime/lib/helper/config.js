var path = require('path')

var configPath = process.env.YODA_RUN_MODE === 'host'
  ? path.join(__dirname, '../../../etc/yoda')
  : '/etc/yoda'

module.exports.getConfig = function getConfig (name) {
  return require(path.join(configPath, name))
}
