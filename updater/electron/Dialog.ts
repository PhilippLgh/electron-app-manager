import { IRelease } from "../api/IRelease"
import { dialog } from 'electron'

export class ElectronDialogs {
  static displayUpdateFoundDialog(name:string, version:string, callback: Function) {
    dialog.showMessageBox({
      title: 'Checking for updates',
      cancelId: -1,
      message: `
      Update found: ${name} v${version} 
      Press "OK" to download in background
      `
    }, 
    (response : number) => {
      // response: Number - The index of the button that was clicked
      console.log('user response to update:', response)
      const shouldInstall = response !== -1
      callback(shouldInstall)
    })
  }
}