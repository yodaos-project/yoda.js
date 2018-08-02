var Service = require('../service');
var Light = require('/opt/packages/light');
var soundplayer = require('/opt/packages/multimedia').MediaPlayer;

console.log(JSON.stringify(Light.getProfile()));

var light = new Service({
  light: Light,
  soundplayer: soundplayer
});

light.setAwake();

// setTimeout(() => {
//   // light.setDegree(120);
//   light.fill(0);
//   light.pixel(3, 255, 255, 255, true);
//   light.render(light.buffer);
// }, 1000);

setTimeout(() => {
  light.setDegree(120);
  setTimeout(() => {
    light.setLoading();
    setTimeout(() => {
      light.setHide();
    }, 3000);
  }, 1000);
}, 1000);