'use strict'

var test = require('tape')
var logger = require('logger')('flora-test')
var floraFactory = require('@yoda/flora')

var errUri = 'unix:/data/flora-error'
var okUri = 'unix:/var/run/flora.sock'
var crypto = require('crypto')

test('module->flora->connect: err uri', t => {
  var client = floraFactory.connect(errUri, 0)
  t.equal(client, undefined, 'err uri return undefined')
  t.end()
})

test.skip('module->flora->persist msg', t => {
  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `persist msg test one[${msgId}]`
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    t.equal(msg.get(0), int32, `recv post msg[0] ${msg.get(0)}`)
    t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
    t.equal(msg.get(2), hello, `recv post msg[2] ${msg.get(2)}`)
    recvClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
  var postClient = floraFactory.connect(okUri, 0)
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)
  postClient.close()
})

test.skip('module->flora->persist msg: subscribe first and then send, get twice msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `persist msg test two[${msgId}]`
  var count = 0
  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    count++
    logger.info(count)
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    if (count === 1) {
      t.equal(msg.get(0), int32, `recv post msg[0] ${msg.get(0)}`)
      t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
      t.equal(msg.get(2), hello, `recv post msg[2] ${msg.get(2)}`)
    }
    if (count === 2) {
      t.equal(msg.get(0), hello, `recv post msg[0] ${msg.get(0)}`)
      t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
      t.equal(msg.get(2), int32, `recv post msg[2] ${msg.get(2)}`)
      recvClient.close()
      t.end()
    }
  })

  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  // first post
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  // second post
  var caps2 = new floraFactory.Caps()
  caps2.write(hello)
  caps2.writeInt64(int64)
  caps2.writeInt32(int32)
  postClient.post(msgName, caps2, floraFactory.MSGTYPE_PERSIST)
  postClient.close()
})

test.skip('module->flora->persist msg: send first and then subscribe, get the last msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `persist msg test two[${msgId}]`

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  // first post
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)
  // second post
  var caps2 = new floraFactory.Caps()
  caps2.write(hello)
  caps2.writeInt64(int64)
  caps2.writeInt32(int32)
  postClient.post(msgName, caps2, floraFactory.MSGTYPE_PERSIST)
  postClient.close()

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    t.equal(msg.get(0), hello, `recv post msg[0] ${msg.get(0)}`)
    t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
    t.equal(msg.get(2), int32, `recv post msg[2] ${msg.get(2)}`)
    recvClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
})

test.skip('module->flora->instant msg: send first and then subscribe, get nothing', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `persist msg test two[${msgId}]`

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_INSTANT)

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    t.fail('not should recv msg')
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_INSTANT)
  setTimeout(() => {
    recvClient.close()
    postClient.close()
    t.end()
  }, 2000)
})

test.skip('module->flora->instant msg: subscribe first and then send, get msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_INSTANT, `recv post type: ${type}`)
    logger.info(msg)
    t.equal(msg.get(0), int32, `recv post msg[0] ${msg.get(0)}`)
    t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
    t.equal(msg.get(2), hello, `recv post msg[2] ${msg.get(2)}`)
    recvClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_INSTANT)

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_INSTANT)
  postClient.close()
})

test.skip('module->flora->instant msg: subscribe first and then send twice, get twice msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`
  var count = 0

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    count++
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_INSTANT, `recv post type: ${type}`)
    if (count === 1) {
      t.equal(msg.get(0), int32, `recv post msg[0] ${msg.get(0)}`)
      t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
      t.equal(msg.get(2), hello, `recv post msg[2] ${msg.get(2)}`)
    }
    if (count === 2) {
      t.equal(msg.get(0), hello, `recv post msg[0] ${msg.get(0)}`)
      t.equal(msg.get(1), int32, `recv post msg[1] ${msg.get(1)}`)
      t.equal(msg.get(2), int64, `recv post msg[2] ${msg.get(2)}`)
      recvClient.close()
      t.end()
    }
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_INSTANT)

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_INSTANT)

  var caps2 = new floraFactory.Caps()
  caps2.write(hello)
  caps2.writeInt32(int32)
  caps2.writeInt64(int64)
  postClient.post(msgName, caps2, floraFactory.MSGTYPE_INSTANT)
  postClient.close()
})

