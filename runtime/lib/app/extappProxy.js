'use strict'

var DbusAdapter = require('@yoda/extapp').DbusAdapter
var ExtAppService = require('@yoda/extapp').ExtAppService
var logger = require('logger')('extappProxy')
var target = process.argv[2]

if (!target) {
  logger.log('target require')
  process.send({ready: false})
  process.exit(-1)
}
logger.log(`load target: ${target}/package.json`)
var pkg = require(`${target}/package.json`)

var main = `${target}/${pkg.main || 'app.js'}`
logger.log(`load main: ${main}`)
var handle = require(main)

var appId = pkg.metadata.skills[0]
var dbusConfig = pkg.metadata.dbusConn

var service = new ExtAppService(DbusAdapter, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: dbusConfig.objectPath,
  dbusInterface: dbusConfig.ifaceName
})

service.appHome = target

logger.log('create app')
var app = service.create(appId, true)

logger.log('execute hook')
handle(app)
logger.log('hook complete')

process.send({ready: true})
