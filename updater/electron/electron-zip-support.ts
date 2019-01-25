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

function registerProtocolHandler(zip : any) {
  if(isRegistered) return
  protocol.interceptBufferProtocol('file', async (request : any, handler : any) => {
    console.log('HOT-LOAD: updater intercepted request to', request.url)
    const filePath = getFilePath(request)
    const zipPath = filePath.indexOf(".zip")
    if(zipPath === -1){
      console.log('HOT-LOAD: no .zip found: fallback to fs', filePath)
      let content = fs.readFileSync(filePath)
      handler(content)
    }else{
      let fileRelPath = filePath.substr(zipPath + 4 + 1) //path/to/file.zip/index.html => index.html ('.zip/'=5)
      const file = zip.getEntry(fileRelPath)
      if (file) {
        const content = file.getData()
        handler(content)
      } else {
        console.log('HOT-LOAD WARNING: file not found in zip', fileRelPath)
        handler(-2)
      }
    }
  }, (error : any) => {
    if (error) console.error('Failed to register protocol')
  })
  isRegistered = true
}

function addZipSupport(zip : any) {
  const init = () => {
    registerProtocolHandler(zip)
  }
  if(app.isReady()) {
    init()
  } else (
    app.once('ready', init)
  )
}
module.exports = addZipSupport
