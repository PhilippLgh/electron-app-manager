const Updater = require('./updater')
const { autoUpdater } = require("electron-updater")

const { dialog } = require('electron')


class ElectronUpdater extends Updater {
  constructor(opts) {
    super(opts)

    // TODO remove listeners?

    this.on('update-available', this.handleUpdateAvailable)

    this.on('update-not-available', () => {
      dialog.showMessageBox({
        title: 'No Updates',
        message: 'Current version is up-to-date.'
      })
      this.updater.enabled = true
      this.updater = null
    })

    this.on('error', (error) => {
      dialog.showErrorBox('Error: ', error == null ? "unknown" : (error.stack || error).toString())
    })

    this.on('update-downloaded', () => {
      dialog.showMessageBox({
        title: 'Install Updates',
        message: 'Updates downloaded, application will be quit for update...'
      }, () => {
        setImmediate(() => autoUpdater.quitAndInstall())
      })
    })
  }

  handleUpdateAvailable(update) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Found Updates',
      message: 'Found updates, do you want update now?',
      buttons: ['Sure', 'No']
    }, (buttonIndex) => {
      if (buttonIndex === 0) {
        this.downloadUpdate(update)
      }
      else {
        this.updater.enabled = true
        this.updater = null
      }
    })
  }

  checkForUpdates(menuItem, focusedWindow, event) {
    this.updater = menuItem
    this.updater.enabled = false
    super.checkForUpdates()
  }

}

module.exports = ElectronUpdater