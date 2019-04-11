import { IRelease, IInvalidRelease, IMetadata, IReleaseExtended } from '../api/IRelease'
import { IRemoteRepository, IReleaseOptions } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
// @ts-ignore
import { download, downloadJson } from '../lib/downloader'
import semver from 'semver'
import GitHub, { ReposListReleasesResponseItem } from '@octokit/rest'
import path from 'path'
import { isRelease, hasSupportedExtension } from '../util';

class Github extends RepoBase implements IRemoteRepository {
  
  private client: GitHub;
  private _repositoryUrl: string;
  private owner: string;
  private repo: string;

  public name: string = 'Github';

  constructor(repoUrl : string){
    super()
    // WARNING: For unauthenticated requests, the rate limit allows for up to 60 requests per hour.
    this.client = new GitHub()
    if (process.env.GITHUB_TOKEN && typeof process.env.GITHUB_TOKEN === 'string') {
      this.client.authenticate({type: 'token', token: process.env.GITHUB_TOKEN})
    }

    this._repositoryUrl = repoUrl;
    let parts = repoUrl.split('/')
    let l = parts.length 
    this.owner = parts[l-2]
    this.repo = parts[l-1].replace('.git', '')
  }

  get repositoryUrl(){
    return this._repositoryUrl
  }

  private toRelease(releaseInfo : ReposListReleasesResponseItem) : (IRelease | IInvalidRelease) {

    const { 
      name : releaseName,
      tag_name,
      target_commitish : branch
     } = releaseInfo


    const segments = tag_name.split('_')
    const versionTag = segments[0]
    const version = this.normalizeTag(versionTag);

    if(!semver.valid(version)) {
      return {
        name: tag_name,
        error: 'parse error / invalid version: ' + versionTag 
      }
    }

    const prereleaseInfo = semver.prerelease(version)
    const channel = prereleaseInfo ? prereleaseInfo[0] : 'dev'

    // let metadata = releaseInfo.assets.find(release => release.name === 'metadata.json')
    if(!releaseInfo.assets){
      return {
        name: tag_name,
        error: 'release does not contain any assets'
      }
    }
    let app = releaseInfo.assets.find(release => hasSupportedExtension(release.name))
    if(!app){
      return {
        name: tag_name,
        error: 'release does not contain an app package (.asar or .zip)'
      }
    }

    const appName = app.name && path.basename(app.name)
    const assetUrlApp = app.browser_download_url
    const size = app.size
    const downloads = app.download_count
    const name = appName || releaseName || tag_name

    // console.log('release info asset: ', app)

    return {
      name,
      displayName: name,
      repository: this.repositoryUrl,
      fileName: app.name,
      commit: branch,
      publishedDate: new Date(),
      version,
      channel,
      size,
      tag: tag_name,
      location: assetUrlApp,
      error: undefined,
      remote: true
    }
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

  /*
  async getChannels() {
    let releases = this.getReleases();
    let channelsAll = releases.map(release => release.channel);
    const channels = new Set(channelsAll);
    return channels;
  }
  */

  async getReleases({
    sort = true,
    filterInvalid = true
  } : IReleaseOptions = {} ) : Promise<Array<(IRelease | IInvalidRelease)>> {
    // FIXME use pagination
    try {
      let releaseInfo = await this.client.repos.listReleases({
        owner: this.owner,
        repo: this.repo
      });

      // convert to proper format
      let releases = releaseInfo.data.map(this.toRelease.bind(this))

      // filter invalid releases
      if (filterInvalid) {
        releases = releases.filter(isRelease)
      }

      return sort ? releases : this.sortReleases(releases)
    } catch (error) {
      // FIXME handle API errors such as rate-limits
      return []
    }
  }

  async getLatest(filter? : string) : Promise<IRelease | IReleaseExtended | null>  {
    // the latest uploaded release ( /latest api route ) is not necessarily the latest version
    // might only be a patch fix for previous version
    let releases = await this.getReleases()
    if(filter && typeof filter === 'string') {
      // @ts-ignore
      releases = releases.filter(release => semver.satisfies(release.version, filter))
    }
    if (releases.length <= 0) {
      return null
    }
    let temp = releases[0];
    // is invalid release
    if(temp.error !== undefined){
      return null
    }
    let latest = temp as IRelease;
    let release = await this.extendWithMetadata(latest)
    if(release.error){
      return null
    }
    return release as IRelease
  }

  async download(release: IRelease, onProgress = (progress : number) => {}): Promise<Buffer> {
    const { location } = release;
    let data = await download(location, onProgress);
    return data;
  }  

}

export default Github
