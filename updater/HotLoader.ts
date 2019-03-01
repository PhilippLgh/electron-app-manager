import { IRelease, IReleaseExtended } from "./api/IRelease";
import AppManager from "./AppManager";

const ethpkg = require('@philipplgh/ethpkg')

import PackageLoader from './PackageLoader'

let showSplash : any = null
try {
  showSplash = require('./electron/ui/show-splash').showSplash
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

    if(!release){
      showSplash(this.appManager)
      release = await this.appManager.getLatestRemote() || undefined
    } else {
      showSplash(this.appManager, release)
    }

    if(!release){
      throw new Error('hot load failed: no release was provided or found')
    }

    this.currentApp = release

    // console.log('hot load release', release)
    const result = await this.appManager.download(release, {writePackageData: false})
      
    // @ts-ignore
    const { data } = result

    // allows renderer to access files within zip in memory
    return PackageLoader.load(data)
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