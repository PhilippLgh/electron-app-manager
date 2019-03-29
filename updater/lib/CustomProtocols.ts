import fs from 'fs'
import { getRepository } from '../repositories'
import { request } from '../lib/downloader'
import { pkgsign } from '@philipplgh/ethpkg'
import protocol from '../abstraction/protocol'
import ModuleRegistry from '../ModuleRegistry';


const findWindowByTitle = (title : string) => {
  const { BrowserWindow } = require('electron')
  const windows = BrowserWindow.getAllWindows()
  const window = windows.find(win => win.getTitle() === title)
  return window
}

const findWebContentsByTitle = (title : string) => {
  const { webContents } = require('electron')
  let _webContents = webContents.getAllWebContents()
  const wc = _webContents.find(w => w.getTitle() === title)
  return wc
}

// used for remote zip (experimental)
async function getZipUrl(_url : string){
  let result = await request("HEAD", _url);
  let headers = result.headers;
  if (headers.status === "302 Found" && headers.location) {
    return headers.location
  }
  return _url
}

export const loadRemoteApp = async (repoUrl : string, windowTitle : string) => {

  // 1. get repo for url
  let repo = getRepository(repoUrl)

  // 2. try to find latest version
  const latest = await repo.getLatest()

  if (!latest) {
    // FIXME close splash here and let user know
    console.log('no latest version')
    return // avoid ts issue
  } else {
    // console.log('atest version found', latest)
  }

  const {
    displayName,
    size,
    version,
  } = latest

  // @ts-ignore
  const icon = latest.icon

  // 3. get webContents that is showing the splash 
  const webContents = findWebContentsByTitle(windowTitle)
  if (!webContents) {
    // FIXME close splash here and let user know
    console.log('hot-loader window not found')
    return
  }

  const app = {
    name: displayName || '<unknown>',
    displayName: displayName || '<unknown>',
    version,
    size,
    icon
  }

 // 4. download latest version & update window
 let pp = 0
 const packageData = await repo.download(latest, (progress : number) => {
  let pn = Math.floor(progress * 100);
  if (pn > pp) {
    pp = pn
    const changes = {
      app,
      progress: pp
    }
    let dataString = JSON.stringify(changes)
    webContents.executeJavaScript(`
      try {
        window.dispatchEvent(new CustomEvent('update', {detail: ${dataString} }));
      } catch (error) {
        console.error(error)
      }
    `)
  }
 })

 // TODO implement caching strategy here

 // turn buffer into ethpkg
 const pkg = await pkgsign.loadPackage(packageData)

 // 5. register module as hot-loaded module
 const appUrl = await ModuleRegistry.add(pkg)

 // 6. now load packageData into memory and serve from there
 webContents.loadURL(appUrl)

}


// hot load protocol

const scheme = 'package'

const prepareUninitialized = (repoUrl : string, handler : any) => {
  let template = fs.readFileSync(__dirname+'/../electron/ui/splash.html', 'utf8')

  // hack: id is used for window detection to get a mapping from app to window
  const windowId = Math.random().toString(26).slice(2)
  const windowTitle = `Electron App Manager - ${windowId}`

  template = template.replace('$WINDOW.TITLE$', windowTitle)
  template = template.replace('$app.info$', JSON.stringify({
    name: 'GitHub',
    version: 'latest'
  }))
  let result = handler({ mimeType: 'text/html', data: Buffer.from(template) })

  // TODO append unique identifier to window for multi-window scenarios

  loadRemoteApp(repoUrl, windowTitle)

  return result
}

const hotLoadProtocolHandler = async (fileUri : string, handler : any) => {

  // console.log('load', fileUri)
  const filePath = fileUri
  const fp = filePath.replace((scheme + '://'), '')
  const parts = fp.split('/')

  // console.log('HOT-LOAD: received request', fileUri)

  if (filePath.includes('github')) {
    // temp. swap the protocol
    const repoUrl = `https://${fp}`
    return prepareUninitialized(repoUrl, handler)
  }

  if (parts.length > 0 && parts[0] === '/'){
    parts.shift() // remove leading /
  }

  if (parts.length < 2) {
    console.log('HOT-LOAD: no hotloader url found: fallback to fs', filePath)
    let content = fs.readFileSync(filePath)
    return handler(content)
  }
  
  const moduleId = parts.shift() as string
  const relFilePath = parts.join('/')
  
  // console.log('handle request', moduleId, relFilePath)
  if (!ModuleRegistry.has(moduleId)) {
    throw new Error('HOT-LOAD: requested content cannot be served: module not found / loaded')
  }
  const pkg = ModuleRegistry.get(moduleId)
  const entry = await pkg.getEntry(relFilePath)
  if (entry) {
    const content = await entry.file.readContent()
    return handler(content)
  } else {
    console.log('HOT-LOAD WARNING: file not found in pkg', relFilePath)
    return handler(-2)
  }
  
}

let isRegistered = false

/**
 * TODO things to consider:
 * this is *magic* and magic is usually not a good thing
 * it will overwrite other interceptors - it seems there can only be one which might be a bug
 * this will only allow to read from one zip which is probably intended
 * it will also completely deactivate fs access for files outside the zip which could be a good thing 
 */
export const registerHotLoadProtocol = () => {
  if(isRegistered) {
    return `${scheme}:`
  }
  protocol.registerProtocolHandler(scheme, hotLoadProtocolHandler, (error : any) => {
    if (error) console.error('Failed to register protocol')
  })
}