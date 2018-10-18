
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
  this.config = defaultConfig

  /** skillId -> appId */
  this.skillIdAppIdMap = {}
  /** skillId -> skillAttrs */
  this.skillAttrsMap = {}
  /** hostName -> skillId */
  this.hostSkillIdMap = {}
  /** appId -> manifest */
  this.appManifests = {}
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
  return 'ext'
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

  var skillIds = _.get(manifest, 'skills', [])
  var permissions = _.get(manifest, 'permission', [])
  var hosts = _.get(manifest, 'hosts', [])

  if (typeof appId !== 'string' || !appId) {
    throw new Error(`AppId is not valid at ${appId}.`)
  }
  if (this.appManifests[appId] != null) {
    throw new Error(`AppId exists at ${appId}.`)
  }
  if (!Array.isArray(skillIds)) {
    throw new Error(`manifest.skills is not valid at ${appId}.`)
  }
  if (!Array.isArray(hosts)) {
    throw new Error(`manifest.hosts is not valid at ${appId}.`)
  }
  if (!Array.isArray(permissions)) {
    throw new Error(`manifest.permission is not valid at ${appId}.`)
  }

  this.__loadApp(appId, null, manifest, skillIds, hosts, permissions)
  if (dbusApp) {
    this.config.dbusAppIds.push(appId)
  }
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
    })
    .then(res => {
      return Promise.all(
        res.filter(it => it[1].isDirectory())
          .map(it => this.loadApp(it[0]))
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

      var skillIds = _.get(manifest, 'skills', [])
      var hosts = _.get(manifest, 'hosts', [])
      var permissions = _.get(manifest, 'permission', [])
      if (typeof appId !== 'string' || !appId) {
        throw new Error(`AppId is not valid at ${root}.`)
      }
      if (this.appManifests[appId] != null) {
        throw new Error(`AppId exists at ${root}.`)
      }
      if (!Array.isArray(skillIds)) {
        throw new Error(`manifest.skills is not valid at ${root}.`)
      }
      if (!Array.isArray(hosts)) {
        throw new Error(`manifest.hosts is not valid at ${root}.`)
      }
      if (!Array.isArray(permissions)) {
        throw new Error(`manifest.permission is not valid at ${root}.`)
      }

      this.__loadApp(appId, root, manifest, skillIds, hosts, permissions)
    })
}

/**
 * Populates app and its related manifest.
 *
 * @private
 * @param {string} appId -
 * @param {Manifest} menifest -
 * @param {string} appHome -
 * @param {string[]} skillIds -
 * @param {object[]} hosts -
 * @param {string[]} permissions -
 * @returns {void}
 */
AppChargeur.prototype.__loadApp = function __loadApp (appId, appHome, manifest, skillIds, hosts, permissions) {
  manifest = Object.assign({}, manifest, { appHome: appHome })
  this.appManifests[appId] = manifest

  skillIds.forEach(skillId => {
    var skillAttrs
    if (Array.isArray(skillId)) {
      var arr = skillId
      skillId = arr[0]
      skillAttrs = arr[1]
    }
    if (typeof skillId !== 'string') {
      throw new Error(`manifest.skills '${skillId}' by '${appId}' type mismatch, expecting a string.`)
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
  })
  hosts.forEach(host => {
    var name = _.get(host, 'name')
    var skillId = _.get(host, 'skillId')
    if (skillIds.indexOf(skillId) < 0) {
      throw new Error(`manifest.hosts '${skillId}' mapped from '${name}' doesn't owned by ${appId}.`)
    }
    var currSkillId = this.hostSkillIdMap[name]
    if (currSkillId != null) {
      throw new Error(`manifest.hosts '${name}' by '${currSkillId}' exists, declaring by ${appId}.`)
    }
    this.hostSkillIdMap[name] = skillId
  })

  this.runtime.permission.load(appId, permissions)
}
