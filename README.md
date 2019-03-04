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

# Features
- `asar`, `zip`, and `tar` package support
- Compatible wrapper for `electron-builder's` updater ([electron-updater]())
- Splash screen generator and loading animation
- Built-in support for packages hosted on: GitHub, AWS S3, Azure or Custom HTTP
- Automatic package integrity checks
- Automatic signature checks
- File compression
- Rollback to latest / selected / working version
- Version chooser
- Staged rollouts
- Menu integration & confirmation dialogs
- [*Hot App Loading*](#hot-loading-experimental) from memory (no write to fs)
- Minimal dependency footprint (for higher security)

# Difference to Squirrel & Electron-Builder

*Electron App Manager* uses `Electron-Builder's` updater under the hood for full binary updates.
However, opposed to Squirrel and Electron-Builder not every update downloads a full installer, needs elevated permissions or the user's interaction to install updates.
One important concept is that *Electron App Manager* updates the Electron binaries and the application code separately [learn why]().

# Installation
```bash
npm i @philipplgh/electron-app-manager
or
yarn add @philipplgh/electron-app-manager
```

# Basic Usage

## App Manager

#### Automatic Update Checking
The default for Electron App Manager is to check every **20 minutes** for new updates at the given location and update automatically.

```javascript
// import { AppUpdater } from '@philipplgh/electron-app-manager'
const { AppUpdater } = require('@philipplgh/electron-app-manager')

const appUpdater = new AppUpdater({
  repo: 'https://github.com/owner/repo'
})
```

#### Manual Update Checking

```javascript
const appUpdater = new AppUpdater({
  repo: 'https://github.com/owner/repo',
  auto: false // deactivate automatic updates
})
const updateInfo = await appUpdater.checkForUpdates()
if(updateInfo.updateAvailable){
  const result = await appUpdater.downloadUpdate(updateInfo.latest)
}
```

## Binary Updater
TODO

# App Manager 

`constructor(options : IUpdaterOptions)`


## Methods

### Auto Updater

`async checkForUpdates() : Promise<IUpdateInfo>`

`async checkForUpdatesAndNotify() : Promise<IUpdateInfo>`

### Release Management

`async getReleases() : Array<IRelease>`

`async getLatestCached()`

`async getLatestRemote()`

`async getLatest() : Promise<IRelease | null>`

`async download(release : IRelease, options: IDownloadOptions)`

###  App Loading

`async load(release : IRelease | Buffer | string) : Promise<string> `

###  Hot Loading

`async hotLoad(release : IRelease)`

`async hotLoadLatest()`

`async persistHotLoaded()`

### Updater Menu

`async createMenuTemplate(onReload : Function) : ElectronMenuTemplate`

### Package Content
`async getEntries(release : IRelease)`

`async getEntry(release : IRelease, entryPath : string)`

`async extract(release : IRelease)`


# Releases

```javascript
export interface IRelease {
  name: string;
  displayName: string;
  fileName: string;
  commit: string | void,
  publishedDate: Date;
  version: string;
  channel: string | void;
  size: Number;
  tag: string;
  location: string;
  repository: string; // url
  error: void;
  signature?: string // url
  metadata?: string // url
}
```

# Advanced Usage

## *Hot Loading* (Experimental)

Hot loading will download all Web app contents into memory and serve them from a virtual fs. While the package content is being downloaded *Electron App Manager* will display a generated splash screen with a progress animation.

```javascript
const myApp = await appManager.hotLoadLatest()
let win = WindowManager.createWindow()
win.loadURL(myApp.hotUrl)
```
<span style="color: red"><b>Warning:</b></span> this is an experimental feature and will override the default buffer protocol handler: see [protocol handlers]()
It will probably change in the near future.

# Build & host app packages

To turn any Web app created with `create-react-app` into an Electron App Package please see the readme of the [create-react-app-extensions]() package.

# Contribution and Extension

All necessary typescript interfaces are in */updater/api*:

```
- IRelease.ts
- IRepository.ts
- IUpdater.ts
```
