import { IRelease, IInvalidRelease, IMetadata, IReleaseExtended } from '../api/IRelease'
import { IRemoteRepository, IFetchOptions } from '../api/IRepository'
import { download, downloadJson } from '../lib/downloader'
import RepoBase from '../api/RepoBase'

export default class Bintray extends RepoBase implements IRemoteRepository {

  name: string;
  repositoryUrl: string;  
  private filter: Function;
  private subject: string | undefined;
  private packageName: string | undefined;
  private repoName: string | undefined;

  constructor(repoUrl : string, options : any = {}){
    super()
    this.name = 'bintray'
    this.filter = options && options.filter
    const parts = repoUrl.split('/')
    this.packageName = parts.pop()
    this.repoName = parts.pop()
    this.subject = parts.pop()
    // this.repositoryUrl = 'https://api.bintray.com/packages/consensys/pegasys-repo/pantheon/files'
    this.repositoryUrl = `https://api.bintray.com/packages/${this.subject}/${this.repoName}/${this.packageName}`
  }

  private toRelease(pkgInfo : any) {
      const {
        name, // 'pantheon-0.8.2.tar.gz'
        // path, // 'pantheon-0.8.2.tar.gz'
        // repo, // pegasys-repo
        // package, // pantheon
        version,
        // owner, // consensys
        created,
        size,
        sha1,
        sha256
      } = pkgInfo

      const displayName = name
      const fileName = name
      const commit = undefined
      const publishedDate = Date.parse(created)
      const tag_name = version
      const displayVersion = version
      const platform = 'Java VM' // FIXME
      const arch = '64 Bit' // FIXME
      const isPrerelease = false
      const channel = undefined
      const location = `https://bintray.com/consensys/pegasys-repo/download_file?file_path=${fileName}`

      return {
        name,
        displayName: name,
        repository: this.repositoryUrl,
        fileName,
        commit,
        publishedDate,
        version,
        displayVersion,
        platform,
        arch,
        isPrerelease,
        channel,
        size,
        tag: tag_name,
        location,
        checksums: {
          sha1,
          sha256
        },
        error: undefined,
        remote: true
      }
  }
  
  async getReleases(options?: IFetchOptions | undefined): Promise<(IRelease | IInvalidRelease)[]> {
    // https://bintray.com/docs/api/#_get_package_files does not seem to have prefix option
    const infoUrl = `https://api.bintray.com/packages/${this.subject}/${this.repoName}/${this.packageName}/files`
    const packageInfo = await downloadJson(infoUrl)
    let releases = packageInfo
    // FIXME hardcoded filter
      .filter((p : any) => !p.path.startsWith('tech'))
      .map(this.toRelease.bind(this))
    
    if(this.filter){
      releases = releases.filter(this.filter)
    }

    // map signatures to releases
    releases = releases.filter((r : IRelease) => !r.fileName.endsWith('.asc'))
      
    // console.log('package info', releases)
    return releases
  }
  async getLatest(semverFilter?: string | undefined): Promise<IRelease | IReleaseExtended | null> {
    const releases = await this.getReleases()
    // @ts-ignore
    return releases[0]
  }
  async download(release: IRelease, onProgress = (progress : number) => {}): Promise<Buffer> {
    const { location } = release;
    console.log('download file from', location)
    try {
      const data = await download(location, onProgress);
      return data;
    } catch (error) {
      console.log('error during download', error)      
    }
    return Buffer.from('')
  }
}
