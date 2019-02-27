
class Protocol /*implements IProtocol*/ {
  registerProtocolHandler(scheme: string, handler: Function) {
    console.log('register yue handler for scheme', scheme)
    // @ts-ignore
    const gui = global.gui //require('gui')
    gui.Browser.registerProtocol(scheme, (url : string) => {
      console.log('handle yue request', url)
      let contents = ''  // contents is buffer
      handler(url, (_contents : any) => {
        contents = _contents
      }) 
      let mime = 'text/html'
      if(url.endsWith('css')){
        mime = 'text/css'
      }
      if(url.endsWith('js')) {
        mime = 'text/javascript'
      }
      if(url.endsWith('otf')){
        mime = 'font/opentype'
      }
      return gui.ProtocolStringJob.create(mime, contents.toString())
    })
  }
}

export default new Protocol()
