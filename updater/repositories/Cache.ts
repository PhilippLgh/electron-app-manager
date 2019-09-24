import { IRelease, IInvalidRelease, IReleaseExtended } from '../api/IRelease'
import { IRepository, IFetchOptions } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
import fs from 'fs'
import path from 'path'
import semver from 'semver'

import { verifyPGP, checksumMd5 } from '../tasks/verify'
import AppPackage from '../AppPackage'
import { getExtension, hasSupportedExtension, memoize } from '../util'
import { pkgsign as ethpkg } from 'ethpkg'

// for different caching strategies see
// https://serviceworke.rs/caching-strategies.html
class Cache extends RepoBase implements IRepository {

  cacheDirPath: string;

  public name: string = 'Cache';
  private getPackageCached : Function;

  constructor(cacheDirPath : string){
    super()
    this.cacheDirPath = cacheDirPath
    if (!fs.existsSync(cacheDirPath)) {
      fs.mkdirSync(cacheDirPath, {
        recursive: true
      })
    }
    this.getPackageCached = memoize(this.getPackage.bind(this))
  }

  async clear() {
    const files = fs.readdirSync(this.cacheDirPath)
    for (const file of files) {
      fs.unlinkSync(path.join(this.cacheDirPath, file))
    }
  }

  async toRelease(fileName : string){
    const name = path.parse(fileName).name
    const location = path.join(this.cacheDirPath, fileName)

    if(!hasSupportedExtension(fileName)){
      return {
        name,
        error: 'Unsupported package extension: ' + fileName
      }
    }

    let release = {
      // FIX: name must not be a different one across remote / local strategies
      // in order to have stable generated origins
      // name,
      fileName,
      location
    } as any

    let appPackage
    try {
      appPackage = await this.getPackageCached(release)
    } catch (error) {
      console.log('error in cached package', error)
      return {
        name,
        error
      }
    }
    if (appPackage === undefined) {
      return {
        name,
        error: new Error('Could not parse package '+ release.location)
      }
    }
    const metadata = await appPackage.getMetadata()
    if(!metadata){
      console.log('package has no metadata', fileName)
      return {
        name,
        error: 'No metadata: ' + fileName
      }
    }
    const verificationResult = await appPackage.verify()
    if(metadata.signature) {
      //console.log('signature found', release.signature)
      //let result = await verifyPGP(binFileName, pubKeyBuildServer, metadata.signature)
      //console.log('is sig ok?', result)
    }
    const extractedPackagePath = fs.existsSync(appPackage.extractedPackagePath) ? appPackage.extractedPackagePath : undefined
    // console.log('metadata', metadata)
    // order is important or location e.g. would be url
    release = {
      ...metadata,
      ...release,
      extractedPackagePath,
      verificationResult,
      remote: false
    }

    return release
  }

  async getReleases({
    sort = true,
    version = undefined
  } : IFetchOptions = {}): Promise<Array<(IRelease | IInvalidRelease)>> {
    let files = fs.readdirSync(this.cacheDirPath)
    files = files.filter(hasSupportedExtension)
    const filesFound = files && files.length > 0
    if(!filesFound){
      return []
    }

    let releases = files.map(async (file : string) => this.toRelease(file))
    releases = await Promise.all(releases)

    if(version) {
      // @ts-ignore
      releases = releases.filter(release => semver.satisfies(semver.coerce(release.version).version, version))
    }

    let faulty = releases.filter(release => ('error' in release))
    if (faulty && faulty.length > 0) {
      console.log(`detected ${faulty.length} corrupted releases in cache`)
    }

    releases = releases.filter(release => !('error' in release))

    // @ts-ignore
    return sort ? releases.sort(this.compareVersions) : releases
  }
  
  async getLatest(options : IFetchOptions = {}) : Promise<IRelease | IReleaseExtended | null>  {
    let releases = await this.getReleases({
      version: options.version
    }) as Array<IRelease>
    const filtered = releases.filter(r => !('error' in r))
    if (filtered.length === 0) {
      return null;
    }
    filtered[0].repository = 'Cache'
    return filtered[0]
  }
  async getPackage(release : IRelease) {
    console.time('load '+release.location)
    const appPackage = await new AppPackage(release.location).init()
    console.timeEnd('load '+release.location)
    return appPackage
  }
  async getEntries(release : IRelease){
    const appPackage = await this.getPackageCached(release)
    return appPackage.getEntries()
  }
  async getEntry(release : IRelease, entryPath : string){
    const appPackage = await this.getPackageCached(release)
    return appPackage.getEntry(entryPath)
  }
  async extract(release: IRelease, onProgress?: Function): Promise<any> {
    const appPackage = await this.getPackageCached(release)
    return appPackage.extract(onProgress)
  }

}

export default Cache
