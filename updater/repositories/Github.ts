import { IRelease, IInvalidRelease, IMetadata } from '../api/IRelease'
import { IRemoteRepository } from '../api/IRepository'
const { download, downloadJson } = require('../downloader')
import semver from 'semver'
import GitHub, { ReposListReleasesResponseItem } from '@octokit/rest'

class Github implements IRemoteRepository {
  
  private client: GitHub;
  private repoUrl: string;
  private owner: string;
  private repo: string;

  constructor(repoUrl : string){

    // WARNING: For unauthenticated requests, the rate limit allows for up to 60 requests per hour.
    this.client = new GitHub();

    this.repoUrl = repoUrl;
    let parts = repoUrl.split('/')
    let l = parts.length 
    this.owner = parts[l-2]
    this.repo = parts[l-1].replace('.git', '')
  }

  private normalizeTag(tag : string){
    if (tag[0] == 'v') tag = tag.slice(1);
    return tag;
  }

  private toRelease(releaseInfo : ReposListReleasesResponseItem) : (IRelease | IInvalidRelease) {

    const segments = releaseInfo.tag_name.split('_')
    const versionTag = segments[0]
    const version = this.normalizeTag(versionTag);

    if(!semver.valid(version)) {
      return {
        name: releaseInfo.tag_name,
        error: 'parse error / invalid version: ' + versionTag 
      }
    }

    const prereleaseInfo = semver.prerelease(version)
    const channel = prereleaseInfo ? prereleaseInfo[0] : 'dev'

    // let metadata = releaseInfo.assets.find(release => release.name === 'metadata.json')
    if(!releaseInfo.assets){
      return {
        name: releaseInfo.tag_name,
        error: 'release does not contain any assets'
      }
    }
    let app = releaseInfo.assets.find(release => release.name.endsWith('.asar') || release.name.endsWith('.zip'))
    if(!app){
      return {
        name: releaseInfo.tag_name,
        error: 'release does not contain an app package (.asar or .zip)'
      }
    }

    const assetUrlApp = app.browser_download_url
    const size = app.size
    const downloads = app.download_count

    return {
      name: releaseInfo.tag_name,
      displayName: '',
      repository: this.repoUrl,
      fileName: app.name,
      commit: releaseInfo.target_commitish,
      publishedDate: new Date(),
      version,
      channel,
      size,
      tag: releaseInfo.tag_name,
      location: assetUrlApp,
      error: undefined
    }
  }

  private async getMetadata(release : IRelease) : Promise<IMetadata | null> {
    try {
      let meta = await downloadJson(`https://github.com/${this.owner}/${this.repo}/releases/download/${release.tag}/metadata.json`)
      return {

      };
    } catch (error) {
      console.log('metadata download failed', error.message);
      return null;
    }
  }

  private async extendWithMetadata(release : IRelease) : Promise<IRelease | IInvalidRelease>{
    let meta = await this.getMetadata(release);
    if (!meta) {
      return {
        ...release,
        error: 'no meta data'
      }
    }
    // return *full release* info
    return {
      ...release,
      /*
      checksums: {
        sha1: meta.sha1,
        sha256: meta.sha256,
        sha512: meta.sha512
      },
      "signature": "TODO",
      "dependencies": "TODO",
      "permissions": "TODO",
      "notes": "TODO"
      */
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

  async getReleases(): Promise<Array<(IRelease | IInvalidRelease)>> {
    // FIXME use pagination
    let releaseInfo = await this.client.repos.listReleases({
      owner: this.owner,
      repo: this.repo
    });

    // convert to proper format
    let releases = releaseInfo.data.map(this.toRelease.bind(this))

    releases = releases.sort((a : IRelease | IInvalidRelease, b : IRelease | IInvalidRelease) => {
      if(!('version' in a)) return 1
      if(!('version' in b)) return -1
      return semver.compare(b.version, a.version)
    })

    return releases;
  }

  async getLatest() : Promise<IRelease | null>  {
    // the latest uploaded release ( /latest api route ) is not necessarily the latest version
    // might only be a patch fix for previous version
    let releases = await this.getReleases();
    if (releases.length <= 0) {
      return null;
    }
    let temp = releases[0];
    if(temp.error !== undefined){
      return null;
    }
    let latest = temp as IRelease;
    let release = await this.extendWithMetadata(latest)
    if(release.error){
      return null
    }
    return release as IRelease
  }

  async download(release: IRelease, onProgress = () => {}): Promise<IRelease> {
    const { location } = release;
    let data = await download(location, onProgress);
    return data;
  }  

}

export default Github