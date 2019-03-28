import { IRelease } from "./api/IRelease"
import url from 'url'
import { pkgsign } from '@philipplgh/ethpkg'

import { md5 } from './lib/hashes'
import { download } from "./lib/downloader";
import { isUrl } from "./util";
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
  
    let releaseFingerprint = 'unknown'
    let pkg
    if(Buffer.isBuffer(app)) {
      pkg = await pkgsign.loadPackage(app)
      releaseFingerprint = md5(app)
    } 
    else if (typeof app === 'string') {
      if (isUrl(app)) {
        const appBuf = await download(app)
        pkg = await pkgsign.loadPackage(appBuf)
      } else {
        pkg = await pkgsign.loadPackage(app)
      }
      releaseFingerprint = md5(app)
    }
    else if(isRelease(app)) {
      // TODO if local
      pkg = await pkgsign.loadPackage(app.location)
      releaseFingerprint = md5(`${app.name} - ${app.tag}`)
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
    console.log('serve hot-loaded app from', releaseFingerprint)

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