
var fs = require('fs')
var promisify = require('util').promisify

var logger = require('logger')('app-loader')
var _ = require('@yoda/util')._
var defaultConfig = require('../lib/config').getConfig('app-loader-config.json')
var crypto = require('crypto')

var readdirAsync = promisify(fs.readdir)
var readFileAsync = promisify(fs.readFile)
var statAsync = promisify(fs.stat)

module.exports = AppLoader
/**
 * Loads and stores apps manifest for apps.
 *
 * @param {AppRuntime} runtime
 */
function AppLoader (runtime) {
  this.runtime = runtime
  this.config = this.markupConfig(defaultConfig)

  /** hostName -> appId */
  this.hostAppIdMap = {}
  /** appId -> manifest */
  this.appManifests = {}

  this.appSecrets = {}
  this.notifications = {
    'on-system-booted': [],
    'on-ready': [],
    'on-network-connected': []
  }
}

AppLoader.prototype.reload = function reload (appId) {
  if (appId && this.appManifests[appId]) {
    var manifest = this.appManifests[appId]
    delete this.appManifests[appId]
    manifest.hosts.forEach(host => {
      var hostname = host[0]
      delete this.hostAppIdMap[hostname]
    })
    manifest.notifications.forEach(notification => {
      var ntf = notification[0]
      var idx = this.notifications[ntf].indexOf(appId)
      this.notifications[ntf].splice(idx, 1)
    })
    return this.loadApp(manifest.appHome)
  }
  /** hostName -> appId */
  this.hostAppIdMap = {}
  /** appId -> manifest */
  this.appManifests = {}

  Object.keys(this.notifications).forEach(it => {
    this.notifications[it] = []
  })

  return this.loadPaths(this.config.paths)
}

AppLoader.prototype.markupConfig = function markupConfig (config) {
  if (config == null || typeof config !== 'object') {
    config = {}
  }
  ;['paths',
    'lightAppIds',
    'dbusAppIds'
  ].forEach(key => {
    if (!Array.isArray(config[key])) {
      config[key] = []
    }
  })
  return config
}

AppLoader.prototype.getAppIds = function getAppIds () {
  return Object.keys(this.appManifests)
}

/**
 * Get pre-generated app secret or re-generate it if doesn't exists.
 *
 * @param {string} appId
 * @returns {string} secret generated or cached
 */
AppLoader.prototype.getAppSecret = function getAppSecret (appId) {
  if (this.appManifests[appId] == null) {
    throw new Error(`Unknown app ${appId}`)
  }
  var secret = this.appSecrets[appId]
  if (secret == null) {
    var ts = Date.now()
    var md5 = crypto.createHash('md5')
      .update(`${appId}:${ts}:${Math.random()}`)
      .digest('hex')
    secret = this.appSecrets[appId] = `${appId}:${md5}`
  }
  return secret
}

/**
 * Verify the secret and return the corresponding app id if the secret is a correct one.
 *
 * Returns false if otherwise.
 *
 * @param {string} secret
 * @returns {false|string} appId or false
 */
AppLoader.prototype.verifyAndDecryptAppSecret = function verifyAndDecryptAppSecret (secret) {
  if (typeof secret !== 'string') {
    return false
  }
  var match = secret.split(':', 2)
  var appId = match[0]
  var expected = this.appSecrets[appId]
  if (expected == null || secret !== expected) {
    return false
  }
  return appId
}

/**
 * Get executor for app.
 *
 * @param {string} appId -
 * @returns {AppExecutor | undefined}
 */
AppLoader.prototype.getExecutorByAppId = function getExecutorByAppId (appId) {
  return this.executors[appId]
}

/**
 *
 * @param {string} appId
 * @returns {Metadata}
 */
AppLoader.prototype.getAppManifest = function getAppManifest (appId) {
  return _.get(this.appManifests, appId)
}

/**
 *
 * @param {string} appId
 * @returns {'ext' | 'light' | 'dbus'}
 */
AppLoader.prototype.getTypeOfApp = function getTypeOfApp (appId) {
  if (this.config.lightAppIds.indexOf(appId) >= 0) {
    return 'light'
  }
  if (this.config.dbusAppIds.indexOf(appId) >= 0) {
    return 'dbus'
  }
  if (_.get(this.getAppManifest(appId), 'rawExecutable', false) === true) {
    return 'exe'
  }
  return 'ext'
}

/**
 * Register a notification channel so that apps could declare their interests on the notification.
 *
 * > NOTE: should be invoked on component's init or construction. Doesn't work on apps loaded before
 * the registration.
 *
 * @param {string} name
 */
AppLoader.prototype.registerNotificationChannel = function registerNotificationChannel (name) {
  if (this.notifications[name] != null) {
    return
  }
  logger.info(`registering notification channel '${name}'`)
  this.notifications[name] = []
}

/**
 * Directly set manifest for appId and populate its permissions.
 *
 * @param {string} appId
 * @param {object} manifest
 * @param {string[]} [manifest.permission]
 * @param {string[]} [manifest.hosts]
 * @returns {void}
 */
