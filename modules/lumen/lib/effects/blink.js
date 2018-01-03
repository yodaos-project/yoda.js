'use strict';

module.exports = function(runtime) {
  let layer = null;
  let timer = null;
  let shouldStop = false;

  function blink(layer, color, direction) {
    let p = direction ? layer.fade(color, 'black') : layer.fade('black', color);
    return p.then(() => {
      if (shouldStop)
        return;
      return blink(layer, color, !direction);
    });
  }

  /**
   * @method startBlink
   * @param {String} color - the blink color
   * @param {Number} speed - the speed
   */
  runtime.startBlink = function(color = 'white', speed = 5) {
    runtime.removeAllLayers();
    layer = runtime.createLayer('*', { speed, group: 'blink' });
    return blink(layer, color, true);
  };

  /**
   * @method stopBlink
   */
  runtime.stopBlink = function() {
    if (!layer)
      throw new Error('layer is not initialized.');
    shouldStop = true;
    return layer._bus;
  };

};