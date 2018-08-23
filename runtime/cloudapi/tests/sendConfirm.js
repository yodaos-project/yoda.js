var sendConfirm = require('../sendConfirm')

var config = {
  device_id: '0602041822000087',
  device_type_id: '060F941561F24278B8ED71733D7B9507',
  key: 'A5D4350521F84E8C859DD473E043087F',
  secret: '658D918B788B4416AE27389D1189F5B8'
}

sendConfirm('R233A4F187F34C94B93EE3BAECFCE2E3', 'intent', '{}', '[]', '', config, (error, res) => {
  console.log(error, res)
})
