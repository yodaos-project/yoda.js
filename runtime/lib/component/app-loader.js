
var fs = require('fs')
var promisify = require('util').promisify

var logger = require('logger')('app-loader')
var _ = require('@yoda/util')._
var AppExecutor = require('../app/executor')

var readdirAsync = promisify(fs.readdir)
var readFileAsync = promisify(fs.readFile)
var statAsync = promisify(fs.stat)

module.exports = AppChargeur
/**
 * Loads apps metadata and populates executors for apps.
 *
 * @param {AppRuntime} runtime
 */
function AppChargeur (runtime) {
  this.runtime = runtime

  this.skillIdAppIdMap = {}
  this.hostSkillIdMap = {}
  this.executors = {}
}

AppChargeur.prototype.getAppIds = function getAppIds () {
  return Object.keys(this.executors)
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
 * Directly set an executor for appId and populate its skills and permissions.
 *
 * @param {string} appId
 * @param {AppExecutor} executor
 * @param {object} metadata
 * @param {string[]} [metadata.skills]
 * @param {string[]} [metadata.permission]
 * @param {string[]} [metadata.hosts]
 * @returns {void}
 */
AppChargeur.prototype.setExecutorForAppId = function setExecutorForAppId (appId, executor, metadata) {
  var skillIds = _.get(metadata, 'skills', [])
  var permissions = _.get(metadata, 'permission', [])
  var hosts = _.get(metadata, 'hosts', [])

  if (typeof appId !== 'string' || !appId) {
    throw new Error(`AppId is not valid at ${appId}.`)
  }
  if (this.executors[appId] != null) {
    throw new Error(`AppId exists at ${appId}.`)
  }
  if (!Array.isArray(skillIds)) {
    throw new Error(`metadata.skills is not valid at ${appId}.`)
  }
  if (!Array.isArray(hosts)) {
    throw new Error(`metadata.hosts is not valid at ${appId}.`)
  }
  if (!Array.isArray(permissions)) {
    throw new Error(`metadata.permission is not valid at ${appId}.`)
  }

  this.__loadApp(appId, executor, skillIds, hosts, permissions)
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
      var skillIds = _.get(pkgInfo, 'metadata.skills', [])
      var hosts = _.get(pkgInfo, 'metadata.hosts', [])
      var permissions = _.get(pkgInfo, 'metadata.permission', [])
      if (typeof appId !== 'string' || !appId) {
        throw new Error(`AppId is not valid at ${root}.`)
      }
      if (this.executors[appId] != null) {
        throw new Error(`AppId exists at ${root}.`)
      }
      if (!Array.isArray(skillIds)) {
        throw new Error(`metadata.skills is not valid at ${root}.`)
      }
      if (!Array.isArray(hosts)) {
        throw new Error(`metadata.hosts is not valid at ${root}.`)
      }
      if (!Array.isArray(permissions)) {
        throw new Error(`metadata.permission is not valid at ${root}.`)
      }

      var executor = new AppExecutor(pkgInfo, root, appId, this.runtime)
      this.__loadApp(appId, executor, skillIds, hosts, permissions)
    })
}

/**
 * Populates app and its related metadata.
 *
 * @private
 * @param {string} appId -
 * @param {AppExecutor} executor -
 * @param {string[]} skillIds -
 * @param {object[]} hosts -
 * @param {string[]} permissions -
 * @returns {void}
 */
AppChargeur.prototype.__loadApp = function __loadApp (appId, executor, skillIds, hosts, permissions) {
  this.executors[appId] = executor

  skillIds.forEach(skillId => {
    var currAppId = this.skillIdAppIdMap[skillId]
    if (currAppId != null) {
      throw new Error(`metadata.skills '${skillId}' by '${currAppId}' exists, declaring by ${appId}.`)
    }
    this.skillIdAppIdMap[skillId] = appId
  })
  hosts.forEach(host => {
    var name = _.get(host, 'name')
    var skillId = _.get(host, 'skillId')
    if (skillIds.indexOf(skillId) < 0) {
      throw new Error(`metadata.hosts '${skillId}' mapped from '${name}' doesn't owned by ${appId}.`)
    }
    var currSkillId = this.hostSkillIdMap[name]
    if (currSkillId != null) {
      throw new Error(`metadata.hosts '${name}' by '${currSkillId}' exists, declaring by ${appId}.`)
    }
    this.hostSkillIdMap[name] = skillId
  })

  this.runtime.permission.load(appId, permissions)
}
