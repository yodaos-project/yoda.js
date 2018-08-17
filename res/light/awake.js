module.exports = function awake(light, data, callback) {
  var end = false;
  light.transition({r: 0, g: 0, b: 0}, {r: 0, g: 0, b: 150}, 130, 4, () => {
    light.requestAnimationFrame(() => {
      light.transition({r: 0, g: 0, b: 150}, {r: 0, g: 0, b: 0}, 130, 4, () => {
        end = true;
      });
    }, 6000);
  });
  return {
    setDegree: function (degree) {
      if (!end) {
        light.wakeupSound();
        var pos = Math.floor((degree / 360) * light.ledsConfig.leds);
        light.pixel(pos, 255, 255, 255);
        light.render();
      }
    },
    stop: function (keep) {
      light.stop(keep);
    }
  }
};
