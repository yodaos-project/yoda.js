var appRuntime = require('../appRuntime');

var app_runtime = new appRuntime(['/opt/test']);

// 模拟的NLP
var response = {
  "id": 1,
  "asr": "今天晚上吃什么",
  "nlp": {
    "cloud": true,
    "intent": "dailyRecommend",
    "slots": {
      "today": {
        "pinyin": "jin1 tian1 wan3 shang5",
        "type": "today",
        "value": "今天晚上"
      },
      "what": {
        "pinyin": "shen2 me5",
        "type": "what",
        "value": "什么"
      },
      "eat": {
        "pinyin": "chi1",
        "type": "eat",
        "value": "吃"
      }
    },
    "pattern": "^($today)($eat)($what)$",
    "asr": "今天晚上吃什么",
    "appId": "R4D8E2A2C8964953B26A94BC827FA25C",
    "appName": "美食天下"
  },
  "action": {
    "version": "2.0.0",
    "startWithActiveWord": false,
    "appId": "R4D8E2A2C8964953B26A94BC827FA25C",
    "session": {
      "attributes": {}
    },
    "response": {
      "action": {
        "version": "2.0.0",
        "type": "NORMAL",
        "form": "cut",
        "shouldEndSession": false,
        "directives": [
          {
            "type": "voice",
            "action": "PLAY",
            "disableEvent": false,
            "item": {
              "itemId": "",
              "tts": "一天到晚就知道吃！"
            }
          }
        ]
      },
      "resType": "INTENT",
      "respId": "22a95912-9ff3-4be2-88e9-92818f802f7e"
    }
  }
};

app_runtime.onEvent('nlp', JSON.stringify(response));