AppLoader.prototype.setManifest = function setManifest (appId, manifest, options) {
  var dbusApp = _.get(options, 'dbusApp', false)

  if (dbusApp && this.config.dbusAppIds.indexOf(appId) < 0) {
    this.config.dbusAppIds.push(appId)
    /** dbus apps shall be daemon app since they are running alone with vui */
    manifest.daemon = true
  }
  this.__loadApp(appId, null, manifest)
}

/**
 * Get appId that the hostname was mapped to.
 *
 * @param {string} scheme
 */
AppLoader.prototype.getAppIdByHost = function getAppIdByHost (scheme) {
  return this.hostAppIdMap[scheme]
}

/**
 * Load apps exists under paths array.
 *
 * @param {string[]} paths -
 * @returns {Promise<void>}
 */
AppLoader.prototype.loadPaths = function loadPaths (paths) {
  return _.mapSeries(paths, path => this.loadPath(path))
}

/**
 * Load apps exists under path.
 *
 * @param {string} path -
 * @returns {Promise<void>}
 */
AppLoader.prototype.loadPath = function loadPath (path) {
  return readdirAsync(path)
    .then(entities => {
      return Promise.all(
        entities
          .map(it => `${path}/${it}`)
          .map(it => statAsync(it)
            .then(stat => [ it, stat ])
          )
      )
    }, err => {
      if (err.code !== 'ENOENT') {
        throw err
      }
      logger.error(`directory '${path}' doesn't exist, skipping...`)
      return []
    })
    .then(res => {
      return Promise.all(
        res.filter(it => it[1].isDirectory())
          .map(it => this.loadApp(it[0])
            .catch(err => {
              logger.error('Unexpected error on loading app', it[0], err.stack)
            })
          )
      )
    })
}

/**
 * 根据应用的包路径加载应用
 * @param {string} root - 应用的包路径
 * @returns {Promise<void>}
 */
AppLoader.prototype.loadApp = function loadApp (root) {
  logger.log('load app: ' + root)
  return readFileAsync(root + '/package.json', 'utf8')
    .then(data => {
      var pkgInfo
      try {
        pkgInfo = JSON.parse(data)
      } catch (err) {
        throw new Error(`Malformed package.json at ${root}`)
      }
      var appId = _.get(pkgInfo, 'name')
      var manifest = _.get(pkgInfo, 'manifest')
      if (manifest == null) {
        logger.warn(`app(${root}) doesn't defines 'package.manifest' yet has 'package.metadata'.`)
        manifest = _.get(pkgInfo, 'metadata', {})
      }

      this.__loadApp(appId, root, manifest)
    })
}

/**
 * Populates app and its related manifest.
 *
 * @private
 * @param {string} appId -
 * @param {string} appHome -
 * @param {Manifest} manifest -
 * @returns {void}
 */
AppLoader.prototype.__loadApp = function __loadApp (appId, appHome, manifest) {
  if (typeof appId !== 'string' || !appId) {
    throw new Error(`AppId is not valid at ${appHome}.`)
  }
  if (this.appManifests[appId] != null) {
    throw new Error(`AppId conflicts at ${appId}(${appHome}).`)
  }

  var hosts = _.get(manifest, 'hosts', [])
  var permissions = _.get(manifest, 'permission', [])
  var notifications = _.get(manifest, 'notifications', [])
  if (!Array.isArray(hosts)) {
    throw new Error(`manifest.hosts is not valid at ${appId}(${appHome}).`)
  }
  if (!Array.isArray(permissions)) {
    throw new Error(`manifest.permission is not valid at ${appId}(${appHome}).`)
  }
  if (!Array.isArray(notifications)) {
    throw new Error(`manifest.notifications is not valid at ${appId}(${appHome}).`)
  }

  hosts = hosts.map(host => {
    var hostAttrs
    if (Array.isArray(host)) {
      hostAttrs = host[1]
      host = host[0]
    } else if (typeof host === 'object') {
      hostAttrs = host
      host = _.get(host, 'name')
    }
    if (typeof host !== 'string') {
      throw new Error(`manifest.host '${host}' by '${appId}' type mismatch, expecting a string or an array.`)
    }
    var currAppId = this.hostAppIdMap[host]
    if (currAppId != null) {
      throw new Error(`manifest.hosts '${host}' by '${currAppId}' exists, declaring by ${appId}.`)
    }
    this.hostAppIdMap[host] = appId
    return [host, hostAttrs]
  })

  notifications = notifications.map(notification => {
    if (Array.isArray(notification)) {
      notification = notification[0]
    }
    if (typeof notification !== 'string') {
      throw new Error(`manifest.notification '${notification}' by '${appId}' type mismatch, expecting a string or an array.`)
    }
    if (Object.keys(this.notifications).indexOf(notification) < 0) {
      logger.debug(`Unknown notification chanel ${notification}`)
      return /** error tolerance */
    }
    this.notifications[notification].push(appId)
    return [notification]
  }).filter(it => it != null)

  this.runtime.component.permission.load(appId, permissions)
  this.appManifests[appId] = Object.assign(_.pick(manifest, 'daemon', 'objectPath', 'ifaceName'), {
    hosts: hosts,
    permissions: permissions,
    notifications: notifications,
    appHome: appHome
  })
}
