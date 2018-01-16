'use strict';

const VolumeWrap = require('bindings')('volume').VolumeWrap;
const handle = new VolumeWrap();

/**
 * @module volume
 */
module.exports = {
  /**
   * @method get
   */
  get() {
    if (handle.getMute()) {
      return 0;
    } else {
      return handle.get();
    }
  },
  /**
   * @method set
   * @param {Number} vol
   */
  set(vol) {
    return handle.set(vol);
  },
  /**
   * @method mute
   */
  mute() {
    return handle.setMute(true);
  },
  /**
   * @method unmute
   */
  unmute() {
    return handle.setMute(false);
  },
  /**
   * @method toggleMute
   */
  toggleMute() {
    const m = handle.getMute();
    if (m) {
      this.unmute();
    } else {
      this.mute();
    }
  },
  /**
   * @method getByStream
   * @param {String} name - the stream name
   */
  getByStream(name) {
    return handle.getByStream(name);
  },
  /**
   * @method setByStream
   * @param {String} name - the stream name
   * @param {Number} vol - the vol
   */
  setByStream(name, vol) {
    return handle.setByStream(name, vol);
  },
  /**
   * @method volumeUp
   */
  volumeUp() {
    let vol = this.get() + 10;
    this.set(vol > 100 ? 100 : vol);
  },
  /**
   * @method volumeDown
   */
  volumeDown() {
    const vol = this.get() - 10;
    this.set(vol < 0 ? 0 : vol);
  },
  /**
   * @method volumeSet
   * @deprecated
   * @param {Number} vol - the volume
   */
  volumeSet(vol) {
    console.warn('warning: this method is deprecated, please use volume.set()');
    return this.set(vol);
  },
  /**
   * @method volumeGet
   * @deprecated
   */
  volumeGet() {
    console.warn('warning: this method is deprecated, please use volume.get()');
    return this.get();
  }
};
