const fs = require('fs')

import protocol from '../abstraction/protocol'
import { IRelease } from '../api/IRelease';
import { md5 } from './hashes'
import { IPackage } from '@philipplgh/ethpkg'

let isRegistered = false

let registeredModules : {[index:string] : any} = {}

async function handleRequest(moduleId : string, relFilePath : string, handler : Function){
  console.log('handle request', moduleId, relFilePath)
  if (registeredModules[moduleId] === undefined) {
    throw new Error('requested content cannot be served: module not found / loaded')
  }
  const zip = registeredModules[moduleId] as IPackage
  const entry = await zip.getEntry(relFilePath)
  if (entry) {
    const content = await entry.file.readContent()
    return handler(content)
  } else {
    console.log('HOT-LOAD WARNING: file not found in zip', relFilePath)
    return handler(-2)
  }
}

function registerProtocolHandler() : string {
  const scheme = 'hotload' //'file'
  if(isRegistered) {
    return `${scheme}:`
  }
  protocol.registerProtocolHandler(scheme, async (fileUri : string, handler : any) => {

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
    return await handleRequest(moduleId, `${relFilePath}`, handler)
  }, (error : any) => {
    if (error) console.error('Failed to register protocol')
  })
  isRegistered = true

  return `${scheme}:` // return the protocol we are using
}

function addZipSupport(pkg : IPackage, packageId : string) {
  // TODO add method to unload modules
  // register pkg
  const releaseFingerprint = packageId //md5(`${release.name} - ${release.tag}`)
  registeredModules[releaseFingerprint] = pkg

  return registerProtocolHandler()
}

module.exports = addZipSupport
