'use strict';

module.exports = function(runtime) {

  const len = runtime.count;
  const cycle = [];
  const speed = 20;

  function point(left, right, color) {
    const leftSpot = cycle[left];
    const rightSpot = cycle[right];
    if (left === right) {
      return leftSpot.fade('black', color, speed);
    }

    return Promise.all([
      leftSpot.fade('black', color, speed).then(() => {
        leftSpot.fade(color, 'black', speed);
      }),
      rightSpot.fade('black', color, speed).then(() => {
        rightSpot.fade(color, 'black', speed);
      }),
    ]).then(() => {
      return point(
        correct(left + 1),
        correct(right - 1),
        color
      );
    });
  }

  function correct(pos) {
    let index = pos % len;
    return index < 0 ? index + len : index;
  }

  /**
   * @method startRound
   * @param {String} color - the blink color
   */
  runtime.point = function(angle, color = 'white') {
    runtime.removeAllLayers();

    for (let i = 0; i < len; i++) {
      cycle[i] = runtime.createLayer([i], {
        group: 'point',
        speed: 10,
      });
    }
    const pos = Math.floor(angle / (360 / len));
    let left = correct(pos - 5);
    let right = correct(pos + 5);
    return point(left, right, color);
  };

};