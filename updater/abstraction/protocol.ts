
const is = {
  electron: () => {
    return 'electron' in process.versions
  },
  yue: () => {
    return true
  }
}

const RUNTIME = {
  ELECTRON: 'electron',
  YUE: 'yue',
  CARLO: 'carlo',
  UNKNOWN: 'unknown'
}

const abstraction = {
  runtime: () => {
    if(is.electron()){
      return RUNTIME.ELECTRON
    }
    else if (is.yue()){
      return RUNTIME.YUE
    }
    else {
      return RUNTIME.UNKNOWN
    }
  }
}

class Protocol implements IProtocol{
  registerProtocolHandler = async (scheme : string, handler: Function, onError? : Function) => {
    switch(abstraction.runtime()) {
      case RUNTIME.ELECTRON: {
        console.log('electron detected')
        const _protocol = require('./electron/protocol').default
        _protocol.registerProtocolHandler(scheme, handler)
        break;
      }
      case RUNTIME.YUE: {
        console.log('yue detected')
        const _protocol = require('./yue/protocol').default
        _protocol.registerProtocolHandler(scheme, handler)
        console.log('after register')
      }
    }
  }
}

export default new Protocol()
