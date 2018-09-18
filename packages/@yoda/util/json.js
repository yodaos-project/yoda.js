module.exports.safeParse = safeParse
function safeParse (jsonStr) {
  var ret
  try {
    ret = JSON.parse(jsonStr)
  } catch (err) {}

  return ret
}
