'use strict';

module.exports = function(runtime) {

  const len = runtime.count;
  const cycle = [];
  let curr = 0;
  let timer = null;

  function initialize() {
    clearInterval(timer);
    timer = null;
  }

  /**
   * @method startRound
   * @param {String} color - the blink color
   */
  runtime.startRound = function(color = 'white') {
    runtime.removeAllLayers();
    initialize();

    // console.log(runtime.layers.map((self) => self.group));
    for (let i = 0; i < len; i++) {
      cycle[i] = runtime.createLayer([i], {
        speed: 1,
        group: 'round',
      });
    }
    timer = setInterval(() => {
      let dot = cycle[curr];
      dot.fade('black', color, 10).then(() => {
        return dot.fade(color, 'black', 10);
      });
      if (curr >= len - 1) {
        curr = 0;
      } else {
        curr += 1;
      }
    }, 50);
  };

  /**
   * @method stopRound
   */
  runtime.stopRound = function() {
    if (cycle.length === 0)
      throw new Error('layers(cycle) is not initialized.');

    let p = Promise.all(cycle.map((self) => self._bus));
    initialize();
    return p;
  };

};