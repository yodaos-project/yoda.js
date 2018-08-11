var DbusAdapter = require('extapp').DbusAdapter;
var ExtAppService = require('extapp').ExtAppService;
var logger = require('logger')('extappProxy');
var target = process.argv[2];

console.log(process.argv);

if (!target) {
  logger.log('target require');
  process.exit(0);
}
console.log('load target: ' + target + '/package.json');
var pkg = require(target + '/package.json');

var main = target + '/' + (pkg.main || 'app.js');
console.log('load main: ' + main);
var handle = require(main);

var appId = pkg.metadata.skills[0];
var dbusConfig = pkg.metadata.dbusConn;

console.log('appId: ' + appId);
console.log('dbusConfig: ', dbusConfig);


var service = new ExtAppService(DbusAdapter, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: dbusConfig.objectPath,
  dbusInterface: dbusConfig.ifaceName
});

console.log('create app');
var app = service.create(appId, true);

console.log('execute hook');
handle(app);
console.log('hook complete');

process.send({ready: true});