import { IRelease, IInvalidRelease } from './IRelease'

export interface IRepository {
  getReleases(): Promise<Array<(IRelease | IInvalidRelease)>>;
  getLatest(): Promise<IRelease | null>;
}

export interface IRemoteRepository extends IRepository {
  download(update : IRelease) : Promise<IRelease>
}