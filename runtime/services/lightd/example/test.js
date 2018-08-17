var Service = require('../service');
var Light = require('light');
var MediaPlayer = require('multimedia').MediaPlayer;
var Effects = require('../effects');

console.log(JSON.stringify(Light.getProfile()));

var effect = new Effects(Light, MediaPlayer);

var light = new Service({
  effect: effect
});

// light.setAwake();

// setTimeout(() => {
//   // light.setDegree(120);
//   light.fill(0);
//   light.pixel(3, 255, 255, 255, true);
//   light.render(light.buffer);
// }, 1000);

// setTimeout(() => {
//   light.setDegree(120);
//   setTimeout(() => {
//     light.setLoading();
//     setTimeout(() => {
//       light.setHide();
//     }, 3000);
//   }, 1000);
// }, 1000);

light.setStandby();

effect.requestAnimationFrame(() => {
  light.setAwake();
  effect.requestAnimationFrame(() => {
    light.setDegree(120);
    effect.requestAnimationFrame(() => {
      light.setLoading(120);
    }, 2000);
  }, 2000);
}, 4000);
// setTimeout(() => {
//   light.setConfigFree();
// }, 6000);
// light.breathing(0, 255, 120, 0, 1400, 20,() => {
//   console.log('complete');
// });