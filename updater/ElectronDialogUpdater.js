const Updater = require('./updater')
const { autoUpdater, CancellationToken } = require("electron-updater")
const { dialog } = require('electron')

const Dialog = {
  displayUpToDateDialog : () =>{
    dialog.showMessageBox({
      title: 'No update',
      message: 'You are using the latest version'
    })
  },

  displayUpdateFoundDialog : (update, callback) => {
    dialog.showMessageBox({
        title: 'Checking for updates',
        message: `
          Update found: ${update.fileName} v${update.version} 
          Press "OK" to download in background
          `
    }, (response) => {
      // response: Number - The index of the button that was clicked
      console.log('user response to update:', response)
    });
  },

  displayRestartForUpdateDialog : (update) => {
    updater.on('update-downloaded', () => {
      dialog.showMessageBox({
        title: 'Install Updates',
        message: 'Updates downloaded, application will be quit for update...'
      }, () => {
        setImmediate(() => autoUpdater.quitAndInstall())
      })
    })
  },

  displayReloadForUpdateDialog : (update) => {
    dialog.showMessageBox({
      title: 'Install Updates',
      message: `Press OK to reload for an update to version ${update.version}`
    }, () => {
      console.log('reload not yet implemented')
    })
  },

  displayDownloadFailedDialog : (download) => {
    dialog.showMessageBox({
      title: 'Download failed',
      message: `Error ${download.error}`
    })
  },

  displayErrorDialog : (error) => {
    dialog.showErrorBox('Error: ', error == null ? "unknown" : (error.stack || error).toString())
  }
}

class ElectronUpdater extends Updater {
  constructor(opts) {
    super(opts)

    if(opts.shell === true) {
      this.isShell = true
    }

    this.checkForUpdates = this.checkForUpdates.bind(this)
  }

  async download(update, silent){
    update = await super.download(update)
    if(silent) {
      return update
    }
    if(this.isShell) {
      Dialog.displayRestartForUpdateDialog()
    } else {
      if (!update.error) { 
        Dialog.displayReloadForUpdateDialog(update)
      } else {
        Dialog.displayDownloadFailedDialog()
      }
    }
    return update
  }

  async checkForUpdates() {

    if(this.isShell){
      autoUpdater.checkForUpdates()
    } 

    let update
    try {
      update = await super.checkForUpdates()
    } catch (error) {
      Dialog.displayErrorDialog(error)
      return
    }

    // no update found
    if (!update) {
      Dialog.displayUpToDateDialog()
      return;
    }

    // update found
    Dialog.displayUpdateFoundDialog(update, decision => {
      if (decision === 'download') {
        if(this.isShell){
          const cancellationToken = new CancellationToken()
          autoUpdater.downloadUpdate(cancellationToken)
        }else {
          this.download(update)
        }
      }
    })
  }
}

module.exports = ElectronUpdater