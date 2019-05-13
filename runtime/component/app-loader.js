
var fs = require('fs')
var promisify = require('util').promisify

var logger = require('logger')('app-loader')
var _ = require('@yoda/util')._
var defaultConfig = require('../lib/config').getConfig('app-loader-config.json')

var readdirAsync = promisify(fs.readdir)
var readFileAsync = promisify(fs.readFile)
var statAsync = promisify(fs.stat)

module.exports = AppChargeur
/**
 * Loads and stores apps manifest for apps.
 *
 * @param {AppRuntime} runtime
 */
function AppChargeur (runtime) {
  this.runtime = runtime
  this.config = this.markupConfig(defaultConfig)

  /** hostName -> appId */
  this.hostAppIdMap = {}
  /** appId -> manifest */
  this.appManifests = {}

  this.broadcasts = {
    'yodaos.on-system-booted': [],
    'yodaos.on-phase-reset': [],
    'yodaos.on-phase-ready': [],
    'yodaos.on-time-changed': []
  }
}

AppChargeur.prototype.reload = function reload (appId) {
  if (appId && this.appManifests[appId]) {
    var manifest = this.appManifests[appId]
    delete this.appManifests[appId]
    manifest.hosts.forEach(host => {
      var hostname = host[0]
      delete this.hostAppIdMap[hostname]
    })
    manifest.broadcasts.forEach(broadcast => {
      var ntf = broadcast[0]
      var idx = this.broadcasts[ntf].indexOf(appId)
      this.broadcasts[ntf].splice(idx, 1)
    })
    return this.loadApp(manifest.appHome)
  }
  /** hostName -> appId */
  this.hostAppIdMap = {}
  /** appId -> manifest */
  this.appManifests = {}

  Object.keys(this.broadcasts).forEach(it => {
    this.broadcasts[it] = []
  })

  return this.loadPaths(this.config.paths)
}

AppChargeur.prototype.markupConfig = function markupConfig (config) {
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

AppChargeur.prototype.getAppIds = function getAppIds () {
  return Object.keys(this.appManifests)
}

/**
 * Get executor for app.
 *
 * @param {string} appId -
 * @returns {AppExecutor | undefined}
 */
AppChargeur.prototype.getExecutorByAppId = function getExecutorByAppId (appId) {
  return this.executors[appId]
}

/**
 *
 * @param {string} appId
 * @returns {Metadata}
 */
AppChargeur.prototype.getAppManifest = function getAppManifest (appId) {
  return _.get(this.appManifests, appId)
}

/**
 *
 * @param {string} appId
 * @returns {'ext' | 'light' | 'dbus'}
 */
AppChargeur.prototype.getTypeOfApp = function getTypeOfApp (appId) {
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
 * Register a broadcast channel so that apps could declare their interests on the broadcast.
 *
 * > NOTE: should be invoked on component's init or construction. Doesn't work on apps loaded before
 * the registration.
 *
 * @param {string} name
 */
AppChargeur.prototype.registerBroadcastChannel = function registerBroadcastChannel (name) {
  if (this.broadcasts[name] != null) {
    return
  }
  logger.info(`registering broadcast channel '${name}'`)
  this.broadcasts[name] = []
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
AppChargeur.prototype.setManifest = function setManifest (appId, manifest, options) {
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
AppChargeur.prototype.getAppIdByHost = function getAppIdByHost (scheme) {
  return this.hostAppIdMap[scheme]
}

/**
 * Load apps exists under paths array.
 *
 * @param {string[]} paths -
 * @returns {Promise<void>}
 */
AppChargeur.prototype.loadPaths = function loadPaths (paths) {
  return _.mapSeries(paths, path => this.loadPath(path))
}

/**
 * Load apps exists under path.
 *
 * @param {string} path -
 * @returns {Promise<void>}
 */
AppChargeur.prototype.loadPath = function loadPath (path) {
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
AppChargeur.prototype.loadApp = function loadApp (root) {
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
AppChargeur.prototype.__loadApp = function __loadApp (appId, appHome, manifest) {
  if (typeof appId !== 'string' || !appId) {
    throw new Error(`AppId is not valid at ${appHome}.`)
  }
  if (this.appManifests[appId] != null) {
    throw new Error(`AppId conflicts at ${appId}(${appHome}).`)
  }

  var hosts = _.get(manifest, 'hosts', [])
  var permissions = _.get(manifest, 'permission', [])
  var broadcasts = _.get(manifest, 'broadcasts', [])
  if (!Array.isArray(hosts)) {
    throw new Error(`manifest.hosts is not valid at ${appId}(${appHome}).`)
  }
  if (!Array.isArray(permissions)) {
    throw new Error(`manifest.permission is not valid at ${appId}(${appHome}).`)
  }
  if (!Array.isArray(broadcasts)) {
    throw new Error(`manifest.broadcasts is not valid at ${appId}(${appHome}).`)
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

  broadcasts = broadcasts.map(broadcast => {
    if (Array.isArray(broadcast)) {
      broadcast = broadcast[0]
    }
    if (typeof broadcast !== 'string') {
      throw new Error(`manifest.broadcasts '${broadcast}' by '${appId}' type mismatch, expecting a string or an array.`)
    }
    if (Object.keys(this.broadcasts).indexOf(broadcast) < 0) {
      logger.debug(`Unknown broadcast chanel ${broadcast}`)
      return /** error tolerance */
    }
    this.broadcasts[broadcast].push(appId)
    return [broadcast]
  }).filter(it => it != null)

  this.runtime.component.permission.load(appId, permissions)
  this.appManifests[appId] = Object.assign(_.pick(manifest, 'objectPath', 'ifaceName'), {
    hosts: hosts,
    permissions: permissions,
    broadcasts: broadcasts,
    appHome: appHome
  })
}