test.skip('module->flora->send instant msg，subscribe persist msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `msg type test[${msgId}]`

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    t.fail('should not recv persist msg')
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_INSTANT)

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)
  setTimeout(() => {
    recvClient.close()
    postClient.close()
    t.end()
  }, 2000)
})

test.skip('module->flora->send persist msg，subscribe instant msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `msg type test[${msgId}]`

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    t.fail('should not recv persist msg')
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_INSTANT)
  setTimeout(() => {
    recvClient.close()
    postClient.close()
    t.end()
  }, 2000)
})

test.skip('module->flora->Caps: write method', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `write method test[${msgId}]`
  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  var subcaps = new floraFactory.Caps()
  subcaps.write(undefined)
  subcaps.write(null)
  subcaps.write('this is subcaps')
  caps.write(subcaps)
  // TODO: this type have a problem
  // var x = new Uint8Array([21, 31]);
  // caps.write(x)
  caps.write('this is a string msg')
  caps.write(2222)
  caps.write(true)
  caps.write(2.3302)
  caps.write(-11)
  caps.write([1, 2, 3])
  caps.write({
    a: 1,
    b: 2
  })
  // TODO: error
  caps.write(caps)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  var recvClient = floraFactory.connect(okUri, 0)
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    logger.info(msg)
    logger.info(msg.get(0))
    logger.info(msg.get(0).get(0))
    logger.info(msg.get(0).get(1))
    logger.info(msg.get(1))
    t.ok(msg.get(0) instanceof floraFactory.Caps)
    t.ok(msg.get(0).get(0) instanceof floraFactory.Caps)
    t.equal(msg.get(0).get(0).get(0), undefined)
    t.equal(msg.get(0).get(1), 'this is subcaps')
    t.equal(msg.get(1), 'this is a string msg')
    recvClient.close()
    postClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
})

test.skip('module->flora->Caps: get method', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `write method test[${msgId}]`
  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  var subcaps = new floraFactory.Caps()
  subcaps.write('this is subcaps msg')
  caps.write(subcaps)
  caps.write('this is a caps msg')
  caps.write(500)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)
  postClient.close()

  var recvClient = floraFactory.connect(okUri, 0)
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    logger.info(msg)
    t.ok(msg.get(0) instanceof floraFactory.Caps, 'subcaps')
    t.equal(typeof msg.get(0).get(0), 'string')
    t.equal(msg.get(0).get(0).get(0), undefined) // TODO: err
    t.equal(msg.get(0).get(0), 'this is subcaps msg')
    t.equal(msg.get(1), 'this is a caps msg')
    t.equal(msg.get(2), undefined)
    t.equal(msg.get(-1), undefined)
    recvClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
})

test.skip('module->flora->Caps: writeInt32 method', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `write method test[${msgId}]`
  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32('this is a string msg')
  caps.writeInt32(true)
  caps.writeInt32(undefined)
  caps.writeInt32(null)
  caps.writeInt32([1, 2, 3])
  caps.writeInt32({
    a: 1,
    b: 2
  })
  caps.writeInt32(caps)
  caps.writeInt32(2147483646)
  caps.writeInt32(2147483647)
  caps.writeInt32(2147483648)
  caps.writeInt32(-2147483647)
  caps.writeInt32(-2147483648)
  caps.writeInt32(-2147483649)
  caps.writeInt32(2.6302)
  caps.writeInt32(-2.3302)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  var recvClient = floraFactory.connect(okUri, 0)
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    logger.info(msg)
    t.equal(typeof msg.get(0), 'number')
    t.equal(msg.get(0), 2147483646, `msg.get(0)`)
    t.equal(msg.get(1), 2147483647, `msg.get(1)`)
    t.equal(msg.get(2), 2147483647, `msg.get(2)`)
    t.equal(msg.get(3), -2147483647, `msg.get(3)`)
    t.equal(msg.get(4), -2147483648, `msg.get(4)`)
    t.equal(msg.get(5), -2147483648, `msg.get(5)`)
    t.equal(msg.get(6), 2, `msg.get(6)`)
    t.equal(msg.get(7), -2, `msg.get(7)`)
    recvClient.close()
    postClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
})

