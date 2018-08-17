module.exports = function loading(light, data, callback) {
  var pos = 0;
  if (data.degree) {
    pos = Math.floor((data.degree / 360) * light.ledsConfig.leds);
  }
  var render = function () {
    light.fill(30, 30, 150);
    pos = pos === 11 ? 0 : pos + 1;
    light.pixel(pos, 255, 255, 255);
    light.render();
    light.requestAnimationFrame(() => {
      render();
    }, 60);
  };
  render();
  light.requestAnimationFrame(() => {
    light.stop();
  }, 6000);

  return {
    stop: function () {
      light.stop();
    }
  };
};
