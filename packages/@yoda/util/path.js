var _ = require('./_')
var join = require('path').join

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
  var scheme = ''
  var path = url
  if (idx >= 0) {
    scheme = url.substr(0, idx)
    path = url.substr(idx + 3)
  }
  var ret
  switch (true) {
    case scheme === 'system': {
      // etc.. system://path/to/sound.ogg
      ret = join(systemPrefix, path)
      break
    }
    case scheme === '':
    case scheme === 'self':
    case allowedScheme.indexOf(scheme) < 0: {
      // etc.. path/to/sound.ogg
      // etc.. self://path/to/sound.ogg
      ret = join(appHome, path)
      break
    }
    default: {
      // etc.. http://url/to/sound.ogg
      ret = url
    }
  }
  return ret
}
