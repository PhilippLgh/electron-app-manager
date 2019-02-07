const url = require('url')
const fs = require('fs')
const { app, protocol } = require('electron')

function getFilePath(request: any) {
  const uri = url.parse(request.url)
  let filePath = decodeURIComponent(uri.pathname)
  // pathname has a leading '/' on Win32 for some reason
  if (process.platform === 'win32') {
    filePath = filePath.slice(1)
  }
  return filePath
}

let isRegistered = false

let registeredModules : {[index:string] : any} = {}

function handleRequest(moduleId : string, relFilePath : string, handler : Function){
  console.log('handle request', moduleId, relFilePath)
  if (registeredModules[moduleId] === undefined) {
    throw new Error('requested content cannot be served: module not found / loaded')
  }
  const zip = registeredModules[moduleId]
  const file = zip.getEntry(relFilePath)
  if (file) {
    const content = file.getData()
    return handler(content)
  } else {
    console.log('HOT-LOAD WARNING: file not found in zip', relFilePath)
    return handler(-2)
  }
}

function registerProtocolHandler() {
  if(isRegistered) {
    return
  }
  protocol.interceptBufferProtocol('file', async (request : any, handler : any) => {
    console.log('HOT-LOAD: updater intercepted request to', request.url)
    const filePath = getFilePath(request)

    const fp = filePath.replace('file://', '')
    const parts = fp.split('/')

    parts.shift() // remove leading /

    if(parts.length < 2 || (parts.shift() !== 'hotloader')) {
      console.log('HOT-LOAD: no hotloader url found: fallback to fs', filePath)
      let content = fs.readFileSync(filePath)
      return handler(content)
    }
    
    const moduleId = parts.shift() as string
    const relFilePath = parts.join('/')
    return handleRequest(moduleId, `${relFilePath}`, handler)

  }, (error : any) => {
    if (error) console.error('Failed to register protocol')
  })
  isRegistered = true
}

function addZipSupport(zip : any, zipModuleId : string) {
  const init = () => {

    // TODO add method to unload modules
    // register module / zip
    registeredModules[zipModuleId] = zip

    registerProtocolHandler()
  }
  if(app.isReady()) {
    init()
  } else (
    app.once('ready', init)
  )
}
module.exports = addZipSupport
