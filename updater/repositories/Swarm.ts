import { IRelease, IInvalidRelease, IReleaseExtended } from '../api/IRelease'
import { IRemoteRepository, IFetchOptions } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
import { download, downloadJson } from '../lib/downloader'

class Swarm extends RepoBase implements IRemoteRepository {

  repositoryUrl: string = ''
  name: string = 'swarm'

  constructor(repoUrl : string){
    super()
  }

  getReleases(options?: IFetchOptions | undefined): Promise<(IRelease | IInvalidRelease)[]> {
    throw new Error("Method not implemented.");
  }

  async getLatest(filter? : string) : Promise<IRelease | IReleaseExtended | null>  {
    return {
      name: 'test',
      displayName: 'test',
      repository: 'testrepo', // this.repositoryUrl,
      fileName: 'test.zip',
      commit: undefined,
      publishedDate: new Date(),
      version: '1.0.0',
      displayVersion: 'v1.0.0',
      channel: 'alpha',
      size: 100,
      tag: '1.0.0',
      location: 'test',
      error: undefined,
      remote: true
    }
  }

  async download(release: IRelease, onProgress = (progress : number) => {}): Promise<Buffer> {
    const { location } = release;
    const data = await download(location, onProgress)
    return data
  }

}

export default Swarm
