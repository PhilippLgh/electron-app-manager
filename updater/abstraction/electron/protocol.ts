const url = require('url')
import IProtocol from '../IProtocol'
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


class Protocol implements IProtocol {
  registerProtocolHandler(scheme: string, handler: Function) {
    const init = () => {
      // TODO intercepting not the same as registering
      // console.log('register protocol handler for', scheme)
      if(scheme === 'file'){
        protocol.interceptBufferProtocol('file', (request : any, cb: (buffer?: Buffer) => void) => {
          const fileUri = getFilePath(request)
          handler(fileUri, cb)
        })
      } else {
        protocol.registerBufferProtocol(scheme, (request : any, cb: (buffer?: Buffer) => void) => {
          const fileUri = getFilePath(request)
          handler(fileUri, cb)
        })
      }
    }
    if(app.isReady()) {
      init()
    } else (
      app.once('ready', init)
    )
  }
}

export default new Protocol()
