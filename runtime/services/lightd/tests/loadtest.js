var lightMethod = require('./lightMethod')

lightMethod('appSound', ['test', '/opt/media/wifi/ble_connected.ogg'])
  .then((res) => {
    if (res && res[0] === true) {
      console.log('success')
    } else {
      console.log('failed')
    }
    lightMethod('appSound', ['test', '/opt/media/wifi/ble_connected.ogg'])
      .then((res) => {
        if (res && res[0] === true) {
          console.log('success')
        } else {
          console.log('failed')
        }
      })
      .catch((error) => {
        console.log(error)
      })
  })
  .catch((error) => {
    console.log(error)
  })

lightMethod('appSound', ['test', '/opt/media/wifi/ble_connected.ogg'])
  .then((res) => {
    if (res && res[0] === true) {
      console.log('success')
    } else {
      console.log('failed')
    }
  })
  .catch((error) => {
    console.log(error)
  })

setTimeout(() => {
  lightMethod('appSound', ['test', '/opt/media/wifi/ble_connected.ogg'])
    .then((res) => {
      if (res && res[0] === true) {
        console.log('success')
      } else {
        console.log('failed')
      }
    })
    .catch((error) => {
      console.log(error)
    })
}, 500)
