import { IRelease, IInvalidRelease } from '../api/IRelease'
import { IRepository } from '../api/IRepository'
import fs from 'fs'
import path from 'path'

class Cache implements IRepository {

  cacheDirPath: string;
  
  constructor(cacheDirPath : string){
    this.cacheDirPath = cacheDirPath
  }

  parseMetadataFromJson(packagePath : string) {
    try {
      const includedMetadataPath = path.join(packagePath, 'metadata.json')
      // FIXME this only works for asar files in electron with patched fs
      const metadataContents = fs.readFileSync(includedMetadataPath, 'utf8')
      let m = JSON.parse(metadataContents);
      // TODO validate
      // TODO verify integratiy and authenticity
      return {
        name: m.name,
        version: `${m.version}${m.channel ? ('-' + m.channel) : ''}`,
        location: packagePath
      }
    } catch (error) {
      return {
        location: packagePath,
        error: 'invalid package'
      }
    }
  }
  
  async getReleases(): Promise<Array<(IRelease | IInvalidRelease)>> {
    let files = fs.readdirSync(this.cacheDirPath);
    let filesFound = files && files.length > 0
    if(!filesFound){
      return []
    }
    let releases = files.map(file => {
      return {
        name: file,
        error: 'no metadata'
      }
    })
    return releases
  }
  
  getLatest(): Promise<(IRelease | null)> {
    return Promise.resolve(null)
  }

}

export default Cache
