const GitHub = require('@octokit/rest')
const Repo = require('./Repo')
const semver = require('semver')

const {download, downloadJson} = require('../downloader')

// For unauthenticated requests, the rate limit allows for up to 60 requests per hour.
// FIXME : not suitable for production
// "https://developer.github.com/v3/#rate-limiting"
// Error: API rate limit exceeded for 100.100.100.100. (But here's the good news: Authenticated requests get a higher rate limit. 

class GithubRepo extends Repo {
  constructor(repoUrl) {
    super();
    this.client = new GitHub();
    // will not work in production system as the token can easily be extracted. only for dev but very dangerous
    //this.client.authenticate({type: 'token', token: 'TOKEN HERE'}) 
    
    let parts = repoUrl.split('/')
    let l = parts.length 
    const githubOptions = {
      owner: parts[l-2], 
      repo: parts[l-1].replace('.git', '')
    }

    this.baseOpts = githubOptions
  }
  toRelease(releaseInfo){

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
        error: 'release does not contain an app package (.asar)'
      }
    }

    const assetUrlApp = app.browser_download_url

    return {
      name: releaseInfo.tag_name,
      fileName: app.name,
      version,
      channel,
      tag: releaseInfo.tag_name,
      location: assetUrlApp
      // error: 'set when invalid'
    };
  }
  async getReleases() {
    // FIXME use pagination
    let releaseInfo = await this.client.repos.listReleases({
      owner: this.baseOpts.owner,
      repo: this.baseOpts.repo
    });

    // convert to proper format
    let releases = releaseInfo.data.map(this.toRelease.bind(this))
    return releases;
  }
  async getChannels() {
    let releases = this.getReleases();
    let channelsAll = releases.map(release => release.channel);
    const channels = new Set(channelsAll);
    return channels;
  }
  async extendWithMetadata(release) {
    let meta = await this.getMetadata(release);
    if (!meta) {
      return Object.assign(
        {
          error: 'no meta data'
        },
        release
      );
      /*
      return {
        ...release,
        error: 'no meta data'
      }
      */
    }
    return Object.assign(
      {
        checksums: {
          sha1: meta.sha1,
          sha256: meta.sha256,
          sha512: meta.sha512
        }
      },
      release
    );
    /*
    return {
      ...release,
      checksums: {
        sha1: meta.sha1,
        sha256: meta.sha256,
        sha512: meta.sha512
      }
    }
    */
  }
  async getLatest() {
    // the latest uploaded (/latest api route) is not necessarily the latest version
    // might only be a patch fix for previous version
    let releases = await this.getReleases();
    if (releases.length <= 0) {
      return null;
    }
    let latest = releases[0];
    return this.extendWithMetadata(latest)
  }
  async getMetadata(release) {
    try {
      let meta = await downloadJson(`https://github.com/${this.baseOpts.owner}/${this.baseOpts.repo}/releases/download/${release.tag}/metadata.json`)
      return meta;
    } catch (error) {
      console.log('metadata download failed', error.message);
      return null;
    }
  }
  async download(release, onProgress = () => {}) {
    const { location } = release;
    let data = await download(location, onProgress);
    return data;
  }
}

module.exports = GithubRepo