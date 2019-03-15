var fs = require('fs')
var path = require('path')
var property = require('@yoda/property')
var logger = require('logger')('pony')

var yodaUtil = require('@yoda/util')

var profilerFlag = property.get('sys.vm.profiler', 'persist')
if (profilerFlag === 'true') {
  var profiling = false
  process.on('SIGUSR1', function () {
    var profiler = require('profiler')
    if (profiling) {
      logger.debug('stop profiling')
      profiler.stopProfiling()
      return
    }
    var timestamp = Math.floor(Date.now())
    var filename = `/data/cpu-profile-${process.pid}-${timestamp}.txt`
    profiler.startProfiling(filename)
    logger.debug(`start profiling, target ${filename}`)
    profiling = true
  })
  process.on('SIGUSR2', function () {
    var profiler = require('profiler')
    var timestamp = Math.floor(Date.now())
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
