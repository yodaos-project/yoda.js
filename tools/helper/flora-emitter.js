var logger = require('logger')('flora')

var floraFactory = require('@yoda/flora')
var config = require('/etc/yoda/flora-config.json')
var Caps = floraFactory.Caps

var channel = process.argv[2]
var args = process.argv[3]

logger.info(`sending message to channel(${channel}) with body(${args})...`)

function main () {
  var cli = floraFactory.connect(`${config.uri}#flora-emitter`, config.bufsize)
  if (!cli) {
    logger.error('flora connect failed')
    return
  }
  cli.on('disconnected', () => logger.info('flora disconnected'))
  logger.info('flora connected')

  var msg = new Caps()
  if (args) {
    args = JSON.parse(args)
    if (!Array.isArray(args)) {
      throw new Error('args is not an array')
    }
    args.forEach(it => {
      if (typeof it === 'number') {
        msg.writeInt32(it)
      }
      msg.write(it)
    })
  }

  cli.post(channel, msg, floraFactory.MSGTYPE_PERSIST)

  cli.close()
}

main()
