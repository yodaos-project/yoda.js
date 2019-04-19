var keyboard
Object.defineProperty(module.exports, 'keyboard', {
  enumerable: true,
  configurable: true,
  get: () => {
    if (keyboard == null) {
      keyboard = global[Symbol.for('yoda#api')].keyboard
    }
    return keyboard
  }
})
