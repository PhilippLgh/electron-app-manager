import { IRelease } from "../api/IRelease"
import { dialog } from 'electron'

export class ElectronDialogs {
  static displayUpdateFoundDialog(name:string, version:string, callback: Function) {
    dialog.showMessageBox({
      title: 'Update available',
      buttons: ['Ok', 'Cancel'],
      message: `
      Update found: ${name} (v${version}). 
      Press "Ok" to download it in the background.
      `
    }, 
    (response : number) => {
      // response: Number - The index of the button that was clicked
      // console.log('user response to update:', response)
      const shouldInstall = response !== 1 // = index of 'cancel'
      callback(shouldInstall)
    })
  }
  static displayUpToDateDialog() {
    dialog.showMessageBox({
      title: 'No update',
      message: 'You are using the latest version'
    })
  }
  static displayUpdateError(err: Error) {
    dialog.showMessageBox({
      title: 'Update Error',
      type: 'error',
      message: `
      An error occurred during update: 
      ${err ? err.message : '<unknown error>'}
      `
    }, 
    (response : number) => {

    })
  }
}