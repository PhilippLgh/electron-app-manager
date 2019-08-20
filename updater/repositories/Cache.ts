import { IRelease, IInvalidRelease, IReleaseExtended } from '../api/IRelease'
import { IRepository, IFetchOptions } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
import fs from 'fs'
import path from 'path'

import { verifyPGP, checksumMd5 } from '../tasks/verify'
import AppPackage from '../AppPackage'
import { getExtension, hasSupportedExtension } from '../util'
import { pkgsign as ethpkg } from 'ethpkg'

// for different caching strategies see
// https://serviceworke.rs/caching-strategies.html
class Cache extends RepoBase implements IRepository {

  cacheDirPath: string;

  public name: string = 'Cache';
  
  constructor(cacheDirPath : string){
    super()
    this.cacheDirPath = cacheDirPath
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
      name,
      fileName,
      location
    } as any

    const appPackage = await new AppPackage(release.location).init()
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

    // console.log('metadata', metadata)

    // order is important or location e.g. would be url
    release = {
      ...metadata,
      ...release,
      verificationResult,
      remote: false
    }

    return release
  }

  async getReleases({
    sort = true
  } : IFetchOptions = {}): Promise<Array<(IRelease | IInvalidRelease)>> {
    let files = fs.readdirSync(this.cacheDirPath)
    files = files.filter(hasSupportedExtension)
    const filesFound = files && files.length > 0
    if(!filesFound){
      return []
    }

    let releases = files.map(async (file : string) => this.toRelease(file))
    releases = await Promise.all(releases)

    let faulty = releases.filter(release => ('error' in release))
    if (faulty && faulty.length > 0) {
      console.log(`detected ${faulty.length} corrupted releases in cache`)
    }

    releases = releases.filter(release => !('error' in release))

    // @ts-ignore
    return sort ? releases.sort(this.compareVersions) : releases
  }
  
  async getLatest(filter? : string) : Promise<IRelease | IReleaseExtended | null>  {
    if (filter) {
      console.warn('filters are ignored for cache: ', filter)
    }
    const releases = await this.getReleases() as Array<IRelease>
    const filtered = releases.filter(r => !('error' in r))
    if (filtered.length === 0) {
      return null;
    }
    filtered[0].repository = 'Cache'
    return filtered[0]
  }
  async getPackage(release : IRelease) {
    const appPackage = await new AppPackage(release.location).init()
    return appPackage
  }
  async getEntries(release : IRelease){
    const appPackage = await new AppPackage(release.location).init()
    return appPackage.getEntries()
  }
  async getEntry(release : IRelease, entryPath : string){
    const appPackage = await new AppPackage(release.location).init()
    return appPackage.getEntry(entryPath)
  }
  async extract(release: IRelease): Promise<any> {
    const appPackage = await new AppPackage(release.location).init()
    return appPackage.extract()
  }

}

export default Cache
