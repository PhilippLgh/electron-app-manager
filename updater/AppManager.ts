import { EventEmitter } from 'events'
import { IRemoteRepository } from './api/IRepository'
import GithubRepo from './repositories/Github'
import AzureRepo from './repositories/Azure'
import Cache from './repositories/Cache'
import { IRelease } from './api/IRelease'
import fs from 'fs'
import path from 'path'

interface IUpdaterOptions {
  repository: string;
  cacheDir?: string;
  downloadDir?: string;
  modifiers? : { [key : string] : Function }
}

export default class AppManager extends EventEmitter{
  
  remote: IRemoteRepository;
  cache: Cache;
  
  /**
   *
   */
  constructor({ repository, cacheDir, downloadDir, modifiers } : IUpdaterOptions) {
    super();

    if(repository.startsWith('https://github.com/')) {
      this.remote = new GithubRepo(repository)
    }
    else if(repository.includes('blob.core.windows.net')){
      if(modifiers){
        let mod = (release : IRelease) => {
          let result : {[key:string] : any} = { }
          for(var m in modifiers){
            result[m] = modifiers[m](release)
          }
          return result
        }
        this.remote = new AzureRepo(repository, {
          onReleaseParsed: mod
        })      
      } else {
        this.remote = new AzureRepo(repository)
      }
    }
    else {
      throw new Error('No repository strategy found for url: ' + repository)
    }

    if(cacheDir){
      this.cache = new Cache(cacheDir)
    } else {
      this.cache = new Cache(__dirname)
    }

  }

  async getLatestCached(){
    return this.cache.getLatest()
  }

  async getLatest() : Promise<IRelease | null>{
    let latestCached = await this.cache.getLatest()
    let latestRemote = await this.remote.getLatest()
    return latestRemote
  }

  async download(release : IRelease, {writeDetachedMetadata = true} = {} ){

    let pp = 0;
    let onProgress = (p : number) => {
      let pn = Math.floor(p * 100);
      if (pn > pp) {
        pp = pn;
        // console.log(`downloading update..  ${pn}%`)
        this.emit('update-progress', release, pn);
      }
    }
    const releaseData = await this.remote.download(release, onProgress)
    const location = path.join(this.cache.cacheDirPath, release.fileName)

    if(writeDetachedMetadata){
      const detachedMetadataPath = path.join(this.cache.cacheDirPath, release.fileName + '.metadata.json')
      fs.writeFileSync(detachedMetadataPath, JSON.stringify(release, null, 2))
    }

    // TODO patch package metadata if it doesn't exist

    fs.writeFileSync(location, releaseData)

    this.emit('update-downloaded', release)

    return {
      ...release,
      location
    }
  }

}