test.skip('module->flora->Caps: writeInt64 method', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `write method test[${msgId}]`
  var postClient = floraFactory.connect(okUri, 0)
  var caps = new floraFactory.Caps()
  t.equal(typeof postClient, 'object')
  caps.writeInt64('this is a string msg')
  caps.writeInt64(true)
  caps.writeInt64(undefined)
  caps.writeInt64(null)
  caps.writeInt64([1, 2, 3])
  caps.writeInt64({
    a: 1,
    b: 2
  })
  caps.writeInt64(caps)
  caps.writeInt64(1214748364444)
  caps.writeInt64(-92233720368547)
  caps.writeInt64(2.302)
  caps.writeInt64(-2.602)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  var recvClient = floraFactory.connect(okUri, 0)
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    logger.info(msg)
    t.equal(typeof msg.get(0), 'number')
    t.equal(msg.get(0), 1214748364444, `msg.get(0)`)
    t.equal(msg.get(1), -92233720368547, `msg.get(1)`)
    t.equal(msg.get(2), 2, `msg.get(2)`)
    t.equal(msg.get(3), -2, `msg.get(3)`)
    recvClient.close()
    postClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
})

/**
 * need confirmation
 */
test.skip('module->flora->Caps: writeFloat method', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `write method test[${msgId}]`
  var postClient = floraFactory.connect(okUri, 0)
  var caps = new floraFactory.Caps()
  t.equal(typeof postClient, 'object')
  caps.writeFloat('this is a string msg')
  caps.writeFloat(true)
  caps.writeFloat([1, 2, 3])
  caps.writeFloat({
    a: 1,
    b: 2
  })
  caps.writeFloat(caps)
  caps.writeFloat(121474833)
  caps.writeFloat(-922330)
  caps.writeFloat(2.3)
  caps.writeFloat(-2.7)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  var recvClient = floraFactory.connect(okUri, 0)
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    logger.info(msg)
    t.ok(msg instanceof floraFactory.Caps)
    t.equal(typeof msg.get(0), 'number')
    t.equal(msg.get(0), 121474833, `msg.get(0)`)
    t.equal(msg.get(1), -922330, `msg.get(1)`)
    // t.equal(msg.get(2), 2, `msg.get(2)`)
    // t.equal(msg.get(3), -2, `msg.get(3)`)
    recvClient.close()
    postClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
})

test.skip('module->flora->Caps: writeDouble method', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `write method test[${msgId}]`
  var postClient = floraFactory.connect(okUri, 0)
  var caps = new floraFactory.Caps()
  t.equal(typeof postClient, 'object')
  caps.writeDouble('this is a string msg')
  caps.writeDouble(true)
  caps.writeDouble([1, 2, 3])
  caps.writeDouble({
    a: 1,
    b: 2
  })
  caps.writeDouble(caps)
  caps.writeDouble(1214748364444)
  caps.writeDouble(-9223372547)
  caps.writeDouble(2.3302)
  caps.writeDouble(-2.6602)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  var recvClient = floraFactory.connect(okUri, 0)
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    logger.info(msg)
    t.ok(msg instanceof floraFactory.Caps)
    t.equal(typeof msg.get(0), 'number')
    t.equal(msg.get(0), 1214748364444, `msg.get(0)`)
    t.equal(msg.get(1), -9223372547, `msg.get(1)`)
    t.equal(msg.get(2), 2.3302, `msg.get(2)`)
    t.equal(msg.get(3), -2.6602, `msg.get(3)`)
    recvClient.close()
    postClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
})

/**
 * bug id = 1363
 */
test.skip('module->flora->connect buffer, default 0', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `msg buffer test[${msgId}]`

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    console.log(msg.get(0).length)
    recvClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var length = 32693 // TODO: err 目前最大支持32693
  var hello = Buffer.alloc(length, 0x74, 'utf8')
  console.log(hello.length)

  var caps = new floraFactory.Caps()
  caps.write(hello.toString('utf8'))
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  postClient.close()
})

/**
 * bug id = 1363
 */
test.skip('module->flora->connect buffer, set value', t => {
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `msg buffer test[${msgId}]`

  var recvClient = floraFactory.connect(okUri, 8000)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    console.log(msg.get(0).length)
    recvClient.close()
    t.end()
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)

  var postClient = floraFactory.connect(okUri, 8000)
  t.equal(typeof postClient, 'object')
  var length = 32693
  var hello = Buffer.alloc(length, 0x74, 'utf8')
  console.log(hello.length)

  var caps = new floraFactory.Caps()
  caps.write(hello.toString('utf8'))
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  postClient.close()
})

