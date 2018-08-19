var Service = require('../service');
var Light = require('light');
var MediaPlayer = require('multimedia').MediaPlayer;
var Effects = require('../effects');

console.log(JSON.stringify(Light.getProfile()));

var effect = new Effects(Light, MediaPlayer);

var light = new Service({
  effect: effect
});



light.setStandby();

effect.requestAnimationFrame(() => {
  light.setAwake();
  effect.requestAnimationFrame(() => {
    light.setDegree(120);
    effect.requestAnimationFrame(() => {
      light.setLoading(120);
      effect.requestAnimationFrame(() => {
        light.setVolume(10);
        effect.requestAnimationFrame(() => {
          light.setVolume(20);
          effect.requestAnimationFrame(() => {
            light.setVolume(30);
            effect.requestAnimationFrame(() => {
              light.setWelcome();
            }, 2000);
          }, 1000);
        }, 1000);
      }, 4000);
    }, 2000);
  }, 2000);
}, 4000);
