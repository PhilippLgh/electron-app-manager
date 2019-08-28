import { IRemoteRepository, IFetchOptions, IDownloadOptions } from './api/IRepository'
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
import { downloadJson } from './lib/downloader'


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
  searchPaths?: string[],
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
  private caches: Cache[];
  checkUpdateHandler: any; // IntervalHandler
  private menuBuilder: MenuBuilder;
  private isElectron: boolean = false;
  
  /**
   *
   */
  constructor({ repository, auto = true, electron = false, intervalMins = 15, cacheDir, searchPaths = [], modifiers, filter, prefix } : IUpdaterOptions) {
    super();

    this.remote = getRepository(repository, modifiers, filter, prefix)

    this.menuBuilder = new MenuBuilder(this)

    // there should only be one cache directory so that some things
    // can work (e.g. download) automatically. However, we might need to look for 
    // packages in multiple locations. This is what searchPaths is for
    if(cacheDir){
      this.cache = new Cache(cacheDir)
    } else {
      this.cache = new Cache(process.cwd())
    }

    this.caches = [this.cache]
    if(searchPaths){
      searchPaths.forEach(searchPath => {
        try {
          this.caches.push(new Cache(searchPath))
        } catch (error) {
          console.log('WARNING: could not search in search path: '+searchPath)
        }
      })
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
      // start update routine
      this.checkUpdateHandler = setInterval(this.checkForUpdatesAndNotify.bind(this), intervalMs)

      // first run with small delay so that dialog doesn't block app start
      setTimeout(() => {
        this.checkForUpdatesAndNotify()
      }, 1 * 60 * 1000)
      
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
    // autoUpdater.autoInstallOnAppQuit = false
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

  async clearCache() {
    if (this.caches) {
      for (const cache of this.caches) {
        await cache.clear()        
      }
    } else {
      return this.cache.clear()
    }
  }

  async checkForElectronUpdates() : Promise<IUpdateInfo> {
    // doesn't work in dev mode without 'dev-app-update.yml': 
    // https://github.com/electron-userland/electron-builder/issues/1505
    try {

      // use electron's autoUpdater to check for updates
      // https://electronjs.org/docs/api/auto-updater#autoupdatercheckforupdates
      const updateCheckResult = await autoUpdater.checkForUpdates()
      
      // no updates available
      // FIXME hack: we are using the presence of the cancellationToken to determine if an update is available according to
      // https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/AppUpdater.ts#L382
      // we could also use `downloadPromise` which would be null though if auto-download is set to false
      if(!updateCheckResult || !updateCheckResult.cancellationToken) {
        console.log('electron update not found', updateCheckResult)
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
          displayVersion: version,
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

    if (!this.isElectron) {
      this.emit('checking-for-update')
      const {updateAvailable, latest} = await this.checkForUpdates()
      // in case of application packages the default is to
      // just silently download updates in the background
      if (updateAvailable && latest !== null) {
        this.emit('update-available', latest)
        this.download(latest)
      } else {
        this.emit('update-not-available')
      }
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

    // console.log('update info:', updateAvailable, latest)

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

  async getRemoteReleases({sort = true} : IFetchOptions = {}){
    return this.remote.getReleases({ sort })
  }

  async getReleases(options? : IFetchOptions){
    const cachedReleases = await this.cache.getReleases({ sort : false })
    const remoteReleases = await this.getRemoteReleases({ sort : false })
    const allReleases = [
      ...cachedReleases,
      ...remoteReleases
    ]
    return allReleases.sort(this.compareVersions)
  }

  async getLatestCached(filter? : string){
    if (this.caches) {
      let promises = this.caches.map(c => c.getLatest(filter))
      let latest = await Promise.all(promises)
      return this._getLatest(latest)
    }
    return this.cache.getLatest()
  }

  async getLatestRemote(options : IFetchOptions){
    let { filter, download, verify } = options
    let release = await this.remote.getLatest(filter)
    if (release === null) {
      return null
    }
    const { name } = release
    if (release && download) {
      const { downloadOptions } = options
      const downloadResult = await this.download(release, downloadOptions)
      if (downloadResult && verify && !downloadResult.verificationResult) {
        throw new Error(`Error: External package ${name} has no verification info.`)
      }
      return downloadResult
    }
    return release
  }

  async getLatest(options : IFetchOptions = {}) : Promise<IRelease | null>{
    const { filter, download, verify } = options
    const latestCached = await this.getLatestCached(filter)
    const latestRemote = await this.getLatestRemote({
      filter,
      download: false,
      verify
    })
    const latestHotLoaded = this.hotLoadedApp
    const latest = this._getLatest([latestCached, latestHotLoaded, latestRemote])
    if (latest && latest.remote && download) {
      const { downloadOptions } = options
      const downloadResult = await this.download(latest, downloadOptions)
      if (downloadResult && verify && !downloadResult.verificationResult) {
        throw new Error(`Error: External package ${name} has no verification info.`)
      }
      return downloadResult
    }
    return latest
  }

  private _getLatest(_releases: Array<IRelease | null>){
    // remove null, undefined
    let releases = [..._releases].filter(this.notEmpty)

    if(releases.length <= 0) {
      return null
    }

    releases = releases.sort(this.compareVersions)

    // handle the common case of remote and local  (cached)
    // having same version. in this case we want to always return cached
    if (releases.length > 1) {
      if (releases[0].version === releases[1].version) {
        if(releases[0].remote && !releases[1].remote) {
          return releases[1]
        }
      }
    }

    // to determine from where the latest release comes use the repository tag on the release
    return releases[0]
  }

  async download(release : IRelease, {
    writePackageData = true, 
    writeDetachedMetadata = true, 
    targetDir = this.cache.cacheDirPath,
    onProgress = (progress : number, release?: IRelease) => {}
  } : IDownloadOptions = {} ){

    let pp = 0;
    let _onProgress = (p : number) => {
      let pn = Math.floor(p * 100);
      if (pn > pp) {
        pp = pn;
        // console.log(`downloading update..  ${pn}%`)
        this.emit('update-progress', release, pn)
        if (onProgress) {
          onProgress(pn, release)
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
      // TODO write to .temp and rename to minimize risk of corrupted downloads
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

  static async downloadJson(_url : string) {
    return downloadJson(_url)
  }

}
