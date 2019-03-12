'use strict'

var test = require('tape')
var logger = require('logger')('flora-test')
var flora = require('@yoda/flora')
var Agent = flora.Agent
var agentOptions = { reconnInterval: 10000, bufsize: 0 }
// var errUri = 'unix:/data/flora-error'
var okUri = 'unix:/var/run/flora.sock'
var crypto = require('crypto')

test('module->flora->persist msg', t => {
  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `persist msg test one[${msgId}]`
  recvClient.subscribe(msgName, (msg, type) => {
    t.equal(type, flora.MSGTYPE_PERSIST, `recv post type: ${type}`)
    t.equal(msg[0], int32, `recv post msg[0] ${msg[0]}`)
    t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
    t.equal(msg[2], hello, `recv post msg[2] ${msg[2]}`)
    recvClient.close()
    t.end()
  })
  recvClient.start()
  var postClient = new Agent(okUri, agentOptions)
  postClient.start()
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_PERSIST)
  postClient.close()
})

test('module->flora->persist msg: subscribe first and then send, get twice msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `persist msg test two[${msgId}]`
  var count = 0
  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    count++
    logger.info(count)
    t.equal(type, flora.MSGTYPE_PERSIST, `recv post type: ${type}`)
    if (count === 1) {
      t.equal(msg[0], int32, `recv post msg[0] ${msg[0]}`)
      t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
      t.equal(msg[2], hello, `recv post msg[2] ${msg[2]}`)
    }
    if (count === 2) {
      t.equal(msg[0], hello, `recv post msg[0] ${msg[0]}`)
      t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
      t.equal(msg[2], int32, `recv post msg[2] ${msg[2]}`)
      recvClient.close()
      t.end()
    }
  })
  recvClient.start()
  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  // first post
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_PERSIST)
  // second post
  postClient.post(msgName, [ hello, int64, int32 ], flora.MSGTYPE_PERSIST)
  postClient.close()
})

test('module->flora->persist msg: send first and then subscribe, get the last msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `persist msg test two[${msgId}]`

  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  // first post
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_PERSIST)
  // second post
  postClient.post(msgName, [ hello, int64, int32 ], flora.MSGTYPE_PERSIST)
  postClient.close()

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    t.equal(type, flora.MSGTYPE_PERSIST, `recv post type: ${type}`)
    t.equal(msg[0], hello, `recv post msg[0] ${msg[0]}`)
    t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
    t.equal(msg[2], int32, `recv post msg[2] ${msg[2]}`)
    recvClient.close()
    t.end()
  })
  recvClient.start()
})

test('module->flora->instant msg: send first and then subscribe, get nothing', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `persist msg test two[${msgId}]`

  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_INSTANT)

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    t.fail('should not recv msg')
  })
  recvClient.start()
  setTimeout(() => {
    recvClient.close()
    postClient.close()
    t.end()
  }, 2000)
})

test('module->flora->instant msg: subscribe first and then send, get msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    t.equal(type, flora.MSGTYPE_INSTANT, `recv post type: ${type}`)
    logger.info(msg)
    t.equal(msg[0], int32, `recv post msg[0] ${msg[0]}`)
    t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
    t.equal(msg[2], hello, `recv post msg[2] ${msg[2]}`)
    recvClient.close()
    t.end()
  })
  recvClient.start()

  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_INSTANT)
  postClient.close()
})

test('module->flora->instant msg: subscribe first and then send twice, get twice msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`
  var count = 0

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    count++
    t.equal(type, flora.MSGTYPE_INSTANT, `recv post type: ${type}`)
    if (count === 1) {
      t.equal(msg[0], int32, `recv post msg[0] ${msg[0]}`)
      t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
      t.equal(msg[2], hello, `recv post msg[2] ${msg[2]}`)
    }
    if (count === 2) {
      t.equal(msg[0], hello, `recv post msg[0] ${msg[0]}`)
      t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
      t.equal(msg[2], int32, `recv post msg[2] ${msg[2]}`)
      recvClient.close()
      t.end()
    }
  })
  recvClient.start()

  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_INSTANT)
  postClient.post(msgName, [ hello, int64, int32 ], flora.MSGTYPE_INSTANT)
  postClient.close()
})