test.skip('module->flora->client: instant msg, unsubscribe msg', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`
  var count = 0

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    count++
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_INSTANT, `recv post type: ${type}`)
    t.equal(msg.get(0), int32, `recv post msg[0] ${msg.get(0)}`)
    t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
    t.equal(msg.get(2), hello, `recv post msg[2] ${msg.get(2)}`)
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_INSTANT)

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_INSTANT)

  recvClient.unsubscribe(msgName, floraFactory.MSGTYPE_INSTANT)

  var caps2 = new floraFactory.Caps()
  caps2.write(hello)
  caps2.writeInt32(int32)
  caps2.writeInt64(int64)
  postClient.post(msgName, caps2, floraFactory.MSGTYPE_INSTANT)
  postClient.close()

  setTimeout(() => {
    t.equal(count, 1)
    recvClient.close()
    t.end()
  }, 2000)
})

test.skip('module->flora->client: instant msg, unsubscribe err type', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`
  var count = 0

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    count++
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_INSTANT, `recv post type: ${type}`)
    if (count === 1) {
      t.equal(msg.get(0), int32, `recv post msg[0] ${msg.get(0)}`)
      t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
      t.equal(msg.get(2), hello, `recv post msg[2] ${msg.get(2)}`)
    }
    if (count === 2) {
      t.equal(msg.get(0), hello, `recv post msg[0] ${msg.get(0)}`)
      t.equal(msg.get(1), int32, `recv post msg[1] ${msg.get(1)}`)
      t.equal(msg.get(2), int64, `recv post msg[2] ${msg.get(2)}`)
      recvClient.close()
      t.end()
    }
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_INSTANT)

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_INSTANT)

  recvClient.unsubscribe(msgName, floraFactory.MSGTYPE_PERSIST)

  var caps2 = new floraFactory.Caps()
  caps2.write(hello)
  caps2.writeInt32(int32)
  caps2.writeInt64(int64)
  postClient.post(msgName, caps2, floraFactory.MSGTYPE_INSTANT)
  postClient.close()
})

test.skip('module->flora->client: persist msg, subscribe->send->unsubscribe->send', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`
  var count = 0

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    count++
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    t.equal(msg.get(0), int32, `recv post msg[0] ${msg.get(0)}`)
    t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
    t.equal(msg.get(2), hello, `recv post msg[2] ${msg.get(2)}`)
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  recvClient.unsubscribe(msgName, floraFactory.MSGTYPE_PERSIST)

  var caps2 = new floraFactory.Caps()
  caps2.write(hello)
  caps2.writeInt32(int32)
  caps2.writeInt64(int64)
  postClient.post(msgName, caps2, floraFactory.MSGTYPE_PERSIST)
  postClient.close()

  setTimeout(() => {
    t.equal(count, 1)
    recvClient.close()
    t.end()
  }, 2000)
})

test.skip('module->flora->client: persist msg, send->subscribe->unsubscribe->send', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`
  var count = 0

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    count++
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    t.equal(msg.get(0), int32, `recv post msg[0] ${msg.get(0)}`)
    t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
    t.equal(msg.get(2), hello, `recv post msg[2] ${msg.get(2)}`)
  })

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
  setTimeout(() => {
    recvClient.unsubscribe(msgName, floraFactory.MSGTYPE_PERSIST)
    var caps2 = new floraFactory.Caps()
    caps2.write(hello)
    caps2.writeInt32(int32)
    caps2.writeInt64(int64)
    postClient.post(msgName, caps2, floraFactory.MSGTYPE_PERSIST)
    postClient.close()
    setTimeout(() => {
      t.equal(count, 1)
      recvClient.close()
      t.end()
    }, 2000)
  }, 1000)
})

test.skip('module->flora->client: persist msg, unsubscribe err type', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `instant msg test[${msgId}]`
  var count = 0

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    count++
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_PERSIST, `recv post type: ${type}`)
    if (count === 1) {
      t.equal(msg.get(0), int32, `recv post msg[0] ${msg.get(0)}`)
      t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
      t.equal(msg.get(2), hello, `recv post msg[2] ${msg.get(2)}`)
    }
    if (count === 2) {
      t.equal(msg.get(0), hello, `recv post msg[0] ${msg.get(0)}`)
      t.equal(msg.get(1), int32, `recv post msg[1] ${msg.get(1)}`)
      t.equal(msg.get(2), int64, `recv post msg[2] ${msg.get(2)}`)
      recvClient.close()
      t.end()
    }
  })

  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_PERSIST)

  recvClient.subscribe(msgName, floraFactory.MSGTYPE_PERSIST)
  setTimeout(() => {
    recvClient.unsubscribe(msgName, floraFactory.MSGTYPE_INSTANT)
    var caps2 = new floraFactory.Caps()
    caps2.write(hello)
    caps2.writeInt32(int32)
    caps2.writeInt64(int64)
    postClient.post(msgName, caps2, floraFactory.MSGTYPE_PERSIST)
    postClient.close()
  }, 1000)
})

