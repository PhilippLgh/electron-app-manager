const url = require('url')
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

function registerProtocolHandler(zip) {
  protocol.interceptBufferProtocol('file', async (request, handler) => {
    const filePath = getFilePath(request)
    const zipPath = filePath.indexOf(".zip")
    const fileRelPath = filePath.substr(zipPath + 4 + 1) //path/to/file.zip/index.html => index.html ('.zip/'=5)
    const file = await zip.getEntry(fileRelPath)
    if (file) {
      const content = await file.getData()
      handler(content)
    } else {
      handler(-2)
    }

  }, (error) => {
    if (error) console.error('Failed to register protocol')
  })
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
