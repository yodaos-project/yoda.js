var fs = require('fs')
var path = require('path')

var nodeRequire = require

var descriptorFiles = fs.readdirSync(path.join(__dirname, '../runtime/lib/descriptor'))
var api = descriptorFiles
  .filter(it => !it.endsWith('descriptor.js'))
  .map(it => ({
    name: path.basename(it, '.js'),
    descriptor: generate(it)
  }))
  .reduce((accu, it) => {
    if (it.name === 'activity') {
      Object.assign(accu, it.descriptor)
      return accu
    }

    accu.namespaces[it.name] = it.descriptor
    return accu
  }, { namespaces: {} })

fs.writeFileSync(path.join(__dirname, '../runtime/client/api/default.json'), JSON.stringify(api, null, 2))

function generate (filename) {
  var module = { exports: {} } //eslint-disable-line
  var require = (id) => {  //eslint-disable-line
    if (id === '@yoda/bolero') {
      return { Descriptor: null }
    }
    if (id === 'logger') {
      return function () {}
    }
    var ret = {}
    try {
      ret = nodeRequire(id)
    } catch (err) {

    }
    return ret
  }
  var file = fs.readFileSync(path.join(__dirname, '../runtime/lib/descriptor', filename))
  var content = file.toString()
  eval(content)  //eslint-disable-line
  return {
    values: module.exports.values,
    events: module.exports.events,
    methods: module.exports.methods
  }
}
