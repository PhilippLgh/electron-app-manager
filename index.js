function isElectron() {
  // Renderer process
  if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
    return true
  }
  // Main process
  if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
    return true
  }
  // Detect the user agent when the `nodeIntegration` option is set to true
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
    return true
  }
  return false
}

/**
 * it should be able to check for github releases
 * it should be able to detect new releases and download them
 * 
 * it should emit following events:
 * update-downloaded
 * update-not-available
 * update-available
 * checking-for-update
 * error
 */

// combine other updaters such as:
// https://github.com/electron-userland/electron-builder/blob/docs/encapsulated%20manual%20update%20via%20menu.js
// https://github.com/electron/update-electron-app/blob/master/index.js
// https://github.com/ethereum/ethereum-client-binaries

module.exports = {
  AppUpdater: require('./updater/updater'),
  DialogUpdater: isElectron() && require('./updater/ElectronDialogUpdater')
}
