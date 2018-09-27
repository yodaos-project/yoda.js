'use strict'

var test = require('tape')
var MockDirective = require('./mock-directive')
var Skill = require('/opt/apps/cloudappclient/skill')

var exe = new MockDirective()
var mockNlp = ''
var mockAction = {
  'version': '2.0.0',
  'startWithActiveWord': false,
  'appId': 'E33FCE60E7294A61B84C43C1A171DFD8',
  'response': {
    'action': {
      'version': '2.0.0',
      'type': 'NORMAL',
      'form': 'scene',
      'shouldEndSession': false,
      'directives': []
    },
    'resType': 'EVENT',
    'respId': '0cd5d57f00a386fe0cfb4a0d345405b3'
  }

}

test('skill test, directives is []', t => {
  var skill = new Skill(exe, mockNlp, mockAction)
  var action = JSON.parse(JSON.stringify(mockAction))
  action.response.action.directives = []
  var result = skill.onrequest(action)
  t.equal(result, undefined)
  t.end()
})

test('skill test, directives is undefined', t => {
  var skill = new Skill(exe, mockNlp, mockAction)
  var action = JSON.parse(JSON.stringify(mockAction))
  action.response.action.directives = undefined
  var result = skill.onrequest(action)
  t.equal(result, undefined)
  t.end()
})

test('skill test, paused is true, translate tts', t => {
  var skill = new Skill(exe, mockNlp, mockAction)
  var action = JSON.parse(JSON.stringify(mockAction))
  var tts = {
    'type': 'voice',
    'action': 'PLAY',
    'disableEvent': false,
    'item': {
      'itemId': 'cas:stroy:voice:finished:4D6D76CA4F8B49D6BA8AD227B385EDDB:0602041822000129:243bd2cd063bd45715b817097ad86661:$$play_random$$2$$0$$$$5653688dc85845b89d0d53df79fdf6d4$$b00378b738164c3090fca82a145e548a$$42',
      'tts': '好的，宝儿的故事很好听，我们来听听看。'
    }
  }
  skill.paused = true
  tts.action = 'PLAY'
  action.response.action.directives.push(tts)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'tts', 'type is tts')
  t.equal(skill.directives[0].action, 'say', 'action is say')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, tts)
  tts.action = 'STOP'
  action.response.action.directives.pop()
  action.response.action.directives.push(tts)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'tts', 'type is tts')
  t.equal(skill.directives[0].action, 'cancel', 'action is cancel')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, tts)
  t.end()
})

test('skill test, paused is true, translate media', t => {
  var skill = new Skill(exe, mockNlp, mockAction)
  var action = JSON.parse(JSON.stringify(mockAction))
  var media = {
    'type': 'media',
    'action': 'PLAY',
    'disableEvent': false,
    'item': {
      'itemId': 'play_random$$BD$$T10038971967',
      'type': 'AUDIO',
      'url': 'http://audio01.dmhmusic.com/129_44_T10038971967_128_4_1_0_sdk-cpm/0209/M00/11/ED/ChR461n1cLiAaLTFAEFTQkpATjw594.mp3?xcode=197f221e2747873633c9ecfdcc61bd3d4d74992',
      'offsetInMilliseconds': 0
    }
  }
  skill.paused = true
  // test play
  media.action = 'PLAY'
  action.response.action.directives.push(media)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'media', 'type is media')
  t.equal(skill.directives[0].action, 'play', 'action is play')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, media)
  // test stop
  media.action = 'STOP'
  action.response.action.directives.pop()
  action.response.action.directives.push(media)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'media', 'type is media')
  t.equal(skill.directives[0].action, 'stop', 'action is stop')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, media)
  // test resume
  media.action = 'RESUME'
  action.response.action.directives.pop()
  action.response.action.directives.push(media)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'media', 'type is media')
  t.equal(skill.directives[0].action, 'resume', 'action is resume')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, media)
  // test resume
  media.action = 'PAUSE'
  action.response.action.directives.pop()
  action.response.action.directives.push(media)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'media', 'type is media')
  t.equal(skill.directives[0].action, 'pause', 'action is pause')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, media)
  t.end()
})

test('skill test, paused is true, translate confirm/pickup/native', t => {
  var skill = new Skill(exe, mockNlp, mockAction)
  var action = JSON.parse(JSON.stringify(mockAction))
  var confirm = {
    'type': 'confirm',
    'confirmIntent': 'common',
    'confirmSlot': 'any',
    'optionWords': [],
    'retryTts': ''
  }
  skill.paused = true
  action.response.action.directives.push(confirm)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'confirm', 'type is confirm')
  t.equal(skill.directives[0].action, '')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, confirm)

  confirm.type = 'pickup'
  action.response.action.directives.pop()
  action.response.action.directives.push(confirm)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'pickup', 'type is pickup')
  t.equal(skill.directives[0].action, '')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, confirm)

  confirm.type = 'native'
  action.response.action.directives.pop()
  action.response.action.directives.push(confirm)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'native', 'type is native')
  t.equal(skill.directives[0].action, '')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, confirm)
  t.end()
})

