var path = require('path')
var ota = require('@yoda/ota')
var mkdirp = require('@yoda/util').fs.mkdirp
var helper = require('../../helper')

var upgradeDir = path.join(helper.paths.fixture, 'upgrade')
ota.upgradeDir = upgradeDir

mkdirp(upgradeDir, () => {})

module.exports = {
  upgradeDir: upgradeDir
}