test('module->flora->Caps: post/recv nesting array message', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `write method test[${msgId}]`
  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  var msg = [ [ 'this is subcaps' ],
    'this is a string msg', 2222, 2.3302,
    -11, [ 1, 2, 3 ] ]
  // TODO: this type have a problem
  // var x = new Uint8Array([21, 31]);
  // caps.write(x)
  // TODO: error
  // caps.write(caps)
  postClient.post(msgName, msg, flora.MSGTYPE_PERSIST)

  var recvClient = new Agent(okUri, agentOptions)
  recvClient.subscribe(msgName, (msg, type) => {
    t.equal(type, flora.MSGTYPE_PERSIST, `recv post type: ${type}`)
    logger.info(msg)
    logger.info(msg[0])
    logger.info(msg[0][0])
    logger.info(msg[0][1])
    logger.info(msg[1])
    t.ok(Array.isArray(msg[0]))
    t.ok(Array.isArray(msg[5]))
    t.equal(msg[0][1], undefined)
    t.equal(msg[0][0], 'this is subcaps')
    t.equal(msg[1], 'this is a string msg')
    recvClient.close()
    postClient.close()
    t.end()
  })
  recvClient.start()
})

test('module->flora->Caps: post numbers', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `write method test[${msgId}]`
  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  var msg = [
    2147483646,
    2147483647,
    2147483648,
    -2147483647,
    -2147483648,
    -2147483649,
    2.6302,
    -2.3302,

    1214748364444,
    -92233720368547,
    2.302,
    -2.602,

    121474833,
    -922330,
    2.3,
    -2.7,

    1214748364444,
    -9223372547,
    2.3302,
    -2.6602
  ]
  postClient.post(msgName, msg, flora.MSGTYPE_PERSIST)

  var recvClient = new Agent(okUri, agentOptions)
  recvClient.subscribe(msgName, (msg, type) => {
    t.equal(type, flora.MSGTYPE_PERSIST, `recv post type: ${type}`)
    logger.info(msg)
    t.equal(typeof msg[0], 'number')
    t.equal(msg[0], 2147483646, `msg[0]`)
    t.equal(msg[1], 2147483647, `msg[1]`)
    t.equal(msg[2], 2147483648, `msg[2]`)
    t.equal(msg[3], -2147483647, `msg[3]`)
    t.equal(msg[4], -2147483648, `msg[4]`)
    t.equal(msg[5], -2147483649, `msg[5]`)
    t.equal(msg[6], 2.6302, `msg[6]`)
    t.equal(msg[7], -2.3302, `msg[7]`)
    t.equal(msg[8], 1214748364444, `msg[8]`)
    t.equal(msg[9], -92233720368547, `msg[9]`)
    t.equal(msg[10], 2.302, `msg[10]`)
    t.equal(msg[11], -2.602, `msg[11]`)
    t.equal(msg[12], 121474833, `msg[12]`)
    t.equal(msg[13], -922330, `msg[13]`)
    t.equal(msg[14], 2.3, `msg[14]`)
    t.equal(msg[15], -2.7, `msg[15]`)
    t.equal(msg[16], 1214748364444, `msg[16]`)
    t.equal(msg[17], -9223372547, `msg[17]`)
    t.equal(msg[18], 2.3302, `msg[18]`)
    t.equal(msg[19], -2.6602, `msg[19]`)
    recvClient.close()
    postClient.close()
    t.end()
  })
  recvClient.start()
})

//
// bug id = 1363
//
test('module->flora->connect buffer, default 0', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `msg buffer test[${msgId}]`

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    t.equal(type, flora.MSGTYPE_PERSIST, `recv post type: ${type}`)
    console.log(msg[0].length)
    recvClient.close()
    t.end()
  })
  recvClient.start()

  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  var length = 32693 // TODO: err 目前最大支持32693
  var hello = Buffer.alloc(length, 0x74, 'utf8')
  console.log(hello.length)
  postClient.post(msgName, [ hello.toString('utf8') ], flora.MSGTYPE_PERSIST)
  postClient.close()
})

//
// bug id = 1363
//
test('module->flora->connect buffer, set value', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `msg buffer test[${msgId}]`

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    t.equal(type, flora.MSGTYPE_PERSIST, `recv post type: ${type}`)
    console.log(msg[0].length)
    recvClient.close()
    t.end()
  })
  recvClient.start()

  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  var length = 32693
  var hello = Buffer.alloc(length, 0x74, 'utf8')
  console.log(hello.length)
  postClient.post(msgName, [ hello.toString('utf8') ], flora.MSGTYPE_PERSIST)
  postClient.close()
})

test('module->flora->client: instant msg, unsubscribe msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`
  var count = 0

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    count++
    t.equal(type, flora.MSGTYPE_INSTANT, `recv post type: ${type}`)
    t.equal(msg[0], int32, `recv post msg[0] ${msg[0]}`)
    t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
    t.equal(msg[2], hello, `recv post msg[2] ${msg[2]}`)
  })
  recvClient.start()

  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_INSTANT)

  setTimeout(() => {
    recvClient.unsubscribe(msgName)
    postClient.post(msgName, [ hello, int32, int64 ], flora.MSGTYPE_INSTANT)
    postClient.close()
  }, 500)

  setTimeout(() => {
    t.equal(count, 1)
    recvClient.close()
    t.end()
  }, 2000)
})

