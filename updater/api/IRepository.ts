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
  getReleases(): Promise<Array<(IRelease | IInvalidRelease)>>;
}

export interface IRemoteRepository extends IRepository {
  repositoryUrl: string;
  download(release : IRelease, onProgress? : Function) : Promise<Buffer>
}