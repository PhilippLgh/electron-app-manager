import { IRelease, IInvalidRelease, IMetadata, IReleaseExtended } from './IRelease'
import { EventEmitter } from 'events'
import { compareVersions } from '../util';
const semver = require('semver')


class RepoBase extends EventEmitter{

  public compareVersions(a : IRelease | IInvalidRelease, b : IRelease | IInvalidRelease){
    return compareVersions(a, b)
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
