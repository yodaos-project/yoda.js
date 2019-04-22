var flora = require('@yoda/flora')

var defaultUrl = 'unix:/var/run/flora.sock'

module.exports.once = once
/**
 *
 * @param {string} name
 * @param {object} [options]
 * @param {string} [options.url='unix:/var/run/flora.sock']
 * @param {number} [options.timeout=15000]
 */
function once (name, options) {
  if (options == null) {
    options = {}
  }
  var url = options.url || defaultUrl
  var timeout = options.timeout || 15000
  var agent = new flora.Agent(url)
  return new Promise((resolve, reject) => {
    var timer = setTimeout(() => {
      agent.close()
      reject(new Error(`flora.once timeount for ${timeout}`))
    }, timeout)
    agent.subscribe(name, msg => {
      clearTimeout(timer)
      agent.close()
      resolve(msg)
    })
    agent.start()
  })
}

module.exports.post = post
/**
 *
 * @param {string} name
 * @param {any[]} msg
 * @param {number} [type]
 * @param {object} [options]
 * @param {string} [options.url='unix:/var/run/flora.sock']
 * @returns {number} status code, 0 if post succeeded.
 */
function post (name, msg, type, options) {
  if (typeof name !== 'string') {
    throw new TypeError('Expect a string on first argument of flora.disposable.post')
  }
  if (!Array.isArray(msg)) {
    throw new TypeError('Expect an array on second argument of flora.disposable.post')
  }
  if (typeof type !== 'number') {
    options = type
    type = flora.MSGTYPE_INSTANT
  }
  if (options == null) {
    options = {}
  }
  var url = options.url || defaultUrl
  var agent = new flora.Agent(url)
  agent.start()

  var ret = agent.post(name, msg, type)
  agent.close()

  return ret
}