test('skill test, paused is true, translate all', t => {
  var skill = new Skill(exe, mockNlp, mockAction)
  var action = JSON.parse(JSON.stringify(mockAction))
  var tts = {
    'type': 'voice',
    'action': 'PLAY',
    'disableEvent': false,
    'item': {
      'itemId': 'cas:stroy:voice:finished:4D6D76CA4F8B49D6BA8AD227B385EDDB:0602041822000129:243bd2cd063bd45715b817097ad86661:$$play_random$$2$$0$$$$5653688dc85845b89d0d53df79fdf6d4$$b00378b738164c3090fca82a145e548a$$42',
      'tts': '好的，宝儿的故事很好听，我们来听听看。'
    }
  }
  var media = {
    'type': 'media',
    'action': 'PLAY',
    'disableEvent': false,
    'item': {
      'itemId': 'play_random$$BD$$T10038971967',
      'type': 'AUDIO',
      'url': 'http://audio01.dmhmusic.com/129_44_T10038971967_128_4_1_0_sdk-cpm/0209/M00/11/ED/ChR461n1cLiAaLTFAEFTQkpATjw594.mp3?xcode=197f221e2747873633c9ecfdcc61bd3d4d74992',
      'offsetInMilliseconds': 0
    }
  }
  var confirm = {
    'type': 'confirm',
    'confirmIntent': 'common',
    'confirmSlot': 'any',
    'optionWords': [],
    'retryTts': ''
  }
  skill.paused = true
  action.response.action.directives.push(tts)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'tts', 'type is tts')
  t.equal(skill.directives[0].action, 'say')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, tts)

  action.response.action.directives.push(media)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'tts', 'type is tts')
  t.equal(skill.directives[0].action, 'say')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, tts)
  t.equal(skill.directives[1].type, 'media', 'type is media')
  t.equal(skill.directives[1].action, 'play')
  t.equal(skill.directives[1].data.appId, action.appId)
  t.deepEquals(skill.directives[1].data, media)

  action.response.action.directives.push(confirm)
  skill.onrequest(action)
  t.equal(skill.directives[0].type, 'tts', 'type is tts')
  t.equal(skill.directives[0].action, 'say')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, tts)
  t.equal(skill.directives[1].type, 'media', 'type is media')
  t.equal(skill.directives[1].action, 'play')
  t.equal(skill.directives[1].data.appId, action.appId)
  t.deepEquals(skill.directives[1].data, media)
  t.equal(skill.directives[2].type, 'confirm', 'type is confirm')
  t.equal(skill.directives[2].action, '')
  t.equal(skill.directives[2].data.appId, action.appId)
  t.deepEquals(skill.directives[2].data, confirm)

  t.end()
})

test('skill test, paused is true, translate append = true', t => {
  var skill = new Skill(exe, mockNlp, mockAction)
  var action = JSON.parse(JSON.stringify(mockAction))
  var tts = {
    'type': 'voice',
    'action': 'PLAY',
    'disableEvent': false,
    'item': {
      'itemId': 'cas:stroy:voice:finished:4D6D76CA4F8B49D6BA8AD227B385EDDB:0602041822000129:243bd2cd063bd45715b817097ad86661:$$play_random$$2$$0$$$$5653688dc85845b89d0d53df79fdf6d4$$b00378b738164c3090fca82a145e548a$$42',
      'tts': '好的，宝儿的故事很好听，我们来听听看。'
    }
  }
  var media = {
    'type': 'media',
    'action': 'PLAY',
    'disableEvent': false,
    'item': {
      'itemId': 'play_random$$BD$$T10038971967',
      'type': 'AUDIO',
      'url': 'http://audio01.dmhmusic.com/129_44_T10038971967_128_4_1_0_sdk-cpm/0209/M00/11/ED/ChR461n1cLiAaLTFAEFTQkpATjw594.mp3?xcode=197f221e2747873633c9ecfdcc61bd3d4d74992',
      'offsetInMilliseconds': 0
    }
  }
  var confirm = {
    'type': 'confirm',
    'confirmIntent': 'common',
    'confirmSlot': 'any',
    'optionWords': [],
    'retryTts': ''
  }
  skill.paused = true
  action.response.action.directives.push(tts)
  skill.onrequest(action, true)
  t.equal(skill.directives[0].type, 'tts', 'type is tts')
  t.equal(skill.directives[0].action, 'say')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, tts)

  action.response.action.directives.pop()
  action.response.action.directives.push(media)
  skill.onrequest(action, true)
  t.equal(skill.directives[0].type, 'tts', 'type is tts')
  t.equal(skill.directives[0].action, 'say')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, tts)
  t.equal(skill.directives[1].type, 'media', 'type is media')
  t.equal(skill.directives[1].action, 'play')
  t.equal(skill.directives[1].data.appId, action.appId)
  t.deepEquals(skill.directives[1].data, media)

  action.response.action.directives.pop()
  action.response.action.directives.push(confirm)
  skill.onrequest(action, true)
  t.equal(skill.directives[0].type, 'tts', 'type is tts')
  t.equal(skill.directives[0].action, 'say')
  t.equal(skill.directives[0].data.appId, action.appId)
  t.deepEquals(skill.directives[0].data, tts)
  t.equal(skill.directives[1].type, 'media', 'type is media')
  t.equal(skill.directives[1].action, 'play')
  t.equal(skill.directives[1].data.appId, action.appId)
  t.deepEquals(skill.directives[1].data, media)
  t.equal(skill.directives[2].type, 'confirm', 'type is confirm')
  t.equal(skill.directives[2].action, '')
  t.equal(skill.directives[2].data.appId, action.appId)
  t.deepEquals(skill.directives[2].data, confirm)

  t.end()
})
