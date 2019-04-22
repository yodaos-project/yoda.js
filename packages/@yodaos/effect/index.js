var effect
Object.defineProperty(module.exports, 'effect', {
  enumerable: true,
  configurable: true,
  get: () => {
    if (effect == null) {
      effect = global[Symbol.for('yoda#api')].effect
    }
    return effect
  }
})
