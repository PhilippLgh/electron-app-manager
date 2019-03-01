import { IRelease } from "./api/IRelease"
import url from 'url'
import { pkgsign } from '@philipplgh/ethpkg'

import { md5 } from './lib/hashes'
const addZip = require('./lib/add-zip-support')

const isRelease = <IRelease>(value: any): value is IRelease => {
  return value !== null && value !== undefined && !value.error && value.version
}

const isCached = <IRelease>(value: any): value is IRelease => {
 // @ts-ignore 
  return isRelease(value) && value.repository === 'Cache'
}

export default class AppLoader {
  static async load(app : IRelease | Buffer | string) : Promise<string> {
  
    let pkg
    if(Buffer.isBuffer(app) || typeof app === 'string') {
      pkg = await pkgsign.loadPackage(app)
    }
    else if(isRelease(app)) {
      // TODO if local
      pkg = await pkgsign.loadPackage(app.location)
    }
    else {
      throw new Error('unsupported package format')
    }

    // TODO make sanity check or throw
    if(await pkgsign.isSigned(pkg)) {
      console.log('is signed')
    } else {
      console.log('not signed')
    }
    /*
    if (pkg.isSignedPackage(data)) {
      console.log('package is ethereum signed package')
    } else {
    }
    */

    // FIXME throw exception if fingerprint cannot be retrieved: does only exist on IReleaseExtended
    // @ts-ignore 
    // let releaseFingerprint = release.checksums.sha1
    const releaseFingerprint = '12345' //FIXME md5(`${release.name} - ${release.tag}`)

    /**
     * TODO things to consider:
     * this is *magic* and magic is usually not a good thing
     * it will overwrite other interceptors - it seems there can only be one which might be a bug
     * this will only allow to read from one zip which is probably intended
     * it will also completely deactivate fs access for files outside the zip which could be a good thing 
     */
    let protocol = addZip(pkg, releaseFingerprint)
    const appUrl = url.format({
      slashes: true,
      protocol,
      pathname: `${releaseFingerprint}/index.html`, // path does only exist in memory
    })
    console.log('HOT-LOAD: provide app at ' + appUrl)
    return appUrl
  }
}