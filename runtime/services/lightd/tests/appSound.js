var lightMethod = require('./lightMethod')

lightMethod('appSound', ['@test', '/opt/media/firstboot.ogg'])
  .then((res) => {
    console.log(res)
  })
  .catch((error) => {
    console.log(error)
  })
