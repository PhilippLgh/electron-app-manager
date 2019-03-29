import { IRemoteRepository } from './api/IRepository'
import Cache from './repositories/Cache'
import { IRelease, IReleaseExtended } from './api/IRelease'
import fs from 'fs'
import path from 'path'
import RepoBase from './api/RepoBase'
import MenuBuilder from './electron/menu'
import { getRepository } from './repositories'
import ModuleRegistry from './ModuleRegistry';
import { getEthpkg } from './util';


let showSplash : any = null
let autoUpdater : any, CancellationToken : any = null
let dialogs : any = null
try {
  let eu = require("electron-updater")
  autoUpdater = eu.autoUpdater
  autoUpdater.allowDowngrade = false
  CancellationToken = eu.CancellationToken
  dialogs = require('./electron/Dialog').ElectronDialogs
  showSplash = require('./electron/ui/show-splash').showSplash
} catch (error) {
  console.log('error during require of electron modules' /*, error*/)
}

interface IUpdateInfo {
  updateAvailable : boolean,
  source: string,
  latest: IRelease | null
}

interface IUpdaterOptions {
  repository: string;
  auto?: boolean;
  electron?: boolean,
  intervalMins?: number,
  cacheDir?: string;
  downloadDir?: string;
  modifiers? : { [key : string] : Function }
  filter?: Function
}

const SOURCES = {
  CACHE: 'Cache',
  HOTLOADER: 'HotLoader',
  ELECTRON: 'Electron'
}

export default class AppManager extends RepoBase{
  
  remote: IRemoteRepository;
  cache: Cache;
  checkUpdateHandler: any; // IntervalHandler
  private menuBuilder: MenuBuilder;
  private isElectron: boolean = false;
  
  /**
   *
   */
  constructor({ repository, auto = true, electron = false, intervalMins = 15, cacheDir, modifiers, filter } : IUpdaterOptions) {
    super();

    this.remote = getRepository(repository, modifiers, filter)

    this.menuBuilder = new MenuBuilder(this)

    if(cacheDir){
      this.cache = new Cache(cacheDir)
    } else {
      this.cache = new Cache(process.cwd())
    }

    this.checkForUpdates = this.checkForUpdates.bind(this)

    // order important: needs to be set before auto update routine
    if(electron){
      this.isElectron = electron
      this.setupAutoUpdater()
    }

    if(auto){
      if (intervalMins <= 5 || intervalMins > (24 * 60)) {
        throw new Error(`Interval ${intervalMins} (min) is unreasonable or not within api limits`)
      }
      let intervalMs = intervalMins * 60 * 1000
      this.startUpdateRoutine(intervalMs)
    }

  }

  private setupAutoUpdater () {
    // silence autoUpdater -> we will use events and our logging instead
    autoUpdater.logger = {
      info: () => {},
      warn: () => {},
      error: () => {},
    }
    autoUpdater.on('checking-for-update', () => {
      this.emit('checking-for-update')
    })
    autoUpdater.on('update-available', (info : any) => {
      this.emit('update-available')
    })
    autoUpdater.on('update-not-available', (info : any) => {
      this.emit('update-not-available')
    })
    autoUpdater.on('error', (err : Error) => {
      this.emit('error', err)
    })
    autoUpdater.on('download-progress', (progressObj : any) => {
    })
    autoUpdater.on('update-downloaded', (info : any) => {
      this.emit('update-downloaded')
    })
  }

  get repository() : string {
    return this.remote.repositoryUrl
  }

  get cacheDir() : string {
    return this.cache.cacheDirPath
  }

  get hotLoadedApp() : IRelease | null {
    return null // FIXME
    /*
    if(this.hotLoader.currentApp === null) {
      return null
    }
    let hotLoaded = this.hotLoader.currentApp
    // this is important to determine the source of the latest release
    hotLoaded.repository = SOURCES.HOTLOADER
    return hotLoaded
    */
  }

  private startUpdateRoutine(intervalMs : number){
    if (this.checkUpdateHandler) {
      throw new Error('Update routine was started multiple times')
    }
    let errorCounter = 0

    const check = async () => {
      console.log('checking for updates')


      let result = await this.checkForUpdatesAndNotify()

      /*
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
      */
    }

    // currently only implemented for electron updater: app updater uses hot loader
    if(this.isElectron) {
      check()
      this.checkUpdateHandler = setInterval(check, intervalMs)
    }
  }

  async checkForUpdates() : Promise<IUpdateInfo> {

    if(this.isElectron) {
      // doesn't work in dev mode without 'dev-app-update.yml': 
      // https://github.com/electron-userland/electron-builder/issues/1505
      try {
        const updateCheckResult = await autoUpdater.checkForUpdates()
        
        // no updates available
        if(!updateCheckResult || !updateCheckResult.downloadPromise) {
          console.log('update not found')
          return {
            updateAvailable: false,
            source: SOURCES.ELECTRON,
            latest: null
          } 
        }

        // https://www.electron.build/auto-update#updateinfo
        let { updateInfo } = updateCheckResult
        console.log('update found', updateInfo)
        let {
          version,
          releaseName,
          releaseNotes,
          releaseDate,
          stagingPercentage
        } = updateInfo
        return {
          updateAvailable: true, // for the moment, this info is sufficient
          source: SOURCES.ELECTRON,
          // FIXME properly convert electron-builders updateInfo to IRelease
          latest: {
            name: releaseName,
            displayName: releaseName,
            version,
            channel: 'production',
            fileName: '',
            commit: '',
            size: 0,
            publishedDate: releaseDate,
            tag: '',
            location: '',
            repository: '',
            error: undefined
          } 
        } 

      } catch (error) {
        console.log('electron-builder updater error' /*, error*/)
      }

      return {
        updateAvailable: false,
        source: SOURCES.ELECTRON,
        latest: null
      }
    }

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

  async checkForUpdatesAndNotify() {
    if(this.isElectron) {
      const {updateAvailable, latest} = await this.checkForUpdates()
      if(updateAvailable && latest) {
        if(dialogs) {
          let {displayName, version} = latest
          dialogs.displayUpdateFoundDialog(displayName, version, async (shouldInstall : boolean) => {
            if(shouldInstall) {
              // TODO check if we can use UpdateInfo instead
              const cancellationToken = new CancellationToken()
              try {
                await autoUpdater.downloadUpdate(cancellationToken)
              } catch (error) {
                // TODO handle download errors                
              }
              try {
                autoUpdater.quitAndInstall() 
              } catch (error) {
                // TODO handle restart errors                                
              }
            }
          })
        }
      }
    } else {
      throw new Error('not implemented')
    }
  }

  async getReleases(){
    return this.remote.getReleases()
  }

  async getLatestCached(){
    return this.cache.getLatest()
  }

  async getLatestRemote(filter? : string){
    return await this.remote.getLatest(filter)
  }

  async getLatest(filter? : string) : Promise<IRelease | null>{
    const latestCached = await this.cache.getLatest(filter)
    const latestRemote = await this.remote.getLatest(filter)
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
  async load(pkgLocation : IRelease | Buffer | string) : Promise<string> {
    const pkg = await getEthpkg(pkgLocation)
    let appUrl = await ModuleRegistry.add(pkg)
    return appUrl
  }

  async createMenuTemplate(onReload : Function) {
    return this.menuBuilder.createMenuTemplate(onReload)
  }
  async updateMenuVersion(version : string) {
    return this.menuBuilder.updateMenuVersion(version)
  }

  async getLocalPackage(release : IRelease) {
    return this.cache.getPackage(release)
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
