var _ = require('./_')

module.exports.transformPathScheme = transformPathScheme
/**
 *
 * @private
 * @param {string} url
 * @param {string} systemPrefix
 * @param {string} appHome
 */
function transformPathScheme (url, systemPrefix, appHome, options) {
  var allowedScheme = _.get(options, 'allowedScheme', [])

  var idx = url.indexOf('://')
  var scheme = url.substr(0, idx)
  var path = url.substr(idx + 3)
  var ret
  switch (true) {
    case scheme === 'system': {
      // etc.. system://path/to/sound.ogg
      ret = `${systemPrefix}/${path}`
      break
    }
    case '':
    case scheme === 'self':
    case allowedScheme.indexOf(scheme) < 0: {
      // etc.. path/to/sound.ogg
      // etc.. self://path/to/sound.ogg
      ret = `${appHome}/${path}`
      break
    }
    default: {
      // etc.. http://url/to/sound.ogg
      ret = url
    }
  }
  return ret
}
