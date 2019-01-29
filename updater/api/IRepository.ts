import { IRelease, IInvalidRelease, IReleaseExtended } from './IRelease'

export interface IRepository {

  name : string;
  
  getReleases(): Promise<Array<(IRelease | IInvalidRelease)>>;

  getLatest(): Promise<IRelease | IReleaseExtended | null>;

}

export interface IRemoteRepository extends IRepository {
  repositoryUrl: string;

  download(update : IRelease, onProgress? : Function) : Promise<Buffer>

}