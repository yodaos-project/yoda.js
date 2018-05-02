'use strict';

const light = require('@rokid/lumen');
light.gradients(['green', 'white']).then(() => {
  return light.gradients(['white', 'honeydew']);
}).then(() => {
  return light.fill('black');
});
