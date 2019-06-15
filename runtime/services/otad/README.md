# OTA

## Downloading OTA System Image

It is a elaborated job to download system images and keep image integrity correct. To ease the process of OTA, yodart provides an plug-able OTA image downloader.

### `node /usr/yoda/services/otad/index.js`

`/usr/yoda/services/otad/index.js` takes following arguments:

#### --require

Execute `fetcher-command` and `integrity-command` as JavaScript programs.

#### --fetcher <fetcher-command>

`fetcher-command` would be executed with one argument of `system version`.

`fetcher-command` should output JSON-stringified OTA info to stdout and exit with code 0.

Example OTA info:
```json
{
  "imageUrl": "https://example.com",
  "version": "2.3.3",
  "integrity": "foobar"
}
```

#### --integrity <integrity-command>

`integrity-command` would be executed with two arguments of `image path`, `expected integrity`.

`integrity-command` should exit with code 0 on successful integrity check.

### Examples

#### Start download with info-json and md5sum

```bash
node /usr/yoda/services/otad/index.js --fetcher 'echo "{\"imageUrl\":\"https://example.com\",\"version\":\"2.3.3\",\"integrity\":\"09b9c392dc1f6e914cea287cb6be34b0\"}" #' --integrity "bash -c 'printf \"\$1  \$0\" | md5sum -c'"
```

### Get Download Result

`/usr/yoda/services/otad/index.js` would post flora message `yodaos.otad.event` with `['prepared', <ota-info-json>]` on successful download of image.

```typescript
interface OtaInfo {
  imageUrl: string
  version: string
  integrity: string
  imagePath: string
  status: 'downloading' | 'downloaded' | 'error'
}
```

e.g. `yodaos.otad.event`, [`'prepared'`, `'{"imageUrl":"https:\\/\\/example.com","version":"2.3.3","integrity":"09b9c392dc1f6e914cea287cb6be34b0","imagePath":"\\/data\\/upgrade\\/2.3.3.img","status":"downloaded"}'`].

## After Download

If an notice of system upgrade is expected to user, open a url with image path would announce the upgrade:

`yoda-app://ota/upgrade?image_path=/data/upgrade/2.3.3.img`

With notice announced, the system would go to recovery state immediately.

## After Upgrade

System recovery state should be reset after upgrade whether upgrade is successful or not. Also there might be changelog to be announced to users to explain why the upgrade is required and why it takes so long for users have to wait for the upgrade:

`yoda-app://ota/on_first_boot_after_upgrade?changelog=nothing`

With the url opened, changelog would be spoke and recovery state reset.
