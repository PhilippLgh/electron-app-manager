const url = require('url')
const fs = require('fs')
const { app, protocol } = require('electron')

function getFilePath(request) {
  const uri = url.parse(request.url)
  let filePath = decodeURIComponent(uri.pathname)
  // pathname has a leading '/' on Win32 for some reason
  if (process.platform === 'win32') {
    filePath = filePath.slice(1)
  }
  return filePath
}

let isRegistered = false

function registerProtocolHandler(zip) {
  if(isRegistered) return
  protocol.interceptBufferProtocol('file', async (request, handler) => {
    console.log('updater intercepted request to', request.url)
    const filePath = getFilePath(request)
    const zipPath = filePath.indexOf(".zip")
    if(zipPath === -1){
      console.log('no .zip found: fallback to fs', filePath)
      let content = fs.readFileSync(filePath)
      handler(content)
    }else{
      let fileRelPath = filePath.substr(zipPath + 4 + 1) //path/to/file.zip/index.html => index.html ('.zip/'=5)
      console.log('read file from zip', fileRelPath)
      const file = await zip.getEntry(fileRelPath)
      if (file) {
        const content = await file.getData()
        handler(content)
      } else {
        handler(-2)
      }
    }
  }, (error) => {
    if (error) console.error('Failed to register protocol')
  })
  isRegistered = true
}

function addZipSupport(zip) {
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
