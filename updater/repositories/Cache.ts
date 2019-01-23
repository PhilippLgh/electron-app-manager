import { IRelease, IInvalidRelease, IReleaseExtended } from '../api/IRelease'
import { IRepository } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
import fs from 'fs'
import path from 'path'
//@ts-ignore
import AdmZip from 'adm-zip'

class AppPackage {

  private zip: any;
  private packagePath: string;
  isAsar: boolean;

  constructor(release : IRelease){
    this.packagePath = release.location
    this.zip = new AdmZip(this.packagePath)

    // FIXME temp. deactivate asar
    this.isAsar = false
  }

  get detachedMetadataPath() : string {
    return this.packagePath + '.metadata.json'
  }

  hasEmbeddedMetadata(): any {
    // FIXME bad path /metadata.json -.> _META_ dir
    return this.zip.getEntry('metadata.json') !== null
  }

  hasDetachedMetadata(): any {
    return fs.existsSync(this.detachedMetadataPath)
  }

  getEmbeddedMetadata(): any {

    if(this.isAsar){
      const includedMetadataPath = path.join(this.packagePath, 'metadata.json')
      // FIXME this only works for asar files in electron with patched fs
      const metadataContents = fs.readFileSync(includedMetadataPath, 'utf8')
      let m = JSON.parse(metadataContents);
      // TODO validate
      // TODO verify integratiy and authenticity
      return {
        name: m.name,
        version: `${m.version}${m.channel ? ('-' + m.channel) : ''}`,
        location: this.packagePath
      }
    }

    try {
      return JSON.parse(this.zip.getEntry('metadata.json').getData().toString())
    } catch (error) {
      return null
    }
  }

  getDetachedMetadata() : any {
    try {
      return JSON.parse(fs.readFileSync(this.detachedMetadataPath, 'utf8'))
    } catch (error) {
      // console.log('could not read detached metadata', error)
      return null
    }
  }

  getMetadata(): any {
    if(this.hasEmbeddedMetadata()){
      return this.getEmbeddedMetadata()
    } else if(this.hasDetachedMetadata()){
      return this.getDetachedMetadata()
    } else {
      return null
    }
  }

}

// for different caching strategies see
// https://serviceworke.rs/caching-strategies.html
class Cache extends RepoBase implements IRepository {

  cacheDirPath: string;

  public name: string = 'Cache';
  
  constructor(cacheDirPath : string){
    super()
    this.cacheDirPath = cacheDirPath
  }

  toRelease(fileName : string){

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

    const appPackage = new AppPackage(release)
    const metadata = appPackage.getMetadata()

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
    let releases = files.map(file => this.toRelease(file))
    // releases = releases.filter(release => ('error' in release))

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
