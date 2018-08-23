var lightMethod = require('./lightMethod')

lightMethod('play', ['@test', '/opt/light/setStandby.js', '{}'])
  .then((res) => {
    console.log(res)
  })
  .catch((error) => {
    console.log(error)
  })
