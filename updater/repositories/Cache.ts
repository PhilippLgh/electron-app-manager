import { IRelease, IInvalidRelease } from '../api/IRelease'
import { IRepository } from '../api/IRepository'
import fs from 'fs'

class Cache implements IRepository {

  cacheDirPath: string;
  
  constructor(cacheDirPath : string){
    this.cacheDirPath = cacheDirPath
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
