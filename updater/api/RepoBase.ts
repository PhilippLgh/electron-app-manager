import { IRelease, IInvalidRelease, IMetadata, IReleaseExtended } from './IRelease'
import { EventEmitter } from 'events'
const semver = require('semver')

const REALEASE_CHANNEL : {[index:string] : number} = {
  dev: -1,
  ci: -1,
  alpha: 0,
  beta: 1,
  nightly: 2,
  production: 3,
  master: 4,
  release: 4,
}

class RepoBase extends EventEmitter{

  public compareVersions(a : IRelease | IInvalidRelease, b : IRelease | IInvalidRelease){
    if(!('version' in a)) return 1
    if(!('version' in b)) return -1
    const semComp = semver.compare(b.version, a.version)
    if(semComp === 0) {
      console.log('sem', semComp, b.version, b.channel, a.version, a.channel)
      const channelA = REALEASE_CHANNEL[a.channel || '']
      const channelB = REALEASE_CHANNEL[b.channel || '']
      if(channelA === undefined) return 1
      if(channelB === undefined) return -1
      if(channelA > channelB) return 1
      if(channelB > channelA) return -1
      return 0
    }
    return semComp
  }

  protected normalizeTag(tag : string){
    if (tag[0] == 'v') tag = tag.slice(1);
    return tag;
  }

  protected sortReleases(releases : Array<IRelease | IInvalidRelease>){
    return releases.sort(this.compareVersions)
  }

  protected notEmpty<IRelease>(value: IRelease | null | undefined): value is IRelease {
    return value !== null && value !== undefined;
  }

}

export default RepoBase