test.skip('module->flora->client: close recv', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `close test[${msgId}]`
  var count = 0

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    count++
    t.equal(name, msgName, `recv post name: ${name}`)
    t.equal(type, floraFactory.MSGTYPE_INSTANT, `recv post type: ${type}`)
    t.equal(msg.get(0), int32, `recv post msg[0] ${msg.get(0)}`)
    t.equal(msg.get(1), int64, `recv post msg[1] ${msg.get(1)}`)
    t.equal(msg.get(2), hello, `recv post msg[2] ${msg.get(2)}`)
    recvClient.close()
    var caps2 = new floraFactory.Caps()
    caps2.write(hello)
    caps2.writeInt32(int32)
    caps2.writeInt64(int64)
    postClient.post(msgName, caps2, floraFactory.MSGTYPE_INSTANT)
    postClient.close()
    setTimeout(() => {
      t.equal(count, 1)
      t.end()
    }, 1000)
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_INSTANT)
  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_INSTANT)
})

test.skip('module->flora->client: close post', t => {
  var int32 = 32
  var int64 = 64
  var hello = 'hello flora'
  var msgId = crypto.randomBytes(5).toString('hex')
  var msgName = `close test[${msgId}]`

  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    t.fail('should not recv msg')
  })
  recvClient.subscribe(msgName, floraFactory.MSGTYPE_INSTANT)
  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  postClient.close()
  var caps = new floraFactory.Caps()
  caps.writeInt32(int32)
  caps.writeInt64(int64)
  caps.write(hello)
  postClient.post(msgName, caps, floraFactory.MSGTYPE_INSTANT)
  setTimeout(() => {
    recvClient.close()
    t.end()
  }, 2000)
})

/**
 * bug id = 1364
 */
test.skip('module->flora->client: loop create connection', t => {
  for (var count = 0; count < 20; count++) {
    var client = floraFactory.connect(okUri, 0)
    t.equal(typeof client, 'object')
    setTimeout(() => {
      client.close()
    }, 5 * count)
  }
  setTimeout(() => {
    t.end()
  }, 2000)
})

test.skip('module->flora->client: loop post msg', t => {
  var recvClient = floraFactory.connect(okUri, 0)
  var count = 0
  recvClient.on('recv_post', (name, type, msg) => {
    t.equal(name, `id=${count}`, `name is id=${count}`)
    t.equal(msg.get(0), `hello${count}`, `value is hello${count}`)
    count++
  })
  for (var i = 0; i < 100; i++) {
    recvClient.subscribe(`id=${i}`, floraFactory.MSGTYPE_INSTAN)
  }
  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  for (var j = 0; j < 100; j++) {
    var caps = new floraFactory.Caps()
    caps.write(`hello${j}`)
    logger.info(`i=${j}`)
    postClient.post(`id=${j}`, caps, floraFactory.MSGTYPE_INSTANT)
  }
  setTimeout(() => {
    t.equal(count, 100)
    recvClient.close()
    postClient.close()
    t.end()
  }, 3000)
})

test('module->flora->client: disconnect event', t => {
  var recvClient = floraFactory.connect(okUri, 0)
  t.equal(typeof recvClient, 'object')
  recvClient.on('recv_post', (name, type, msg) => {
    logger.info('recv_post')
    logger.info(name)
    logger.info(type)
    logger.info(msg)
  })
  recvClient.on('disconnected', (name, type, msg) => {
    t.pass('disconnected event')
  })
  recvClient.subscribe('disconnect event', floraFactory.MSGTYPE_INSTAN)
  var postClient = floraFactory.connect(okUri, 0)
  t.equal(typeof postClient, 'object')
  var caps = new floraFactory.Caps()
  caps.write(`hello flora!`)
  postClient.post('disconnect event', caps, floraFactory.MSGTYPE_INSTANT)

  setTimeout(() => {
    recvClient.close()
    postClient.close()
    t.end()
  }, 10000)
})
