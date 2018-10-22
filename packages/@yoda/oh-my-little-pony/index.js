var fs = require('fs')
var path = require('path')
var property = require('@yoda/property')
var logger = require('logger')('pony')

var yodaUtil = require('@yoda/util')

var heapdumpFlag = property.get('sys.vm.heapdump', 'persist')
if (heapdumpFlag === 'true') {
  process.on('SIGUSR2', function () {
    var timestamp = Math.floor(Date.now())
    var profiler = require('profiler')
    var filename = `/data/heapdump-${process.pid}-${timestamp}.json`
    profiler.takeSnapshot(filename)
    logger.debug(`dump the heap profile at ${filename}`)
    logger.debug('memory usage is at', process.memoryUsage())
  })
}

module.exports.catchUncaughtError = function catchUncaughtError (logfile) {
  var stream
  if (logfile) {
    yodaUtil.fs.mkdirp(path.dirname(logfile), (err) => {
      if (err) {
        logger.error(err)
        return
      }
      stream = fs.createWriteStream(logfile)
    })
  }

  process.on('uncaughtException', err => {
    logger.error('Uncaught Exception', err)
    stream && stream.write(`[${new Date().toISOString()}] <${process.argv[1]}> Uncaught Exception:
${err.stack}\n`, () => {})
  })

  process.on('unhandledRejection', err => {
    logger.error('Unhandled Rejection', err)
    stream && stream.write(`[${new Date().toISOString()}] <${process.argv[1]}> Unhandled Rejection:
${err.stack}\n`, () => {})
  })
}
