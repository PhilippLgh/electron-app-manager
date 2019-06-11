import { IRemoteRepository } from './api/IRepository'
import Cache from './repositories/Cache'
import { IRelease, IReleaseExtended, IInvalidRelease } from './api/IRelease'
import fs from 'fs'
import path from 'path'
import RepoBase from './api/RepoBase'
import MenuBuilder from './electron/menu'
import { getRepository } from './repositories'
import ModuleRegistry from './ModuleRegistry'
import { getEthpkg, isElectron, isPackaged } from './util'
import { pkgsign } from 'ethpkg'


let autoUpdater : any, CancellationToken : any = null
let dialogs : any = null
if(isElectron()) {
  try {
    let eu = require("electron-updater")
    autoUpdater = eu.autoUpdater
    CancellationToken = eu.CancellationToken
    dialogs = require('./electron/Dialog').ElectronDialogs
  } catch (error) {
    console.log('error during require of electron modules', error && error.message /*, error*/)
  }
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
  filter?: Function,
  prefix? : string
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
  constructor({ repository, auto = true, electron = false, intervalMins = 15, cacheDir, modifiers, filter, prefix } : IUpdaterOptions) {
    super();

    this.remote = getRepository(repository, modifiers, filter, prefix)

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
      // currently auto-update only implemented for electron updater: app updater uses hot loader
      if(!this.isElectron) {
        return
      }

      if (intervalMins <= 5 || intervalMins > (24 * 60)) {
        throw new Error(`Interval ${intervalMins} (min) is unreasonable or not within api limits`)
      }
      let intervalMs = intervalMins * 60 * 1000
      // start update routine
      this.checkUpdateHandler = setInterval(this.checkForUpdatesAndNotify, intervalMs)

      // first run with zero delay
      this.checkForUpdatesAndNotify()
    }
  }

  private setupAutoUpdater () {
    // silence autoUpdater -> we will use events and our logging instead
    autoUpdater.logger = {
      info: () => {},
      warn: () => {},
      error: () => {},
    }
    autoUpdater.allowDowngrade = false
    autoUpdater.autoDownload = false
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
      if (!dialogs) {return}
      dialogs.displayUpdateError(err)
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

  cancelUpdateRoutine() {
    if(!this.checkUpdateHandler) {
      return
    }
    clearInterval(this.checkUpdateHandler)
  }

  async checkForElectronUpdates() : Promise<IUpdateInfo> {
    // doesn't work in dev mode without 'dev-app-update.yml': 
    // https://github.com/electron-userland/electron-builder/issues/1505
    try {

      // use electron's autoUpdater to check for updates
      // https://electronjs.org/docs/api/auto-updater#autoupdatercheckforupdates
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
          error: undefined,
          remote: true
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
  async checkForUpdates() : Promise<IUpdateInfo> {

    if(this.isElectron) {
      return this.checkForElectronUpdates()
    }
    // else: ui / app updater
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

  async checkForUpdatesAndNotify(showNoUpdateDialog = false) {

    // updater works only for shell
    if (!this.isElectron) {
      return
    }

    // isPackaged is a safe guard for
    // https://electronjs.org/docs/api/auto-updater#macos
    // "Note: Your application must be signed for automatic updates on macOS. This is a requirement of Squirrel.Mac"
    if (!isPackaged()) {
      console.log('updater cannot be executed on unsigned applications - routine cancelled')
      this.cancelUpdateRoutine()
      return
    }

    if (!dialogs) {
      // TODO handle without dialog
      console.warn('dialogs not set')
      return
    }

    const {updateAvailable, latest} = await this.checkForUpdates()

    // display "no update found" dialog if there is no update or "latest" version
    if (!updateAvailable || !latest) {
      if (dialogs && showNoUpdateDialog) {
        dialogs.displayUpToDateDialog()
      }
      return
    }

    // there is a later version: use info from latest for "update found" dialog
    let {displayName, version} = latest
    dialogs.displayUpdateFoundDialog(displayName, version, async (shouldInstall : boolean) => {
      if(!shouldInstall) {
        console.log('user skipped update')
        return
      }
      // TODO check if we can use UpdateInfo instead
      const cancellationToken = new CancellationToken()
      try {
        await autoUpdater.downloadUpdate(cancellationToken)
        dialogs.displayRestartForUpdateDialog(() => {
          // https://github.com/electron-userland/electron-builder/issues/3402#issuecomment-436913714
          // "you need to wrap quitAndInstall in setImmediate if called from dialog"
          setImmediate(() => autoUpdater.quitAndInstall())
        })
      } catch (error) {
        dialogs.displayUpdateError(error)            
      }
    })
  }

  async getCachedReleases(){
    return this.cache.getReleases()
  }

  async getRemoteReleases(){
    return this.remote.getReleases()
  }

  async getReleases(){
    const cachedReleases = await this.cache.getReleases({sort : false})
    const remoteReleases = await this.remote.getReleases({sort : false})
    const allReleases = [
      ...cachedReleases,
      ...remoteReleases
    ]
    return allReleases.sort(this.compareVersions)
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

  async download(release : IRelease, {
    writePackageData = true, 
    writeDetachedMetadata = true, 
    targetDir = this.cache.cacheDirPath,
    onProgress = (progress : number) => {}
  } = {} ){

    let pp = 0;
    let _onProgress = (p : number) => {
      let pn = Math.floor(p * 100);
      if (pn > pp) {
        pp = pn;
        // console.log(`downloading update..  ${pn}%`)
        this.emit('update-progress', release, pn)
        if (onProgress) {
          onProgress(pn)
        }
      }
    }
    const packageData = await this.remote.download(release, _onProgress)
    const location = path.join(targetDir, release.fileName)

    // verify package signature: TODO we can enforce a policy here that invalid
    // packages are not even written to disk
    const pkg = await getEthpkg(packageData)
    const verificationResult = await pkgsign.verify(pkg!)

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
        remote: false,
        verificationResult,
        data: packageData
      }
    }

    this.emit('update-downloaded', release)

    return {
      ...release,
      remote: false,
      verificationResult,
      location
    }
  }
  
  async load(pkgLocation : IRelease | Buffer | string) : Promise<string> {
    const pkg = await getEthpkg(pkgLocation)
    let appUrl = await ModuleRegistry.add({
      pkg
    })
    return appUrl
  }

  static on(channel : string, cb : (...args: any[]) => void) : any {
    if (channel === 'menu-available') {
      ModuleRegistry.on('menu-available', cb)
    } else {
      throw new Error('unsupported event type: '+channel)
    }
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
