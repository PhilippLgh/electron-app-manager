import AppManager from './updater/AppManager'
import { registerHotLoadProtocol } from './updater/lib/CustomProtocols';
export {default as AppManager} from './updater/AppManager'

export const registerPackageProtocol = () => {
  const { protocol, app } = require('electron')
  /**
   // https://github.com/electron/electron/blob/master/docs/api/protocol.md 
    By default web storage apis (localStorage, sessionStorage, webSQL, indexedDB, cookies) are disabled
    for non standard schemes. 
    So in general if you want to register a custom protocol to replace the http protocol, 
    you have to register it as a standard scheme.
    -> needs to be registered before app.onReady
  */
  // @ts-ignore
  if (protocol.registerStandardSchemes && typeof protocol.registerStandardSchemes === 'function') {
    // @ts-ignore
    protocol.registerStandardSchemes(['package'], { secure: true })
  } else {
    // @ts-ignore
    protocol.registerSchemesAsPrivileged([
      { scheme: 'package', privileges: { standard: true, secure: true } }
    ])
  }
  registerHotLoadProtocol()
}
