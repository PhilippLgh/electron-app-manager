<h1 align="center">Electron App Manager</h1>

<p align="center">
  <a href="https://circleci.com/gh/PhilippLgh/electron-app-manager"><img src="https://img.shields.io/circleci/project/github/PhilippLgh/electron-app-manager/master.svg" alt="Build Status"></a>
  <a href="https://npmcharts.com/compare/@philipplgh/electron-app-manager?minimal=true"><img src="https://img.shields.io/npm/dm/@philipplgh/electron-app-manager.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/@philipplgh/electron-app-manager"><img src="https://img.shields.io/npm/v/@philipplgh/electron-app-manager.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@philipplgh/electron-app-manager"><img src="https://img.shields.io/npm/l/@philipplgh/electron-app-manager.svg" alt="License"></a>
</p>
<h4 align="center" style="color: red">WARNING: WIP / NOT PRODUCTION READY</h4>

<h4>
Electron App Manager provides fast, secure, minimal and continuous updates + version and dependency management.
</h4>

![](./assets/app_manager_launch_demo_grid2.gif)

# Installation
```bash
npm i @philipplgh/electron-app-manager
or
yarn add @philipplgh/electron-app-manager
```

# Basic Usage

The easiest but also most experimental way is to use Electron App Manager's custom `package://` protocol handler.

```javascript
const { app, BrowserWindow } = require('electron')
const { registerPackageProtocol } = require('@philipplgh/electron-app-manager')
registerPackageProtocol()

function createWindow () {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })
  // and load the index.html of the app
  // using package:// protocol and Github releases hosting
  const WEB_APP_URL = 'package://github.com/owner/project'
  win.loadURL(WEB_APP_URL)
}
app.on('ready', createWindow)
```

This will show a splash screen, check all releases on the specified GitHub repo, download the latest version's package asset and serve the contents locally.

## Advanced Usage

The `package` protocol is mostly a convenience wrapper around an `AppManager` instance. 
Loading a package from a remote source can also be achieved manually like this:

```javascript
const { AppManager } = require('@philipplgh/electron-app-manager')

// Create a new instance of AppManager pointing to the GitHub repo
const appManager = new AppManager({
  repository: 'https://github.com/owner/repo',
  policy: {
    signedBy: [/* address */]
  }
})
// find the latest release from the GitHub's release list or cache
const latest = await appManager.getLatest()
// download the package asset from releases if necessary and
// create a "server" for the package contents
const url = await appManager.load(latest, 'http')
// load the locally served content in renderer
win.loadURL(url)
```

# Class: AppManager


> The AppManager's main task is to load a release list from a remote repository and download & cache assets in a local repository (cache).

It creates a new AppManager managing zero or more caches and exactly one repository as set by the options.
## Constructor `new AppManager([options])`
- `options` IAppManagerOptions (optional)
  - `repository` String -- Url or path to a repository that stores releases
  - `cacheDir` String -- Path to a folder where cached files are stored.

## Events

### update-progress

## Methods

It clears the cache
#### `async clearCache() : void`

---

It returns all releases from cached and / or remote matching `options`
#### `async getReleases(options : IFetchOptions) : Promise<Array<IRelease | IInvalidRelease>>`

---

It returns the latest release from repository or cache matching `options`
#### `async getLatest(options : IFetchOptions) : Promise<IRelease | undefined>`

---

It loads a release so that it can be served from memory
#### `public async load(release : IRelease, protocol : string) : Promise<string | undefined>`

---

It downloads the release assets specified by `release`
#### `async download(release : IRelease, downloadOptions : IDownloadOptions) : : Promise<IRelease>`

---

It checks for an update
#### `async checkForUpdates() : Promise<IUpdateInfo>`

---

