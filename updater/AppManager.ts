import { EventEmitter } from 'events'
import url from 'url'
import fs from 'fs'
import Cache from './repositories/Cache'
import { IRepository, IFetchOptionsReleaseList, IFetchOptionsRelease, IDownloadOptions } from './api/IRepository'
import { getRepository } from './repositories'
import { compareVersions, getEthpkg, generateHostnameForRelease } from './util'
import { IRelease, IInvalidRelease, IVerifiedRelease } from './api/IRelease'
import semver from 'semver'
import { download } from './lib/downloader'
import { pkgsign, ethpkg } from 'ethpkg'
import { IVerificationResult } from 'ethpkg/dist/IVerificationResult'

export interface IAppManagerOptions {
  auto?: boolean,
  repository?: string;
  cacheDir?: string;
  prefix?: string;
  filter?: Function
}

export interface IUpdateInfo {
  updateAvailable : boolean,
  source: string,
  latest: IRelease | null
}

export const LOGLEVEL = {
  NORMAL: 0,
  WARN: 1,
  VERBOSE: 2
}

export default class AppManager extends EventEmitter {

  loglevel = LOGLEVEL.NORMAL;
  private remote?: IRepository;
  private cache?: Cache;
  private filter?: Function; // global release filter function
  private prefix?: string;
  private static modules: any = {};

  constructor({
    auto = true,
    repository,
    cacheDir,
    prefix,
    filter
  } : IAppManagerOptions = {}){

    super()

    if (repository) {
      this.remote = getRepository(repository)
    }

    if (cacheDir) {
      this.cache = new Cache(cacheDir)
    }

    this.filter = filter
    this.prefix = prefix

    if (auto) {
      // TODO start routine here
    }

  }

  get cacheDir() : string | undefined {
    if (!this.cache) return undefined
    return this.cache.cacheDirPath
  }

  private log(loglevel = LOGLEVEL.NORMAL, message: string, ...optionalParams: any[]) {
    if (this.loglevel >= loglevel) {
      console.log(message, optionalParams)
    }
  }

  /**
   * Clears the cache
   */
  public async clearCache() : Promise<void> {
    if (!this.cache) return
    return this.cache.clear()
  }

  /**
   * Returns all cached releases
   */
  private async getReleasesCached() : Promise<Array<IRelease | IInvalidRelease>> {
    if (!this.cache) {
      console.warn('Accessing an uninitialized Cache: getReleases()')
      return []
    }
    // TODO handle searchPaths
    return this.cache.getReleases()
  }

  /**
   * Returns all remote releases
   */
  private async getReleasesRemote(prefix? : string, timeout? : number) : Promise<Array<IRelease | IInvalidRelease>> {
    if (!this.remote) {
      console.warn('Accessing an uninitialized Repository: getReleases()')
      return []
    }
    return this.remote.getReleases(prefix)
  }

  /**
   * Returns all releases. Combines cached and remote releases
   * @param fetchOptions 
   */
  public async getAllReleases({
    sort = true,
    onlyCache = false,
    onlyRemote = false,
    version = undefined,
    filterInvalid = true,
    prefix,
    timeout = (30 * 1000)
  } : IFetchOptionsReleaseList = {}) : Promise<Array<IRelease | IInvalidRelease>> {

    const cachedReleases = onlyRemote ?  [] : await this.getReleasesCached()
    prefix = this.prefix || prefix
    const remoteReleases = onlyCache ? [] : await this.getReleasesRemote(prefix, timeout)

    let releases = [
      ...cachedReleases,
      ...remoteReleases
    ]

    if(version) {
      releases = releases.filter(release => {
        if (!('version' in release)) {
          return false
        }
        const coercedVersion = semver.coerce(release.version)
        const release_version = coercedVersion ? coercedVersion.version : release.version
        return semver.satisfies(release_version, version)
      })
    }

    const invalid = releases.filter(release => ('error' in release && release.error))
    if (invalid.length > 0) {
      this.log(LOGLEVEL.WARN, `detected ${invalid.length} corrupted releases found`)
      this.log(LOGLEVEL.VERBOSE, invalid.map(r => r.error).join('\n\n'))
    }

    if (filterInvalid) {
      releases = releases.filter(release => !('error' in release && release.error))
    }

    // apply global filter
    if (this.filter) {
      // catch errors in user-defined filter
      try {
        // FIXME
        // @ts-ignore 
        releases = releases.filter(this.filter)
      } catch (error) {
        
      }
    }

    if (sort) {
      releases =  releases.sort(compareVersions)
    }

    return releases
  }

  /**
   * @deprecated too close to "getRelease" -> renamed to getAllReleases
   * @param options 
   */
  public async getReleases(options: IFetchOptionsReleaseList = {}) : Promise<Array<IRelease | IInvalidRelease>> {
    return this.getAllReleases(options)
  }

