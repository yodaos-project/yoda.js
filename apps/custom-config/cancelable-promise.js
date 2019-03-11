function handleCallback(resolve, reject, callback, r) {
  try {
    resolve(callback(r))
  } catch (e) {
    reject(e)
  }
}

Promise;

class CancelablePromise {
  /**
   *
   * @param {function} fn - promise callback
   * @param {CancelablePromise} prePromise
   */
  constructor (fn, prePromise) {
    if (fn instanceof Promise) {
      this._promise = fn
    } else {
      this._promise = new Promise(fn)
    }
    // if function 'cancel' is called, the flag is true
    this._cancelable = false
    // previous promise in the promise-link
    this._prePromise = prePromise
    // cancel flag
    this._canceled = false
    //magic
    this.then = this.then.bind(this)
  }
  static all(futures) {
    return new CancelablePromise(function (y, n) {
      Promise.all(futures).then(y, n)
    }, null)
  }
  static race(futures) {
    return new CancelablePromise(function (y, n) {
      Promise.race(futures).then(y, n)
    }, null)
  }
  static reject(value) {
    return new CancelablePromise(function (y, n) {
      Promise.reject(value).then(y, n)
    }, this)
  }
  static resolve(value) {
    return new CancelablePromise(function (y, n) {
      Promise.resolve(value).then(y, n)
    }, this)
  }
  static init (promise) {
    if (promise instanceof Promise) {
      return new CancelablePromise(promise)
    }
  }

  then(success, error, abort) {
    var _this = this
    var p = new CancelablePromise(function (resolve, reject) {
      _this._promise.then(function (r) {
        if (abort && _this._canceled) {
          // abort the promise-link
          p.abort()
          handleCallback(resolve, reject, abort, r)
        }
        else if (success && !_this._canceled) {
          handleCallback(resolve, reject, success, r)
        } else {
          resolve(r)
        }
      }, function (r) {
        if (error && !_this._canceled) {
          handleCallback(resolve, reject, error, r)
        }
        else if (_this._canceled) {
          p.abort()
          if (typeof abort === 'function') {
            abort()
          }
          if (p.reject) {
            p.reject(r)
          }
          reject(r)
        }
      })
    }, _this)
    return p
  }

  catch(error) {
    return this.then(undefined, error)
  }

  cancel (aborted) {
    var perPromise = this
    perPromise._cancelable = true
    while(perPromise = perPromise._prePromise) {
      perPromise._cancelable = true
    }
    return this.then(undefined, undefined, aborted)
  }

  /**
   * abort the promise-link
   */
  abort () {
    var p = this
    while(p) {
      if (p._cancelable) {
        p._canceled = true
        if (p._prePromise) {
          p._prePromise.abort()
        }
        break
      } else {
        p = p._prePromise
      }
    }
  }
}

// FIXME: use Symbol on implementation done
var customPromisifySymbol = 'util:cancelablePromisify:custom'
cancelablePromisify.custom = customPromisifySymbol
function cancelablePromisify(original) {
  if (typeof original != 'function') {
    throw new TypeError('expect a function on promisify')
  }
  if (typeof original[customPromisifySymbol] == 'function') {
    return original[customPromisifySymbol]
  }
  return function promisified() {
    var args = Array.prototype.slice.call(arguments, 0)
    return new CancelablePromise((resolve, reject) => {
      args.push(callback)
      original.apply(this, args)

      function callback(err, result) {
        if (err != null) {
          reject(err)
          return;
        }
        resolve(result)
      }
    })
  }
}

module.exports.CancelablePromise = CancelablePromise
module.exports.cancelablePromisify = cancelablePromisify
