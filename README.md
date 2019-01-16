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

# Features
- `asar` and `zip` support
- Compatible wrapper for `electron-builder's` updater ([electron-updater]())
- Splashscreen generator
- Built-in support for: GitHub, AWS S3, Azure or Custom HTTP
- Zip compression
- Rollback to latest (selected / working) version
- Version chooser
- Menu integration & Dialogs
- *Hot App Loading* from memory (no write to fs)
- Minimal dependency footprint (for better security)
- Automatic package integrity checks

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

## App Updater

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
const update = await appUpdater.checkForUpdates()
const result = await appUpdater.downloadUpdate(update)
```

## Binary Updater

#### Automatic Update Checking with Dialogs

```javascript
const shellUpdater = new DialogUpdater({
  repo: 'https://github.com/owner/repo',
  shell: true
})
```

# Updater
AppUpdater implements the **IUpdater** interface and subclasses **EventEmitter**. It support the following **methods** and **events**:

#### Methods

```
getReleases(): Promise<Array<(IRelease | IInvalidRelease)>>;
getLatest(): Promise<IRelease | null>;
download(IRelease release[, String downloadDir]) : Promise<IDownloadResult>
```

#### Events
```
- checking-for-update
- update-not-available
- update-available
- update-progress
- update-downloaded
- update-invalid
- error
```

#### Dialogs
Dialogs can be activated and configured with the `dialogs` setting:

# Application Package Types

An application package is a **zip** or [asar](https://github.com/electron/asar) file that contains **ONLY** application code or external binary dependencies but none of the Electron framework code or binaries. An application package can for example be a simple React Web app, or any Progressive Web App (PWA).

Please see the following example Package Types:

### Web App Package

They should look like this:

<pre>
    MyApp.zip
(a) ├── package.json
(b) ├── manifest.json
(c) ├── public/
(d) │   ├── index.html
(e) │   └── js/
(f) │       └── build.js
</pre>

The default behavior is to load the `index.html` into the [renderer process]().
Since there are no security measures whatsoever the renderer should run as "sandboxed" as possible.

### Electron App Package

They should look like this:

<pre>
    <b>MyApp.asar or MyApp.zip</b>
(a) ├── package.json
(b) ├── manifest.json
(c) ├── public/
(d) │   ├── index.html
(e) │   └── js/
(f) │       └── build.js
(g) └── <b>app/</b>
(h)     └── main.js
</pre>

Packages can have an additional *app/* folder which contains code that runs in the background or [main process]().
Because code from `/app` runs *privileged* and has access to the OS, Node.js and all resources but the simple package format lacks any security features this kind of deployment is <span style="color: red"><b>extremely dangerous</b></span>.
If the app/main.js script is not called 'main.js' the alternative path should be defined in the `package.json's` `package.main` property.

### Secured Packages

Secured packages should look like this:

<pre>
    MyApp.zip
(1) ├── <b>__checksums.json</b>
(2) ├── <b>__signature.json</b>
(a) ├── package.json
(b) ├── manifest.json
(c) ├── public/
(d) │   ├── index.html
(e) │   └── js/
(f) │       └── build.js
(g) └── app/
(h)     └── main.js
</pre>

Please note that metadata is prefixed with `__` which makes co-location and [partial loading]() possible.

### Packages with detached Metadata

<pre>
    MyApp.zip
(a) ├── package.json
(b) ├── manifest.json
(c) ├── public/
(d) │   ├── index.html
(e) │   └── js/
(f) │       └── build.js
(g) └── app/
(h)     └── main.js

<b>
    metadata.json
(1) ├── checksum : {...}
(2) ├── signature : {...}
</b>

<b>
    latest.json
(3) ├── version : {...}
(4) ├── stage : {...}
(5) ├── rollout : {...}
</b>
</pre>

### Wrapped Binary Package with implicit Metadata

<pre>
    MyApp-<b>v1.0.0-stable</b>.zip
(a) ├── MyApp.exe
</pre>


## Metadata

Metadata can be included, detached, hosted, or implicit.

### Included
The included `__checksums.json` file should have the following structure:
```javascript
{
  'package.json': sha512-a739djfdusdf877....
  'manifest.json': sha512-a739djfdusdf877....
  'public/index.html': sha512-a739djfdusdf877....
}
```
The included `__signature.json` file should have the following structure:

```javascript
{
  alg: string
  signature: base64url encoded serialized json
}
```

### Detached
The detached metadata.json file should have the following structure:

```javascript
interface IMetadata {
  checksums: {
    md5?: string
    sha1?: string
    sha256?: string
    sha512?: string
  },
  signature: string,
  dependencies: string,
  permissions: string
}
```

### Hosted / Managed
Hosted metadata is stored somewhere in a database and made accessible through an API.
TODO

### Implicit
Implicit metadata can only be recovered via heuristics e.g. from path names.
TODO

# Repositories (Backends)

Electron App Manager supports multiple options to host and distribute binaries and app packages.
All repositories implement the IRepository interface and support the following methods.

```javascript
interface IRepository {
  getReleases(): Array<IRelease>;
  getLatest(): IRelease;
  download(update: IRelease): IRelease;
}
```

# Releases

```javascript
IRelease {
  name: string;
  displayName: string;
  fileName: string;
  commit: string,
  publishedDate: Date;
  version: string;
  channel: string | void;
  size: Number;
  tag: string;
  location: string;
  repository: url;
  error: void;
}
```

# Advanced Usage

## *Hot Loading* (Experimental)

Hot loading will download all Web app contents into memory and serve them from a virtual fs. While the package content is being downloaded *Electron App Manager* will display a generated splashcreen with a progress animation.

```javascript
let result = await appUpdater.hotLoad()
// create window for app
let win = WindowManager.createWindow()
win.loadURL(result.electronUrl)
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