  /**
   * Retrieves a single release 
   * @param options
   */
  public async getRelease({
    onlyCache = false,
    onlyRemote = false,
    version = undefined,
  } : IFetchOptionsRelease = {}) : Promise<IRelease | undefined> {

    const releases = await this.getReleases({
      onlyCache,
      onlyRemote,
      version,
      filterInvalid: true,
      sort: true
    }) as Array<IRelease>

    let latest = undefined

    if (releases.length > 0) {

      // handle the common case of remote and local  (cached)
      // having same version. in this case we want to always return cached
      if (releases.length > 1) {
        if (releases[0].version === releases[1].version) {
          if(releases[0].remote && !releases[1].remote) {
            latest = releases[1]
          }
        }
      }

      latest = releases[0]
    }

    if (!latest) return undefined

    // TODO ? 
    // extendWithMetdata()

    /*TODO
    if (release.signature){
      const signatureData = await download(release.signature)
      if (signatureData) {
        release.signature = signatureData.toString()
      }
    }
    */
    
    return latest
  }

  /**
   * Retrieves a single release
   * @deprecated renamed to getRelease
   * @param options 
   */
  public async getLatest(options : IFetchOptionsRelease) : Promise<IRelease | undefined> {
    return this.getRelease(options)
  }

  /**
   * A module is a downloaded and verified package that is kept in memory
   * and addressable via hostname
   * We can read files from the package with getResource
   */
  private async registerModule(release : IVerifiedRelease) : Promise<string> {
    const hostname = await generateHostnameForRelease(release)
    AppManager.modules[hostname] = release
    return hostname
  }

  private getModule(hostname : string) : IVerifiedRelease {
    return AppManager.modules[hostname]
  }

  /**
   * 
   */
  public async load(releaseOrInfo : string | undefined /*| IRelease*/, protocol? : string) : Promise<string | undefined> {
    // release string can be path, url or version
    let targetVersion = undefined
    if (typeof releaseOrInfo === 'string') {
      targetVersion = releaseOrInfo
    }

    // else nothing in cache -> try to fetch from remote
    let release = await this.getRelease({
      onlyRemote: true, 
      version: targetVersion,
      /* FIXME
      download: true,
      downloadOptions: {
        writePackageData: true, // will write data to cache
        onProgress: (progress, release) => onProgress(release, progress)
      }
      */
    })

    // release could not be found
    if(!release) {
      return undefined
    }

    // download and verify package
    const verifiedRelease = await this.download(release)
    const hostname = await this.registerModule(verifiedRelease)

    // const protocol = 'package:'
    const appUrl = url.format({
      slashes: true,
      protocol,
      pathname: `${hostname}/index.html`
    })

    return appUrl
  }

  public async getResource(verifiedReleaseOrHostname : string | IVerifiedRelease, resourcePath : string) : Promise<Buffer | undefined> {
    // TODO implement and check verification policy
    let verifiedRelease = undefined
    if (typeof verifiedReleaseOrHostname=== 'string') {
      verifiedRelease = this.getModule(verifiedReleaseOrHostname)
    } else {
      verifiedRelease = verifiedReleaseOrHostname
    }
    if (!verifiedRelease) {
      return undefined
    }
    const data = verifiedRelease.data
    // initialize ethpkg
    const pkg = await ethpkg.getPackage(data)
    const entry = await pkg.getEntry(resourcePath)
    if (!entry) {
      // throw new Error(`Entry not found: ${resourcePath}`)
      return undefined
    }
    const content = await entry.file.readContent()
    // TODO memoize
    return content
  }

  /**
   * @deprecated
   * @param hostname 
   */
  public async getEntry(release : IRelease, resourcePath : string) : Promise<Buffer | undefined> {
    let verifiedRelease = undefined
    if (!release.remote) {
      const data = fs.readFileSync(release.location)
      const verificationResult = {} //FIXME await this.verifyReleaseData(data)
      verifiedRelease = {
        ...release,
        data,
        verificationResult
      }
    }
    if (!verifiedRelease) {
      throw new Error('Not a verified release')
    }
    // @ts-ignore
    return this.getResource(verifiedRelease, resourcePath)
  }

  async getEntries(release : IRelease) {
    if (!this.cache) return []
    return this.cache.getEntries(release)
  }

  private async verifyReleaseData(data : Buffer) : Promise<IVerificationResult> {
    // verify package signature: TODO we can enforce a policy here that invalid
    // packages are not even written to disk
    const pkg = await getEthpkg(data)
    const verificationResult = await pkgsign.verify(pkg!)
    return verificationResult
  }

  public async download(release : IRelease, {
    onProgress = (progress : number, release?: IRelease) => {},
    writePackageData = true
  } : IDownloadOptions = {}) : Promise<IVerifiedRelease> {

    // wrap onProgress
    let pp = 0;
    const _onProgress = (p : number) => {
      const pn = Math.floor(p * 100);
      if (pn > pp) {
        pp = pn;
        // console.log(`downloading update..  ${pn}%`)
        this.emit('update-progress', release, pn)
        if (onProgress) {
          onProgress(pn, release)
        }
      }
    }

    // download release data / asset
    const { location } = release
    const packageData = await download(location, _onProgress)

    const verificationResult = await this.verifyReleaseData(packageData)

    // 
    if (writePackageData) {
    }

    this.emit('update-downloaded', release)
    return {
      ...release,
      location: 'memory',
      remote: false,
      verificationResult,
      data: packageData
    }
  }

  /*
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
  */

}
