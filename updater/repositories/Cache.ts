import { IRelease, IInvalidRelease, IReleaseExtended } from '../api/IRelease'
import { IRepository } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
import fs from 'fs'
import path from 'path'

import { verifyPGP, checksumMd5 } from '../tasks/verify'
import AppPackage from '../AppPackage'

// for different caching strategies see
// https://serviceworke.rs/caching-strategies.html
class Cache extends RepoBase implements IRepository {

  cacheDirPath: string;

  public name: string = 'Cache';
  
  constructor(cacheDirPath : string){
    super()
    this.cacheDirPath = cacheDirPath
  }

  async toRelease(fileName : string){

    const name = path.parse(fileName).name
    const location = path.join(this.cacheDirPath, fileName)

    if(!fileName.endsWith('.zip')){
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

    const appPackage = new AppPackage(release.location)
    const metadata = appPackage.getMetadata()

    if(metadata.signature){
      //console.log('signature found', release.signature)
      //let result = await verifyPGP(binFileName, pubKeyBuildServer, metadata.signature)
      //console.log('is sig ok?', result)
    }

    // console.log('metadata', metadata)

    release = {
      ...release,
      ...metadata
    }

    return release
  }

  async getReleases(): Promise<Array<(IRelease | IInvalidRelease)>> {
    let files = fs.readdirSync(this.cacheDirPath)
    files = files.filter(f => f.endsWith('.zip'))
    const filesFound = files && files.length > 0
    if(!filesFound){
      return []
    }
    let releases = files.map(async file => this.toRelease(file))
    releases = await Promise.all(releases)

    // releases = releases.filter(release => ('error' in release))

    // @ts-ignore
    const sorted = releases.sort(this.compareVersions);

    return sorted as any // FIXME remove any
  }
  
  async getLatest() : Promise<IRelease | IReleaseExtended | null>  {
    const releases = await this.getReleases() as Array<IRelease>
    const filtered = releases.filter(r => !('error' in r))
    if (filtered.length === 0) {
      return null;
    }
    return filtered[0]
  }

}

export default Cache
