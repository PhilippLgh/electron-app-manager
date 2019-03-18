import { IRelease, IInvalidRelease, IReleaseExtended } from '../api/IRelease'
import { IRepository } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
import fs from 'fs'
import path from 'path'

import { verifyPGP, checksumMd5 } from '../tasks/verify'
import AppPackage from '../AppPackage'
import { getExtension, hasSupportedExtension } from '../util'

import { ethpkg, pkgsign } from '@philipplgh/ethpkg'

const SUPPORTED_EXTENSIONS = ['.zip', '.tar.gz', '.tar']

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

    let ext = getExtension(fileName)
    let isExtensionSupported = SUPPORTED_EXTENSIONS.includes(ext)

    if(!isExtensionSupported){
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

    if(metadata.signature) {
      //console.log('signature found', release.signature)
      //let result = await verifyPGP(binFileName, pubKeyBuildServer, metadata.signature)
      //console.log('is sig ok?', result)
    }

    // console.log('metadata', metadata)

    // order is imortant or location e.g. would be url
    release = {
      ...metadata,
      ...release
    }

    return release
  }

  async getReleases(): Promise<Array<(IRelease | IInvalidRelease)>> {
    let files = fs.readdirSync(this.cacheDirPath)
    files = files.filter(hasSupportedExtension)
    const filesFound = files && files.length > 0
    if(!filesFound){
      return []
    }

    let releases = files.map(async (file : string) => this.toRelease(file))
    releases = await Promise.all(releases)

    releases = releases.filter(release => !('error' in release))

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
    filtered[0].repository = 'Cache'
    return filtered[0]
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
