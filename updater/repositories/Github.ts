import { IRelease, IInvalidRelease, IMetadata, IReleaseExtended } from '../api/IRelease'
import { IRemoteRepository } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
// @ts-ignore
import { download, downloadJson } from '../lib/downloader'
import semver from 'semver'
import GitHub, { ReposListReleasesResponseItem } from '@octokit/rest'
import path from 'path'
import { isRelease, hasSupportedExtension, extractPlatform, extractArchitecture, simplifyVersion } from '../util'

interface IAsset {
  name: string,
  browser_download_url: string,
  size: number,
  download_count: number
}

class Github extends RepoBase implements IRemoteRepository {
  
  private client: GitHub;
  private _repositoryUrl: string;
  private owner: string;
  private repo: string;
  private prefixFilter? : string
  private filter: Function;

  public name: string = 'Github';

  constructor(repoUrl : string, options : any = {}){
    super()
    // WARNING: For unauthenticated requests, the rate limit allows for up to 60 requests per hour.
    if (process.env.GITHUB_TOKEN && typeof process.env.GITHUB_TOKEN === 'string') {
      this.client = new GitHub({
        // @ts-ignore
        auth: process.env.GITHUB_TOKEN
      })
    } else {
      this.client = new GitHub()
    }

    this.filter = options && options.filter
    this.prefixFilter = options && options.prefix
    this._repositoryUrl = repoUrl;
    let parts = repoUrl.split('/')
    let l = parts.length 
    this.owner = parts[l-2]
    this.repo = parts[l-1].replace('.git', '')
  }

  get repositoryUrl(){
    return this._repositoryUrl
  }

  private assetToRelease(asset : IAsset, {
    releaseName,
    tag_name,
    branch,
    version,
    displayVersion,
    channel,
    isPrerelease
  } : any) : IRelease | IInvalidRelease {

    const { name: assetName, browser_download_url: assetUrl, size, download_count } = asset
    const packageName = assetName && path.basename(assetName)

    const name = releaseName

    const platform = extractPlatform(name)
    const arch = extractArchitecture(name)

    return {
      name,
      displayName: name,
      repository: this.repositoryUrl,
      fileName: assetName,
      commit: branch,
      publishedDate: new Date(),
      version,
      displayVersion,
      platform,
      arch,
      isPrerelease,
      channel,
      size,
      tag: tag_name,
      location: assetUrl,
      error: undefined,
      remote: true
    }
  }

  private toRelease(releaseInfo : ReposListReleasesResponseItem) : Array<IRelease | IInvalidRelease> {

    const {
      /*
      url,
      assets_url,
      html_url,
      upload_url,
      tarball_url,
      zipball_url,
      id,
      node_id,
      tag_name,
      target_commitish,
      name,
      body,
      draft,
      prerelease,
      created_at,
      published_at,
      author,
      assets,
      */
      // name : releaseName,
      tag_name,
      target_commitish : branch
     } = releaseInfo

     const releaseName = this.repo // use repo name as release name for stable origins

    const segments = tag_name.split('_')
    const versionTag = segments[0]
    const version = this.normalizeTag(versionTag);
    const displayVersion = simplifyVersion(version)

    const isPrerelease = releaseInfo.draft || releaseInfo.prerelease

    if(!semver.valid(version)) {
      return [{
        name: tag_name,
        error: 'parse error / invalid version: ' + versionTag 
      }]
    }

    const prereleaseInfo = semver.prerelease(version)
    const channel = prereleaseInfo ? prereleaseInfo[0] : 'dev'


    // let metadata = releaseInfo.assets.find(release => release.name === 'metadata.json')
    if(!releaseInfo.assets){
      return [{
        name: tag_name,
        error: 'release does not contain any assets'
      }]
    }
    let { assets } = releaseInfo
    if (this.prefixFilter !== undefined && assets) {
      // @ts-ignore
      assets = assets.filter(asset => asset.name.includes(this.prefixFilter))
    }

    assets = assets.filter(asset => hasSupportedExtension(asset.name))
    if(assets.length <= 0){
      return [{
        name: tag_name,
        error: 'release does not contain any app packages (.asar or .zip)'
      }]
    }

    let releases = assets.map(a => this.assetToRelease(a, {
      releaseName,
      tag_name,
      branch,
      version,
      displayVersion,
      channel,
      isPrerelease
    }))

    if(this.filter){
      // @ts-ignore
      releases = releases.filter(this.filter) // includes filter
    }
    
    // console.log('releases of assets', releases)

    return releases
  }

  async getMetadata(release : IRelease) : Promise<IMetadata | null> {
    try {
      const meta = await downloadJson(`https://github.com/${this.owner}/${this.repo}/releases/download/${release.tag}/metadata.json`)
      if (meta.error) {
        return null
      }
      const {name, icon, md5, sha1, sha256, sha512} = meta
      return {
        name,
        icon,
        md5,
        sha1,
        sha256,
        sha512
      }
    } catch (error) {
      console.log('metadata download failed', error.message);
      return null;
    }
  }

  private async extendWithMetadata(release : IRelease) : Promise<IRelease | IReleaseExtended | IInvalidRelease>{
    let meta = await this.getMetadata(release);
    if (!meta) {
      return {
        ...release,
        // TODO this should not invalidate releases? 
        // error: 'no meta data'
      }
    }
    // return *full release* info
    const {name, icon, md5, sha1, sha256, sha512} = meta
    return {
      ...release,
      // overwrite with name from metadata for better quality
      name,
      icon,
      // FIXME
      displayName: name,
      checksums: {
        md5,
        sha1,
        sha256,
        sha512
      },
    }
  }

  async getReleases() : Promise<Array<(IRelease | IInvalidRelease)>> {
    // FIXME use pagination
    try {
      let releaseInfo = await this.client.repos.listReleases({
        owner: this.owner,
        repo: this.repo,
        /**
         * Results per page (max 100)
         */
        // per_page?: number;
        /**
         * Page number of the results to fetch.
         */
        // page?: number;
      })
      // convert to IRelease list
      let releases = releaseInfo.data.map(this.toRelease.bind(this)).reduce((prev, cur) => {
        return prev.concat(cur)
      })
      // console.log('latest releases unsorted\n', releases.map(r => `{ version: '${r.version}', channel: '${r.channel}' }`).slice(0, 5).join(',\n'))
      return releases
    } catch (error) {
      console.log('could not retrieve releases list from github', error.message)
      // FIXME handle API errors such as rate-limits
      return []
    }
  }

  async download(release: IRelease, onProgress = (progress : number) => {}): Promise<Buffer> {
    const { location } = release;
    const data = await download(location, onProgress);
    return data;
  }  

}

export default Github
