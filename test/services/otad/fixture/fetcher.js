module.exports = fetcher
function fetcher (version) {
  return {
    imageUrl: 'https://example.com',
    version: '2.3.3',
    integrity: 'foobar'
  }
}

if (require.main === module) {
  console.log(fetcher.apply(process.argv.slice(2)))
}
