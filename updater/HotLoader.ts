import url from 'url'
import { IRelease, IReleaseExtended } from "./api/IRelease";
import AppManager from "./AppManager";
//@ts-ignore
import AdmZip from 'adm-zip'

import { md5 } from './lib/hashes'

let addZip : any = null
let showSplash : any = null
try {
  showSplash = require('./electron//ui/show-splash').showSplash
  addZip = require('./electron/electron-zip-support')  
} catch (error) {
  console.log('error during require of electron modules', error)
}
export default class HotLoader {
  
  appManager: AppManager;

  private _currentApp: IRelease | null = null;

  constructor(appManager : AppManager){
    this.appManager = appManager
  }

  get currentApp() {
    return this._currentApp
  }

  set currentApp(app : IRelease | null) {
    this._currentApp = app
  }

  showSplashscreen() {
    showSplash(this.appManager)
  }

  async loadLatest() {
    return this._load()
  }

  async load(release : IRelease) {

    return this._load(release)
  }

  async _load(release? : IRelease | undefined) {

    showSplash(this.appManager)

    if(!release){
      release = await this.appManager.getLatestRemote() || undefined
    }

    if(!release){
      throw new Error('hot load failed: no release was provided or found')
    }

    this.currentApp = release

    // console.log('hot load release', release)
    const result = await this.appManager.download(release, {writePackageData: false})
      
    // @ts-ignore
    const { data } = result

    let zip = new AdmZip(data)

    // TODO make sanity check or throw
    // console.log('entries', zip.getEntries().length)

    // FIXME throw exception if fingerprint cannot be retrieved: does only exist on IReleaseExtended
    // @ts-ignore 
    // let releaseFingerprint = release.checksums.sha1
    let releaseFingerprint = md5(`${release.name} - ${release.tag}`)
    
    // allows renderer to access files within zip in memory
    /**
     * TODO things to consider:
     * this is *magic* and magic is usually not a good thing
     * it will overwrite other interceptors - it seems there can only be one which might be a bug
     * this will only allow to read from one zip which is probably intended
     * it will also completely deactivate fs access for files outside the zip which could be a good thing 
     */
    addZip(zip, releaseFingerprint)

    const electronUrl = url.format({
      slashes: true,
      protocol: 'file:', // even though not 100% correct we are using file and not a custom protocol for the moment
      pathname: `hotloader/${releaseFingerprint}/index.html`, // path does only exist in memory
    })

    return electronUrl
  }
  
  // async getZipUrl(indexHtml) {
  //   /*
  //   let result = {}
  //   const { location } = app;
  //   let _result = await request("HEAD", location);
  //   let headers = _result.headers;
  //   let zipUrl = location
  //   if (headers.status === "302 Found" && headers.location) {
  //     zipUrl = headers.location
  //   }
  //   let remoteZip = new RemoteZip(zipUrl)
  //   addZip(remoteZip)
  // }

}