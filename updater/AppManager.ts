import { IRemoteRepository } from './api/IRepository'
import GithubRepo from './repositories/Github'
import AzureRepo from './repositories/Azure'
import Cache from './repositories/Cache'
import { IRelease, IReleaseExtended } from './api/IRelease'
import fs from 'fs'
import path from 'path'
import HotLoader from './HotLoader'
import RepoBase from './api/RepoBase'
import MenuBuilder from './electron/menu'

interface IUpdateInfo {
  updateAvailable : boolean,
  source: string,
  latest: IRelease | null
}

interface IUpdaterOptions {
  repository: string;
  auto?: boolean;
  intervalMins?: number,
  cacheDir?: string;
  downloadDir?: string;
  modifiers? : { [key : string] : Function }
  filter?: Function
}

const SOURCES = {
  CACHE: 'Cache',
  HOTLOADER: 'HotLoader'
}

export default class AppManager extends RepoBase{
  
  remote: IRemoteRepository;
  cache: Cache;
  checkUpdateHandler: any; // IntervalHandler
  private hotLoader: HotLoader;
  private menuBuilder: MenuBuilder;
  
  /**
   *
   */
  constructor({ repository, auto = true, intervalMins = 15, cacheDir, modifiers, filter } : IUpdaterOptions) {
    super();

    if(repository.startsWith('https://github.com/')) {
      this.remote = new GithubRepo(repository)
    }
    else if(repository.includes('blob.core.windows.net')){

      // FIXME check that only host name provided or parse
      repository += '/builds?restype=container&comp=list'

      if(modifiers){
        let mod = (release : IRelease) => {
          let result : {[key:string] : any} = { }
          for(var m in modifiers){
            result[m] = modifiers[m](release)
          }
          return result
        }
        this.remote = new AzureRepo(repository, {
          onReleaseParsed: mod,
          filter
        })      
      } else {
        this.remote = new AzureRepo(repository)
      }
    }
    else {
      throw new Error('No repository strategy found for url: ' + repository)
    }

    this.hotLoader = new HotLoader(this)
    this.menuBuilder = new MenuBuilder(this)

    if(cacheDir){
      this.cache = new Cache(cacheDir)
    } else {
      this.cache = new Cache(process.cwd())
    }

    this.checkForUpdates = this.checkForUpdates.bind(this)

    if(auto){
      if (intervalMins <= 5 || intervalMins > (24 * 60)) {
        throw new Error(`Interval ${intervalMins} (min) is unreasonable or not within api limits`)
      }
      let intervalMs = intervalMins * 60 * 1000
      // FIXME this.startUpdateRoutine(intervalMs)
    }

  }

  get repository() : string {
    return this.remote.repositoryUrl
  }

  get cacheDir() : string {
    return this.cache.cacheDirPath
  }

  get hotLoadedApp() : IRelease | null {
    if(this.hotLoader.currentApp === null) {
      return null
    }
    let hotLoaded = this.hotLoader.currentApp
    // this is important to determine the source of the latest release
    hotLoaded.repository = SOURCES.HOTLOADER
    return hotLoaded
  }

  private startUpdateRoutine(intervalMs : number){
    if (this.checkUpdateHandler) {
      throw new Error('Update routine was started multiple times')
    }
    let errorCounter = 0

    const check = async () => {
      let { latest } = await this.checkForUpdates()
      if (latest && latest.version) {
        console.log('update found: downloading ', latest.version);
        try {
          let download = await this.download(latest)

        } catch (error) {
          errorCounter++
          console.error(error)
        }
      }
    }

    check()
    this.checkUpdateHandler = setInterval(check, intervalMs)
  }

  async checkForUpdates() : Promise<IUpdateInfo> {
    const latest = await this.getLatest()
    if(latest === null){
      return {
        updateAvailable: false,
        source: '',
        latest: null
      }
    }

    // latest release is not from remote -> no updates necessary
    if(latest.repository === SOURCES.CACHE || latest.repository === SOURCES.HOTLOADER){
      return {
        updateAvailable: false,
        source: latest.repository,
        latest: latest,
      }
    }

    return {
      updateAvailable: true,
      source: latest.repository,
      latest
    }
  }

  async getReleases(){
    return this.remote.getReleases()
  }

  async getLatestCached(){
    return this.cache.getLatest()
  }

  async getLatestRemote(){
    return await this.remote.getLatest()
  }

  async getLatest() : Promise<IRelease | null>{
    const latestCached = await this.cache.getLatest()
    const latestRemote = await this.remote.getLatest()
    const latestHotLoaded = this.hotLoadedApp

    // remove null, undefined
    let latestReleases = [latestCached, latestHotLoaded, latestRemote].filter(this.notEmpty)

    if(latestReleases.length <= 0) {
      return null
    }

    latestReleases = latestReleases.sort(this.compareVersions)

    // to determine from where the latest release comes use the repository tag on the release
    return latestReleases[0]
  }

  async download(release : IRelease, {writePackageData = true, writeDetachedMetadata = true, targetDir = this.cache.cacheDirPath} = {} ){

    let pp = 0;
    let onProgress = (p : number) => {
      let pn = Math.floor(p * 100);
      if (pn > pp) {
        pp = pn;
        // console.log(`downloading update..  ${pn}%`)
        this.emit('update-progress', release, pn);
      }
    }
    const packageData = await this.remote.download(release, onProgress)
    const location = path.join(targetDir, release.fileName)

    if(writePackageData){
      if(writeDetachedMetadata){
        const detachedMetadataPath = path.join(targetDir, release.fileName + '.metadata.json')
        fs.writeFileSync(detachedMetadataPath, JSON.stringify(release, null, 2))
      }
      // TODO patch package metadata if it doesn't exist
      fs.writeFileSync(location, packageData)
    } else{
      this.emit('update-downloaded', release)
      return {
        ...release,
        location: 'memory',
        data: packageData
      }
    }

    this.emit('update-downloaded', release)

    return {
      ...release,
      location
    }
  }
  async hotLoad(release : IRelease){
    // load app to memory and serve from there
    const hotUrl = await this.hotLoader.load(release)
    if(!hotUrl) return null
    return hotUrl
  }
  async hotLoadLatest() {
    const hotUrl = await this.hotLoader.loadLatest()
    if(!hotUrl) return null
    return hotUrl 
  }
  async persistHotLoaded() {

  }

  async createMenuTemplate(onReload : Function) {
    return this.menuBuilder.createMenuTemplate(onReload)
  }
  async updateMenuVersion(version : string) {
    return this.menuBuilder.updateMenuVersion(version)
  }

  async getEntries(release : IRelease){
    return this.cache.getEntries(release)
  }
  async getEntry(release : IRelease, entryPath : string){
    return this.cache.getEntry(release, entryPath)
  }
  async extract(release : IRelease){
    return this.cache.extract(release)
  }

}
