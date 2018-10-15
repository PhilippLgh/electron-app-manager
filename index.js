const AppUpdater = require('./updater/updater')

const DialogUpdater = require('./updater/ElectronDialogUpdater')

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

module.exports.AppUpdater = AppUpdater
module.exports.DialogUpdater = DialogUpdater