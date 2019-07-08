module.exports = {
  api: Symbol.for('yoda#api'),
  application: Symbol('yoda#application'),
  registry: Symbol('yoda#registry'),
  manifest: Symbol('yoda#manifest'),
  options: Symbol('yoda#options'),
  activeServices: Symbol('yoda#activeServices'),
  finishService: Symbol('yoda#finishService'),
  finalize: Symbol('yoda#finalize'),
  componentName: Symbol('component#name'),
  audioFocus: {
    registry: Symbol('audio-focus#registry'),
    hook: Symbol('audio-focus#hook'),
    state: Symbol('audio-focus#state')
  }
}
