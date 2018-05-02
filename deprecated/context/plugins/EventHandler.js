'use strict';

const EventEmitter = require('events').EventEmitter;
const handler = module.exports = new EventEmitter();

handler.on('init', () => {
  // init
});

handler.on('online', () => {
  // system is online
});

handler.on('offline', () => {
  // system is offline
});

handler.on('voice wakeup', (data) => {
  // 语音唤醒事件
});

handler.on('voice info', (data) => {

});

handler.on('speech', (data) => {
  // 返回实时的语音识别结果，
  // 通过`data.text`获取文本
  // 通过`data.state`获取识别状态：complete, pending
});

handler.on('tts start', (text) => {
  // TTS开始事件，并返回TTS的语句
});

handler.on('tts end', () => {
  // TTS结束事件
});

handler.on('pickup start', (data) => {
  // 拾音开始
});

handler.on('pickup end', (data) => {
  // 拾音结束
});