test('module->flora->client: persist msg, subscribe->send->unsubscribe->send', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`
  var count = 0

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    count++
    t.equal(type, flora.MSGTYPE_PERSIST, `recv post type: ${type}`)
    t.equal(msg[0], int32, `recv post msg[0] ${msg[0]}`)
    t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
    t.equal(msg[2], hello, `recv post msg[2] ${msg[2]}`)
  })
  recvClient.start()

  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_PERSIST)

  setTimeout(() => {
    recvClient.unsubscribe(msgName)
    postClient.post(msgName, [ hello, int32, int64 ], flora.MSGTYPE_PERSIST)
    postClient.close()
  }, 500)

  setTimeout(() => {
    t.equal(count, 1)
    recvClient.close()
    t.end()
  }, 2000)
})

test('module->flora->client: persist msg, send->subscribe->unsubscribe->send', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora 😄'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`
  var count = 0

  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_PERSIST)

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    count++
    t.equal(type, flora.MSGTYPE_PERSIST, `recv post type: ${type}`)
    t.equal(msg[0], int32, `recv post msg[0] ${msg[0]}`)
    t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
    t.equal(msg[2], hello, `recv post msg[2] ${msg[2]}`)
  })
  recvClient.start()

  setTimeout(() => {
    recvClient.unsubscribe(msgName)
    postClient.post(msgName, [ hello, int32, int64 ], flora.MSGTYPE_PERSIST)
    postClient.close()
    setTimeout(() => {
      t.equal(count, 1)
      recvClient.close()
      t.end()
    }, 2000)
  }, 1000)
})

test('module->flora->client: close recv', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `close test[${msgId}]`
  var count = 0

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    count++
    t.equal(type, flora.MSGTYPE_INSTANT, `recv post type: ${type}`)
    t.equal(msg[0], int32, `recv post msg[0] ${msg[0]}`)
    t.equal(msg[1], int64, `recv post msg[1] ${msg[1]}`)
    t.equal(msg[2], hello, `recv post msg[2] ${msg[2]}`)
    recvClient.close()
    postClient.post(msgName, [ hello, int32, int64 ], flora.MSGTYPE_INSTANT)
    postClient.close()
    setTimeout(() => {
      t.equal(count, 1)
      t.end()
    }, 1000)
  })
  recvClient.start()
  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_INSTANT)
})

test('module->flora->client: close post', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `close test[${msgId}]`

  var recvClient = new Agent(okUri, agentOptions)
  t.equal(typeof recvClient, 'object')
  recvClient.subscribe(msgName, (msg, type) => {
    t.fail('should not recv msg')
  })
  recvClient.start()
  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  postClient.close()
  postClient.post(msgName, [ int32, int64, hello ], flora.MSGTYPE_INSTANT)
  setTimeout(() => {
    recvClient.close()
    t.end()
  }, 2000)
})

//
// bug id = 1364
//
test('module->flora->client: loop create connection', { timeout: 10 * 1000 }, t => {
  var clients = []
  for (var count = 0; count < 20; count++) {
    clients[count] = new Agent(okUri, agentOptions)
    t.equal(typeof clients[count], 'object')
  }

  var ci = 0
  var th = setInterval(() => {
    clients[ci++].close()
    if (ci >= 20) {
      clearInterval(th)
    }
  }, 5)

  setTimeout(() => {
    t.end()
  }, 2000)
})

test('module->flora->client: loop post msg', { timeout: 10 * 1000 }, t => {
  var recvClient = new Agent(okUri, agentOptions)
  var count = 0
  for (var i = 0; i < 100; i++) {
    recvClient.subscribe(`id=${i}`, (msg, type) => {
      t.equal(msg[0], `hello${count}`, `value is hello${count}`)
      count++
    })
  }
  recvClient.start()
  var postClient = new Agent(okUri, agentOptions)
  t.equal(typeof postClient, 'object')
  postClient.start()
  for (var j = 0; j < 100; j++) {
    logger.info(`i=${j}`)
    postClient.post(`id=${j}`, [ `hello${j}` ], flora.MSGTYPE_INSTANT)
  }
  setTimeout(() => {
    t.equal(count, 100)
    recvClient.close()
    postClient.close()
    t.end()
  }, 3000)
})

test('module->flora->client: duplicate client id', { timeout: 10 * 1000 }, t => {
  var okAgent = new Agent(okUri + '#foo', agentOptions)
  var failAgent = new Agent(okUri + '#foo')

  okAgent.start()
  setTimeout(() => {
    failAgent.start()
  }, 100)

  var msgName = 'test-dup-cli-id'
  var msg = [ 'hello' ]
  var count = 5
  var timerId = setInterval(() => {
    var r
    if (count > 0) {
      r = okAgent.post(msgName, msg)
      t.equal(r, 0)
      r = failAgent.post(msgName, msg)
      t.equal(r, flora.ERROR_NOT_CONNECTED)
      --count
    } else {
      clearInterval(timerId)
      okAgent.close()
      failAgent.close()
      t.end()
    }
  }, 1000)
})

