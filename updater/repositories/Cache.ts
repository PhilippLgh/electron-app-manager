import { IRelease, IInvalidRelease } from '../api/IRelease'
import { IRepository } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
import fs from 'fs'
import path from 'path'

import AppPackage from '../AppPackage'
import { hasSupportedExtension, memoize } from '../util'

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

  async toRelease(fileName : string) : Promise<IRelease | IInvalidRelease> {
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
        error: 'Could not parse package '+ release.location
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
      // TODO ? repository = 'Cache'
      remote: false
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
    const promises = files.map(async (file : string) => this.toRelease(file))
    const releases = await Promise.all(promises)
    return releases
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
