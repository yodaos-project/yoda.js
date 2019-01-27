module.exports = deprecate
function deprecate (fn, msg) {
  return function () {
    console.warn('DeprecationWarning:', msg)
    return fn.apply(this, arguments)
  }
}
