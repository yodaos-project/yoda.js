'use strict'

var test = require('tape')
var createInput = require('@yoda/input')

// id:1312
test('getHandler: illegal parameter', (t) => {
  t.throws(() => { // throw
    createInput({selectTimeout: 'fd', dbclickTimeout: 400, slideTimeout: 400})
  }, new RegExp('selectTimeout must be a number'), 'The parameter is string, An exception needs to be thrown')

  t.throws(() => {
    createInput({selectTimeout: null, dbclickTimeout: 400, slideTimeout: 400})
  }, new RegExp('selectTimeout must be a number'), 'The parameter is null, An exception needs to be thrown')

  var inputEvent = createInput({dbclickTimeout: 400, slideTimeout: 400})
  t.equal(inputEvent._options['selectTimeout'], 250)
  t.equal(inputEvent._options['dbclickTimeout'], 400)
  t.equal(inputEvent._options['slideTimeout'], 400)
  inputEvent.disconnect()

  // TODO an error should be throwed  if you execute the init twice
  t.end()
})
