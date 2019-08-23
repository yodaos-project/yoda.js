var path = require('path')

module.exports.paths = {
  runtime: '/usr/yoda',
  fixture: path.join(__dirname, '..', 'fixture')
}

if (process.env.YODA_RUN_MODE === 'host') {
  Object.assign(module.exports.paths, {
    runtime: path.join(__dirname, '..', '..', 'runtime')
  })
}
