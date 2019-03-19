import { IRelease, IInvalidRelease, IReleaseExtended } from './IRelease'

export interface IRepository {

  name : string;
  
  getReleases(semverFilter? : string): Promise<Array<(IRelease | IInvalidRelease)>>;

  getLatest(semverFilter? : string): Promise<IRelease | IReleaseExtended | null>;

}

export interface IRemoteRepository extends IRepository {
  repositoryUrl: string;

  download(update : IRelease, onProgress? : Function) : Promise<Buffer>

}