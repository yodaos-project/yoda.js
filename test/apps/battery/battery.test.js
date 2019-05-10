
var test = require('tape')
var helper = require('../../helper')

var property = require('@yoda/property')
var mocker = require('./battery.helper')
var batteryUtil = require(`${helper.paths.apps}/battery/battery`)

test('onPowerStatusChanged when >= 20%', (t) => {
  t.plan(1)
  mocker.setBatteryInfo({
    batLevel: 20,
    batTimetoEmpty: 61
  })
  batteryUtil.onPowerStatusChanged(false, 'false', false).then(text => {
    t.equal(text, '电量百分之20，还能使用1小时1分钟。')
  })
})

test('onPowerStatusChanged when < 20% and times < 3', (t) => {
  t.plan(2)
  property.set(batteryUtil.PROP_KEY, 1, 'persist')
  mocker.setBatteryInfo({
    batLevel: 19,
    batSleepTimetoEmpty: 62
  })
  batteryUtil.onPowerStatusChanged(false, 'false', false).then(text => {
    t.equal(text, '电量不足，打开侧面的休眠开关，最高可待机1小时2分钟')
    t.equal(property.get(batteryUtil.PROP_KEY, 'persist'), '2')
  })
})

test('onPowerStatusChanged when < 20% and times > 3', (t) => {
  t.plan(1)
  property.set(batteryUtil.PROP_KEY, 4, 'persist')
  mocker.setBatteryInfo({
    batLevel: 19,
    batTimetoEmpty: 12
  })
  batteryUtil.onPowerStatusChanged(false, 'false', false).then(text => {
    t.equal(text, '电量不足，我最多只能再使用0小时12分钟。')
  })
})

test('onPowerStatusChanged when < 20% with invalid key', (t) => {
  t.plan(1)
  property.set(batteryUtil.PROP_KEY, 1, 'persist')
  mocker.setBatteryInfo({
    batLevel: 19,
    batSleepTimetoEmpty: -1
  })
  batteryUtil.onPowerStatusChanged(false, 'false', false).then(text => {
    t.equal(text, false)
  })
})

test('onPowerStatusChanged when online', (t) => {
  t.plan(1)
  batteryUtil.onPowerStatusChanged(true, 'false', false).then(text => {
    t.equal(text, false)
  })
})

test('lowerPower', (t) => {
  t.plan(3)
  batteryUtil.lowerPower(10).then((url) => t.equal(url, './res/lowpower_10.ogg'))
  batteryUtil.lowerPower(20, 'true').then((url) => t.equal(url, './res/lowpower_20_play.ogg'))
  batteryUtil.lowerPower(20, 'false').then((url) => t.equal(url, './res/lowpower_20_idle.ogg'))
})

test('temperatureAbnormal', (t) => {
  t.plan(2)
  batteryUtil.temperatureAbnormal(false).then((url) => t.equal(url, './res/battery_temp_low.ogg'))
  batteryUtil.temperatureAbnormal(true).then((url) => t.equal(url, './res/battery_temp_high.ogg'))
})

test('getUseTime when no battery', (t) => {
  t.plan(1)
  mocker.setBatteryInfo({
    batSupported: false
  })
  batteryUtil.getUseTime().then((text) => t.equal(text, '当前产品没有电池，使用期间请连接电源'))
})

test('getUseTime when charging', (t) => {
  t.plan(1)
  mocker.setBatteryInfo({
    batChargingOnline: true
  })
  batteryUtil.getUseTime().then((text) => t.equal(text, '已连接电源，可以放心使用。'))
})

test('getUseTime when not charging', (t) => {
  t.plan(1)
  mocker.setBatteryInfo({
    batChargingOnline: false,
    batTimetoEmpty: 135,
    batLevel: 20
  })
  batteryUtil.getUseTime().then((text) => t.equal(text, '当前电量百分之20，可以使用2小时15分钟。'))
})

test('isCharging when no battery', (t) => {
  t.plan(1)
  mocker.setBatteryInfo({
    batSupported: false
  })
  batteryUtil.isCharging().then((text) => t.equal(text, '当前产品没有电池，使用期间请连接电源'))
})

test('isCharging when charging and level is full', (t) => {
  t.plan(1)
  mocker.setBatteryInfo({
    batSupported: true,
    batChargingOnline: true,
    batTimetoFull: 10,
    batLevel: 100
  })
  batteryUtil.isCharging().then((text) => t.equal(text, '电池已充满。'))
})

test('isCharging when charging and level is not full', (t) => {
  t.plan(1)
  mocker.setBatteryInfo({
    batSupported: true,
    batChargingOnline: true,
    batTimetoFull: 72,
    batLevel: 90
  })
  batteryUtil.isCharging().then((text) => t.equal(text, '充电完成还需要1小时12分钟。'))
})

test('isCharging when charging and level is low', (t) => {
  t.plan(1)
  mocker.setBatteryInfo({
    batSupported: true,
    batChargingOnline: true,
    batTimetoFull: -1,
    batLevel: 10
  })
  batteryUtil.isCharging().then((text) => t.equal(text, '当前设备电量百分之10，充电功率太小，无法正常完成充电。'))
})

test('isCharging when not charging', (t) => {
  t.plan(1)
  mocker.setBatteryInfo({
    batSupported: true,
    batChargingOnline: false,
    batLevel: 10
  })
  batteryUtil.isCharging().then((text) => t.equal(text, '我不在充电状态，当前电量是百分之10。'))
})
