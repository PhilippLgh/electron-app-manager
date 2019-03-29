import AppManager from './updater/AppManager'
import { registerHotLoadProtocol } from './updater/lib/CustomProtocols';
export {default as AppManager} from './updater/AppManager'

export const registerPackageProtocol = () => {
  const { protocol } = require('electron')
  /**
   // https://github.com/electron/electron/blob/master/docs/api/protocol.md 
    By default web storage apis (localStorage, sessionStorage, webSQL, indexedDB, cookies) are disabled
    for non standard schemes. 
    So in general if you want to register a custom protocol to replace the http protocol, 
    you have to register it as a standard scheme.
    -> needs to be registered before app.onReady
  */
  protocol.registerStandardSchemes(['package'], { secure: true })
  registerHotLoadProtocol()
}
