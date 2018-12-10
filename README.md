# A fast and easy update solution for Electron apps


# Installation
```
npm i @philipplgh/electron-app-updater
```

# Basic Usage 

## Configure the Updater
```
const appUpdater = new AppUpdater({
  repo: 'https://github.com/owner/repo',
  hasMetadata: true,
  auto: false,
  interval: 10,
  logger: logger
})
```

## Update the Application
```
const update = await appUpdater.checkForUpdates()
const result = await appUpdater.downloadUpdate(update)
```