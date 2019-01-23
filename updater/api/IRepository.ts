import { IRelease, IInvalidRelease, IReleaseExtended } from './IRelease'

export interface IRepository {
  
  getReleases(): Promise<Array<(IRelease | IInvalidRelease)>>;

  getLatest(): Promise<IRelease | IReleaseExtended | null>;

}

export interface IRemoteRepository extends IRepository {

  download(update : IRelease) : Promise<Buffer>

}