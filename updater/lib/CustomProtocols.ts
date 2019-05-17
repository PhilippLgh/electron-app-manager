import fs from 'fs'
import url from 'url'
import { getRepository } from '../repositories'
import { request } from '../lib/downloader'
import { pkgsign } from 'ethpkg'
import protocol from '../abstraction/protocol'
import ModuleRegistry from '../ModuleRegistry';
import { createSwitchVersionMenu, createCheckUpdateMenu, createMenu } from '../electron/menu';


const findWindowByTitle = (title : string) => {
  const { BrowserWindow } = require('electron')
  const windows = BrowserWindow.getAllWindows()
  const window = windows.find(win => win.getTitle() === title)
  return window
}

const _findWebContentsByTitle = (title : string) => {
  const { webContents } = require('electron')
  let _webContents = webContents.getAllWebContents()
  const titles = _webContents.map(w => w.getTitle())
  const wc = _webContents.find(w => w.getTitle() === title)
  return wc
}

const findWebContentsByTitle = (windowTitle : string, callback: Function) => {
  const { webContents } = require('electron')
  let _webContents = webContents.getAllWebContents()

  const assignListeners = (fun : Function) => {
    _webContents.forEach(w => {
      // @ts-ignore
      w.on('page-title-updated', fun)
    })
  }

  const removeListeners = (fun : Function) => {
      // @ts-ignore
      _webContents.forEach(w => {
        // @ts-ignore
        w.removeListener('page-title-updated', fun)
      })
  }

  const rendererDetection = function({sender: webContents} : any, title : string) {
    if (title === windowTitle) {
      // found the webContents instance that is rendering the splash:
      removeListeners(rendererDetection)
      callback(webContents)
    }
  }

  // we assign a listener to each webcontent to detect where the title changes
  assignListeners(rendererDetection)

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

export const loadRemoteApp = async (repoUrl : string, queryArgs : any,  webContents : Electron.WebContents) => {

  // 0. parse and remove query args as options
  let targetVersion = (queryArgs && queryArgs.version) || 'latest'

  // 1. get repo for url
  const repo = getRepository(repoUrl)

  // 2. try to find specified version or latest
  let release = null
  if (targetVersion === 'latest') {
    release = await repo.getLatest()
  } else {
    release = await repo.getLatest(`=${targetVersion}`)
  }

  if (!release) {
    // FIXME close splash here and let user know
    console.log(`release for version ${targetVersion} not found`)
    return // avoid ts issue
  } else {
    // console.log('latest version found', latest)
  }

  const {
    displayName,
    size,
    version,
  } = release

  // @ts-ignore
  const icon = release.icon

  const app = {
    name: displayName || '<unknown>',
    displayName: displayName || '<unknown>',
    version,
    size,
    icon
  }

  // 3. download specified version & update window
  let pp = 0
  const packageData = await repo.download(release, (progress : number) => {
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
  const appUrl = await ModuleRegistry.add({
    pkg,
    repo
  })

  // 6. now load packageData into memory and serve from there
  webContents.loadURL(appUrl)

  const switchVersion = (userVersion : string) => {
    console.log('switch version to', userVersion)
    const newUrl = `package://${repoUrl.replace('https://', '')}?version=${userVersion}`
    webContents.loadURL(newUrl)
  }
  const m = await createMenu(displayName, version, repo, switchVersion)
  ModuleRegistry.emit('menu-available', m)
}


// hot load protocol

const scheme = 'package'

const prepareUninitialized = async (repoUrl : string, service : string, queryArgs : any, handler : any) => {
  let template = fs.readFileSync(__dirname+'/../electron/ui/splash.html', 'utf8')

  // hack: id is used for window detection to get a mapping from app to window
  const windowId = Math.random().toString(26).slice(2)
  const windowTitle = `Electron App Manager - ${windowId}`

  // replace the default title with identifier
  template = template.replace('$WINDOW.TITLE$', windowTitle)

  const serviceName = service
  let serviceLogo = ''
  
  // FIXME make more flexible: move this to repo
  if (service === 'GitHub') {
    serviceLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpFNTE3OEEzMjk5QTAxMUUyOUExNUJDMTA0NkE4OTA0RCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDoyQTQxNEFCQzk5QTExMUUyOUExNUJDMTA0NkE4OTA0RCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU1MTc4QTMwOTlBMDExRTI5QTE1QkMxMDQ2QTg5MDREIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU1MTc4QTMxOTlBMDExRTI5QTE1QkMxMDQ2QTg5MDREIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+R7ClIwAADR5JREFUeNrsnQuw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'
  } 
  else if (service === 'Swarm') {
    serviceLogo = 'data:image/png;base64,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'
  }

  template = template.replace('$app.info$', JSON.stringify({
    name: serviceName,
    logo: serviceLogo,
    version: 'latest'
  }))

  // TODO use timeout?
  findWebContentsByTitle(windowTitle, (webContents : Electron.WebContents) => {
    loadRemoteApp(repoUrl, queryArgs, webContents)
  })


  let result = handler({ mimeType: 'text/html', data: Buffer.from(template) })

  return result
}

const hotLoadProtocolHandler = async (fileUri : string, handler : any) => {

  console.log('handle request', fileUri)
  
  // extract query params
  let url_parts = url.parse(fileUri, true)
  let query = url_parts.query
  // remove query args
  let qParamsIndex = fileUri.indexOf('?')
  if(qParamsIndex > -1) {
    fileUri = fileUri.substring(0, qParamsIndex)
  }

  if (fileUri.includes('github')) {
    // replace custom protocol
    const repoUrl = `https://${fileUri}`
    return prepareUninitialized(repoUrl, 'GitHub', query, handler)
  }

  if (fileUri.includes('bzz//')){
    const repoUrl = fileUri.replace('bzz//', 'bzz://')
    return prepareUninitialized(repoUrl, 'Swarm', query, handler)
  }

  // console.log('load', fileUri)
  const filePath = fileUri
  const parts = fileUri.split('/')

  // console.log('HOT-LOAD: received request', fileUri)

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
  const pkg = ModuleRegistry.getPackage(moduleId)
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