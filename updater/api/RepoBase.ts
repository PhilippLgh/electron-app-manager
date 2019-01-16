import { IRelease, IInvalidRelease, IMetadata, IReleaseExtended } from './IRelease'
const semver = require('semver')

class RepoBase {

  public compareVersions(a : IRelease | IInvalidRelease, b : IRelease | IInvalidRelease){
    if(!('version' in a)) return 1
    if(!('version' in b)) return -1
    return semver.compare(b.version, a.version)
  }

  protected normalizeTag(tag : string){
    if (tag[0] == 'v') tag = tag.slice(1);
    return tag;
  }

  protected sortReleases(releases : Array<IRelease | IInvalidRelease>){
    return releases.sort(this.compareVersions)
  }

}

export default RepoBase
