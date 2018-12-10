const Updater = require('./updater')
const { autoUpdater, CancellationToken } = require("electron-updater")

const { dialog } = require('electron')

class ElectronUpdater extends Updater {
  constructor(opts) {
    super(opts)

    // TODO remove listeners?

    let updater = this
    if(opts.shell === true) {
      updater = autoUpdater
      this.isShell = true
    }

    updater.on('update-available', this.handleUpdateAvailable)
    updater.on('update-not-available', () => {
      dialog.showMessageBox({
        title: 'No Updates',
        message: 'Current version is up-to-date.'
      })
      this.updateMenuBtn.enabled = true
      this.updateMenuBtn = null
    })
    updater.on('error', (error) => {
      dialog.showErrorBox('Error: ', error == null ? "unknown" : (error.stack || error).toString())
      this.updateMenuBtn.enabled = true
      this.updateMenuBtn = null
    })

    if(this.isShell) {
      updater.on('update-downloaded', () => {
        dialog.showMessageBox({
          title: 'Install Updates',
          message: 'Updates downloaded, application will be quit for update...'
        }, () => {
          setImmediate(() => autoUpdater.quitAndInstall())
        })
      })
    } else {
      // needs to be handled in app
      //TODO is different for UI and background script changes
      updater.on('update-downloaded', () => {
        dialog.showMessageBox({
          title: 'Install Updates',
          message: 'Updates downloaded, reload to see changes...'
        }, () => {

        })
      })
    }

    this.handleUpdateAvailable = this.handleUpdateAvailable.bind(this)
    this.checkForUpdates = this.checkForUpdates.bind(this)
  }

  handleUpdateAvailable(update) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Found Updates',
      message: 'Found updates, do you want update now?',
      buttons: ['Sure', 'No']
    }, (buttonIndex) => {
      if (buttonIndex === 0) {
        if(this.isShell){
          const cancellationToken = new CancellationToken()
          autoUpdater.downloadUpdate(cancellationToken)
        }else {
          this.download(update)
        }
      }
      else {
        this.updateMenuBtn.enabled = true
        this.updateMenuBtn = null
      }
    })
  }

  checkForUpdates(menuItem, focusedWindow, event) {
    this.updateMenuBtn = menuItem
    this.updateMenuBtn.enabled = false
    if(this.isShell){
      autoUpdater.checkForUpdates()
    } else {
      super.checkForUpdates()
    }
  }

}

module.exports = ElectronUpdater