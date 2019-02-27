const fs = require('fs')

import protocol from '../abstraction/protocol'

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
  const scheme = 'hotload' //'file'
  protocol.registerProtocolHandler(scheme, (fileUri : string, handler : any) => {

    const filePath = fileUri
    const fp = filePath.replace((scheme + '://'), '')
    const parts = fp.split('/')

    parts.shift() // remove leading /

    if(parts.length < 2) {
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

  return `${scheme}:` // return the protocol we are using
}

function addZipSupport(zip : any, zipModuleId : string) {
  // TODO add method to unload modules
  // register module / zip
  registeredModules[zipModuleId] = zip
  return registerProtocolHandler()
}

module.exports = addZipSupport
