var upgradeDir = '/data/upgrade'

if (process.env.OTAD_WORKDIR) {
  upgradeDir = process.env.OTAD_WORKDIR
}

module.exports = {
  upgradeDir: upgradeDir,
  procLock: upgradeDir + '/proc.lock',
  infoLock: upgradeDir + '/info.lock',
  infoFile: upgradeDir + '/info.json'
}
