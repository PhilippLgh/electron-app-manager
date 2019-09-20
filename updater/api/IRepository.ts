import { IRelease, IInvalidRelease, IReleaseExtended } from './IRelease'

export interface IDownloadOptions {
  writePackageData?: boolean, 
  writeDetachedMetadata?: boolean, 
  targetDir?: string,
  onProgress?: (progress: number, release?: IRelease) => void,
  extractPackage?: boolean,
  onExtractionProgress?: (progress: number, fileName: string) => void
}

export interface IFetchOptions {
  filter? : string,
  sort?: boolean,
  version?: string, // semver filter
  cached?: boolean,
  filterInvalid?: boolean, 
  download?: boolean, // will download the release to cache if not specified otherwise
  downloadOptions?: IDownloadOptions,
  verify?: boolean
}

export interface IRepository {

  name : string;
  
  getReleases(options? : IFetchOptions): Promise<Array<(IRelease | IInvalidRelease)>>;

  getLatest(options? : IFetchOptions): Promise<IRelease | IReleaseExtended | null>;

}

export interface IRemoteRepository extends IRepository {
  repositoryUrl: string;

  download(release : IRelease, onProgress? : Function) : Promise<Buffer>

}