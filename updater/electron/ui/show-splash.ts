import path from 'path'
import fs from 'fs'
import { app, BrowserWindow } from 'electron'
import AppManager from '../../AppManager';

function createWindow(options : any, data = {}) {

  const preloadPath = path.join(__dirname, 'preload.js')

  let baseOptions = {
    width: 800, 
    height: 600 
  }

  let popupOptions = {
    // parent: win, // The child window will always show on top of the top window.
    modal: true
  }

  if(!fs.existsSync(preloadPath)){
    throw new Error('for security reasons application cannot be started without preload script - path does not exist: '+preloadPath)
  }

  // don't make any changes here
  let enforcedOptions = {
    webPreferences: {
      // https://electronjs.org/docs/tutorial/security#3-enable-context-isolation-for-remote-content
      contextIsolation: true,
      preload: preloadPath,
      // https://electronjs.org/docs/tutorial/security#2-disable-nodejs-integration-for-remote-content
      nodeIntegration: false,
      // https://electronjs.org/docs/tutorial/security#5-do-not-disable-websecurity
      webSecurity: true,
      // https://electronjs.org/docs/tutorial/security#7-do-not-set-allowrunninginsecurecontent-to-true
      allowRunningInsecureContent: false,
      // https://electronjs.org/docs/tutorial/security#8-do-not-enable-experimental-features
      experimentalFeatures: false,
      webviewTag: true, // needs to be set: defaults to nodeIntegration otherwise
      // https://electronjs.org/docs/tutorial/security#9-do-not-use-enableblinkfeatures
      enableBlinkFeatures: undefined, // DO NOT USE
    }
  }

  // avoid potentially immutable or non-overwritable values on the passed options
  if(options && options.webPreferences){
    delete options.webPreferences
    // TODO alert 
  }

  let config = Object.assign(baseOptions, options)

  let isPopup = false
  if(isPopup){
    config = Object.assign(config, popupOptions)
  }

  // must be last call to assign values to config - should overwrite existing values
  const windowConfig = Object.assign(config, enforcedOptions)

  let win = new BrowserWindow(windowConfig)

  // pass initial data to window
  // @ts-ignore
  win.data = JSON.stringify(data) 

  // @ts-ignore
  win.update = changes => {
    win.webContents.send('__update', {
      ...changes
    })
  }
  
  return win

}

function showSplash(appUpdater : AppManager, indexHtml = path.join(__dirname, 'splash.html')){

  let splash : any = null

  const createSplash = () => {
    splash = createWindow({
      width: 400,
      height: 200,
      frame: false
    }, {
      name: appUpdater.repository,
      progress: 0
    })
    // TODO make sure indexHtml exists
    splash.loadFile(indexHtml)
  }

  if(app.isReady()) {
    createSplash()
  } else {
    app.once('ready', createSplash)
  }

  const updateSplash = (app : any, progress : any) => {
    if(!splash) return 
    splash.update({
      app,
      progress
    })
  }

  const closeSplash = () => {
    if(!splash) return 
    setTimeout(() => {
      appUpdater.removeListener('update-progress', updateSplash)
      appUpdater.removeListener('update-downloaded', closeSplash)
      splash.close()
    }, 1500)
  }

  appUpdater.on('update-progress', updateSplash)
  appUpdater.on('update-downloaded', closeSplash)

}

module.exports = showSplash
