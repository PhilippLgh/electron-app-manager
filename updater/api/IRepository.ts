import { IRelease, IInvalidRelease, IReleaseExtended } from './IRelease'

export interface IDownloadOptions {
  writePackageData?: boolean, 
  writeDetachedMetadata?: boolean, 
  targetDir?: string,
  onProgress?: (progress: number, release?: IRelease) => void,
  extractPackage?: boolean,
  onExtractionProgress?: (progress: number, fileName: string) => void
}

/**
 * Fetch options for a list of releases
 */
export interface IFetchOptionsReleaseList {
  onlyCache?: boolean, // consider only downloaded releases in cache
  onlyRemote?: boolean, // consider only remote / hosted releases
  version?: string, // semver filter
  sort?: boolean, // sort release list by version
  timeout?: number // time in ms for request timeouts
  prefix? : string // server-side processed name filter

  filter? : string,
  cached?: boolean, // http response caching
  filterInvalid?: boolean, 
}

/**
 * Fetch options for a single release
 */
export interface IFetchOptionsRelease {
  onlyCache?: boolean, // consider only cached releases
  onlyRemote?: boolean, // consider only remote / hosted releases
  version?: string, // semver filter
}

export interface IRepository {
  name : string;
  repositoryUrl?: string;
  getReleases(prefix? : string, timeout? : number): Promise<Array<(IRelease | IInvalidRelease)>>;
}
