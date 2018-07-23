'use strict';

/**
 * @memberof multimedia
 * @namespace soundplayer
 */

var child_process = require('child_process');
var url = require('url');
var path = require('path');
var PA_HOME_DIR = process.env.PULSEAUDIO_HOME || '/data/pulseaudio';

function defaultCallback(err) {
  if (err) throw err;
}

/**
 * @memberof multimedia.soundplayer
 * @class
 * @param {String} media - the media url to play
 */
function SoundPlayer(media) {
  this._media = media;
  this._subprocess = null;
  this._cmd = '';
}

/**
 * play the sound
 */
SoundPlayer.prototype.play = function play(callback) {
  var meta = url.parse(this._media);
  if (meta.protocol !== null)
    throw new Error('only support for no protocol url');
  if (typeof callback !== 'function')
    callback = defaultCallback;
  
  var extname = path.extname(meta.pathname);
  if (extname === '.wav') {
    this._cmd = `paplay ${meta.pathname}`;
  } else if (['.ogg', '.mp3'].indexOf(extname) >= 0) {
    this._cmd = `ffmpeg -i ${meta.pathname} -acodec pcm_s16le -ar 16000 -f wav - | paplay`;
  } else {
    throw new Error('only support for wav/ogg/mp3 formats');
  }
  this._subprocess = child_process.exec(this._cmd, {
    env: { 'HOME': PA_HOME_DIR },
  }, function ondone(err, stdout, stderr) {
    if (err)
      return callback(new Error(stderr));
    callback(null, stdout);
  });
  return this;
};

/**
 * stop the sound
 */
SoundPlayer.prototype.stop = function stop() {
  if (this._subprocess) {
    this._subprocess.kill(0);
    this._subprocess = null;
  }
  return this;
};

/**
 * Set the global environment
 * @memberof multimedia.soundplayer
 * @function set
 */
function set(name, val) {
  if (name === 'pulseaudio.homedir') {
    PA_HOME_DIR = val;
  } else {
    throw new Error(`unknown property ${name}`);
  }
}

/**
 * @memberof multimedia.soundplayer
 * @function play
 */
function play(media, callback) {
  var splayer = new SoundPlayer(media);
  return splayer.play(callback);
}

exports.set = set;
exports.play = play;

