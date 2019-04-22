module.exports.getLoader = function getLoader (appMap) {
  return {
    getTypeOfApp: function getTypeOfApp () {
      return 'ext'
    },
    getAppManifest: function getAppManifest (appId) {
      return appMap[appId]
    }
  }
}
