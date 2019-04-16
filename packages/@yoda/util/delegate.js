function Delegator (proto, target) {
  if (!(this instanceof Delegator)) {
    return new Delegator(proto, target)
  }
  this.proto = proto
  this.target = target
}

Delegator.prototype.method = function method (name) {
  var proto = this.proto
  var target = this.target

  proto[name] = function delegation () {
    return this[target][name].apply(this[target], arguments)
  }

  return this
}

Delegator.prototype.getter = function getter (name) {
  var proto = this.proto
  var target = this.target

  Object.defineProperty(proto, name, {
    enumerable: true,
    configurable: true,
    get: function getter () {
      return this[target][name]
    }
  })

  return this
}

module.exports = Delegator
