import { IRelease, IInvalidRelease, IReleaseExtended } from '../api/IRelease'
import { IRemoteRepository, IReleaseOptions } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
import { download, downloadJson } from '../lib/downloader'

class Swarm extends RepoBase implements IRemoteRepository {

  repositoryUrl: string = ''
  name: string = 'swarm'

  constructor(repoUrl : string){
    super()
  }

  getReleases(options?: IReleaseOptions | undefined): Promise<(IRelease | IInvalidRelease)[]> {
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
      channel: 'alpha',
      size: 100,
      tag: '1.0.0',
      location: 'test',
      error: undefined,
      remote: true
    }
  }

  async download(release: IRelease, onProgress = (progress : number) => {}): Promise<Buffer> {
    const hash = '24f0c0e4272ca1bbb7e32fe1d8bf87367b169f74415e48eb9f2ca4552759ef5c'
    const location = `http://localhost:8500/bzz:/${hash}`
    throw new Error("Method not implemented.")
  }

}

export default Swarm