test('module->flora->client: rpc call self', { timeout: 10 * 1000 }, t => {
  var clientId = 'remoteMethodHolder'
  var agent = new Agent(okUri + '#' + clientId, agentOptions)
  var recvCount = 0
  var methodName = 'foo'
  agent.declareMethod(methodName, (msg, reply) => {
    ++recvCount
    reply.end(0, [ recvCount ])
  })
  agent.start()

  var sendCount = 0
  var retCount = 0
  var timerId = setInterval(() => {
    ++sendCount
    if (sendCount <= 3) {
      agent.call(methodName, null, clientId).then((reply) => {
        t.equal(typeof reply, 'object')
        if (typeof reply === 'object') {
          t.equal(reply.retCode, 0)
          t.equal(typeof reply.msg, 'object')
          if (typeof reply.msg === 'object') {
            t.equal(typeof reply.msg[0], 'number')
          }
        }
        ++retCount
        console.log('recv remote method return', reply)
      }, (err) => {
        t.fail('remote method call failed: ' + err)
      })
    } else {
      --sendCount
      clearInterval(timerId)
    }
  }, 100)

  setTimeout(() => {
    t.equal(sendCount, 3)
    t.equal(recvCount, 3)
    t.equal(retCount, 3)
    agent.close()
    t.end()
  }, 3000)
})

test('module->flora->client: rpc call target', { timeout: 10 * 1000 }, t => {
  var clientIds = [ 'testAgent1', 'testAgent2', 'testAgent3' ]
  var methodName = 'foo'
  var agentInfo = []
  var retCount = 0

  agentInfo.push({ id: clientIds[0], agent: new Agent(okUri + '#' + clientIds[0], agentOptions), invokeCount: 0 })
  agentInfo.push({ id: clientIds[1], agent: new Agent(okUri + '#' + clientIds[1], agentOptions), invokeCount: 0 })
  agentInfo.push({ id: clientIds[2], agent: new Agent(okUri + '#' + clientIds[2], agentOptions), invokeCount: 0 })
  agentInfo[0].agent.declareMethod(methodName, (msg, reply) => {
    ++agentInfo[0].invokeCount
    reply.end()
  })
  agentInfo[1].agent.declareMethod(methodName, (msg, reply) => {
    ++agentInfo[1].invokeCount
    reply.end()
  })
  agentInfo[2].agent.declareMethod(methodName, (msg, reply) => {
    ++agentInfo[2].invokeCount
    reply.end()
  })
  agentInfo[0].agent.start()
  agentInfo[1].agent.start()
  agentInfo[2].agent.start()

  var retCallback = (reply) => {
    t.equal(reply.retCode, 0)
    ++retCount
  }
  var retFailed = (err) => {
    t.fail('remote method call failed: ' + err)
  }

  // wait 500 ms, for invocations of declareMethod in effect.
  setTimeout(() => {
    agentInfo[0].agent.call(methodName, null, agentInfo[1].id).then(retCallback, retFailed)
    agentInfo[0].agent.post(methodName, null)
    agentInfo[0].agent.call(methodName, null, agentInfo[0].id).then(retCallback, retFailed)
    agentInfo[0].agent.call(methodName, null, '##xx!!').then((reply) => {
      t.failed('missing target remote call should failed')
    }, (err) => {
      t.equal(err, flora.ERROR_TARGET_NOT_EXISTS)
    })
    agentInfo[0].agent.call(methodName, null, agentInfo[2].id).then(retCallback, retFailed)
    agentInfo[0].agent.call(methodName, null, agentInfo[2].id).then(retCallback, retFailed)
    agentInfo[0].agent.call(methodName, null, agentInfo[0].id).then(retCallback, retFailed)
    agentInfo[0].agent.call(methodName, null, 'missingTarget').then((reply) => {
      t.failed('missing target remote call should failed')
    }, (err) => {
      t.equal(err, flora.ERROR_TARGET_NOT_EXISTS)
    })
    agentInfo[0].agent.call(methodName, null, agentInfo[0].id).then(retCallback, retFailed)
  }, 500)

  setTimeout(() => {
    t.equal(agentInfo[0].invokeCount, 3)
    t.equal(agentInfo[1].invokeCount, 1)
    t.equal(agentInfo[2].invokeCount, 2)
    t.equal(retCount, 6)
    agentInfo[0].agent.close()
    agentInfo[1].agent.close()
    agentInfo[2].agent.close()
    t.end()
  }, 3500)
})
