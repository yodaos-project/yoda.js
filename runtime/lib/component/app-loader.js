
var fs = require('fs')
var promisify = require('util').promisify

var logger = require('logger')('app-loader')
var _ = require('@yoda/util')._
var defaultConfig = require('/etc/yoda/app-loader-config.json')

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

  /** skillId -> appId */
  this.skillIdAppIdMap = {}
  /** skillId -> skillAttrs */
  this.skillAttrsMap = {}
  /** hostName -> skillId */
  this.hostSkillIdMap = {}
  /** appId -> manifest */
  this.appManifests = {}

  this.notifications = {
    'on-system-booted': [],
    'on-ready': [],
    'on-network-connected': []
  }
}

AppChargeur.prototype.reload = function reload (appId) {
  if (appId && this.appManifests[appId]) {
    var manifest = this.appManifests[appId]
    delete this.appManifests[appId]
    manifest.skills.forEach(skill => {
      var skillId = skill[0]
      delete this.skillIdAppIdMap[skillId]
      delete this.skillAttrsMap[skillId]
    })
    manifest.hosts.forEach(host => {
      var hostname = host[0]
      delete this.hostSkillIdMap[hostname]
    })
    manifest.notifications.forEach(notification => {
      var ntf = notification[0]
      var idx = this.notifications[ntf].indexOf(appId)
      this.notifications[ntf].splice(idx, 1)
    })
    return this.loadApp(manifest.appHome)
  }
  /** skillId -> appId */
  this.skillIdAppIdMap = {}
  /** skillId -> skillAttrs */
  this.skillAttrsMap = {}
  /** hostName -> skillId */
  this.hostSkillIdMap = {}
  /** appId -> manifest */
  this.appManifests = {}

  Object.keys(this.notifications).forEach(it => {
    this.notifications[it] = []
  })

  return this.loadPaths(this.config.paths)
}

AppChargeur.prototype.markupConfig = function markupConfig (config) {
  if (config == null || typeof config !== 'object') {
    config = {}
  }
  ;['paths',
    'lightAppIds',
    'dbusAppIds',
    'cloudStackExcludedSkillIds'
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
 * Determines if the skill shall be excluded from cloud stack.
 */
AppChargeur.prototype.isSkillIdExcludedFromStack = function isSkillIdExcludedFromStack (skillId) {
  /**
   * Exclude local convenience app from cloud skill stack
   */
  if (_.startsWith(skillId, '@')) {
    return true
  }
  /**
   * Exclude apps from cloud skill stack
   * - composition-de-voix
   * - ROKID.EXCEPTION
   */
  if (this.config.cloudStackExcludedSkillIds.indexOf(skillId) >= 0) {
    return true
  }
  return false
}

/**
 * Register a notification channel so that apps could declare their interests on the notification.
 *
 * > NOTE: should be invoked on component's init or construction. Doesn't work on apps loaded before
 * the registration.
 *
 * @param {string} name
 */
AppChargeur.prototype.registerNotificationChannel = function registerNotificationChannel (name) {
  if (this.notifications[name] != null) {
    return
  }
  logger.info(`registering notification channel '${name}'`)
  this.notifications[name] = []
}

/**
 * Directly set manifest for appId and populate its skills and permissions.
 *
 * @param {string} appId
 * @param {object} manifest
 * @param {string[]} [manifest.skills]
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
 * Get appId that the skillId was mapped to.
 *
 * @param {string} skillId -
 * @returns {string | undefined} appId
 */
AppChargeur.prototype.getAppIdBySkillId = function getAppIdBySkillId (skillId) {
  return this.skillIdAppIdMap[skillId]
}

/**
 * Get skillId that the hostname was mapped to.
 *
 * @param {string} scheme
 */
AppChargeur.prototype.getSkillIdByHost = function getSkillIdByHost (scheme) {
  return this.hostSkillIdMap[scheme]
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

  var skillIds = _.get(manifest, 'skills', [])
  var hosts = _.get(manifest, 'hosts', [])
  var permissions = _.get(manifest, 'permission', [])
  var notifications = _.get(manifest, 'notifications', [])
  if (!Array.isArray(skillIds)) {
    throw new Error(`manifest.skills is not valid at ${appId}(${appHome}).`)
  }
  if (!Array.isArray(hosts)) {
    throw new Error(`manifest.hosts is not valid at ${appId}(${appHome}).`)
  }
  if (!Array.isArray(permissions)) {
    throw new Error(`manifest.permission is not valid at ${appId}(${appHome}).`)
  }
  if (!Array.isArray(notifications)) {
    throw new Error(`manifest.notifications is not valid at ${appId}(${appHome}).`)
  }

  skillIds = skillIds.map(skillId => {
    var skillAttrs
    if (Array.isArray(skillId)) {
      var arr = skillId
      skillId = arr[0]
      skillAttrs = arr[1]
    }
    if (typeof skillId !== 'string') {
      throw new Error(`manifest.skills '${skillId}' by '${appId}' type mismatch, expecting a string or an array.`)
    }
    var currAppId = this.skillIdAppIdMap[skillId]
    if (currAppId != null) {
      throw new Error(`manifest.skills '${skillId}' by '${appId}' exists, declaring by ${currAppId}.`)
    }
    if (skillAttrs && typeof skillAttrs !== 'object') {
      throw new Error(`manifest.skills '${skillId}' by '${appId}' attributes type mismatch, expecting a object.`)
    }
    this.skillIdAppIdMap[skillId] = appId
    if (skillAttrs) {
      this.skillAttrsMap[skillId] = skillAttrs
    }
    return [skillId, skillAttrs]
  })
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
    var skillId = _.get(hostAttrs, 'skillId')

    if (this.skillIdAppIdMap[skillId] !== appId) {
      throw new Error(`manifest.hosts '${skillId}' mapped from '${host}' doesn't owned by ${appId}.`)
    }
    var currSkillId = this.hostSkillIdMap[host]
    if (currSkillId != null) {
      throw new Error(`manifest.hosts '${host}' by '${currSkillId}' exists, declaring by ${appId}.`)
    }
    this.hostSkillIdMap[host] = skillId
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
    skills: skillIds,
    hosts: hosts,
    permissions: permissions,
    notifications: notifications,
    appHome: appHome
  })
}
