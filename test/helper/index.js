var path = require('path')

module.exports.paths = {
  runtime: '/usr/lib/yoda/runtime',
  apps: '/opt/apps',
  fixture: path.join(__dirname, '..', 'fixture')
}

if (process.platform === 'darwin') {
  Object.assign(module.exports.paths, {
    runtime: path.join(__dirname, '..', '..', 'runtime'),
    apps: path.join(__dirname, '..', '..', 'apps')
  })
}
