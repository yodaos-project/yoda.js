var fs = require('fs')
var path = require('path')
var logger = require('logger')('pony')

var yodaUtil = require('@yoda/util')

/**
 * FIXME: some native add-on callbacks do not trigger process.nextTick
 * shall be fixed in N-API make callback
 */
process.nextTick = function fakeNextTick (fn) {
  var params = Array.prototype.slice.call(arguments, 1)
  setTimeout(function nextTick () {
    fn.apply(global, params)
  }, 0)
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
