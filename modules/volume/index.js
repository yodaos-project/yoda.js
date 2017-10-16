'use strict';

const VolumeWrap = require('bindings')('volume').VolumeWrap;
const volume = new VolumeWrap();
const state = {
  all: volume.getAll(),
  // voice: volume.get('voice'),
  // media: volume.get('media'),
};

function volumeUp() {
  const curr = state.all;
  volume.setAll(curr + 10);
  state.all = curr + 10;
}

function volumeDown() {
  const curr = state.all;
  volume.setAll(curr - 10);
  state.all = curr - 10;
}

function volumeSet(vol) {
  volume.setAll(vol);
  state.all = vol;
}

function volumeGet() {
  return volume.getAll();
}

exports.volumeUp = volumeUp;
exports.volumeDown = volumeDown;
exports.volumeSet = volumeSet;
exports.volumeGet = volumeGet;
