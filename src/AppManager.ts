import { EventEmitter } from 'events'
import url from 'url'
import fs from 'fs'
import { IRepository, IFetchOptionsReleaseList, IFetchOptionsRelease, IDownloadOptions } from './api/IRepository'
import { generateHostnameForRelease } from './util'
import { IRelease, IInvalidRelease, IVerifiedRelease } from './api/IRelease'
import semver from 'semver'
import { download } from './lib/downloader'
import ethpkg from 'ethpkg'
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
      // this.remote = getRepository(repository)
    }

    if (auto) {
      // TODO start routine here
    }

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
    /*
    let release = await this.getRelease({
      onlyRemote: true, 
      version: targetVersion,
      /* FIXME
      download: true,
      downloadOptions: {
        writePackageData: true, // will write data to cache
        onProgress: (progress, release) => onProgress(release, progress)
      }
      /
    })
    */
   let release = undefined

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
    if(!pkg) {
      throw new Error('Failed to fetch package')
    }
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

  /*
  private async verifyReleaseData(data : Buffer) : Promise<IVerificationResult> {
    // verify package signature: TODO we can enforce a policy here that invalid
    // packages are not even written to disk
    const pkg = await getEthpkg(data)
    const verificationResult = await pkgsign.verify(pkg!)
    return verificationResult
  }
  */

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

    // const verificationResult = await this.verifyReleaseData(packageData)

    // 
    if (writePackageData) {
    }

    this.emit('update-downloaded', release)
    return {
      ...release,
      location: 'memory',
      remote: false,
      verificationResult: {
        isValid: false,
        isTrusted: false,
        signers: [],
      },
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
