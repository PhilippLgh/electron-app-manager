const fs = require('fs')
const path = require('path')
const Repo = require('./Repo')

// for different caching strategies see
// https://serviceworke.rs/caching-strategies.html
class CacheRepo extends Repo {
  constructor(downloadDir) {
    super();
    this.downloadDir = downloadDir
  }
  async getReleases() {
    if (!fs.existsSync(this.downloadDir)) {
      throw new Error('Download directory for cache does not exist at: ' + this.downloadDir)
      return [];
    }
    let files = fs.readdirSync(this.downloadDir);
    let canStartFromCache = files && files.length > 0;
    if (!canStartFromCache) {
      return [];
    }
    let filePathsFull = files.map(f => path.join(this.downloadDir, f));
    // expand file paths to valid release / package structs
    let metadata = filePathsFull.map(f => {
      try {
        let m = JSON.parse(fs.readFileSync(path.join(f, 'metadata.json')));
        // TODO validate
        // TODO verify integratiy and authenticity
        return {
          name: m.name,
          version: `${m.version}${m.channel ? ('-' + m.channel) : ''}`,
          location: f
        };
      } catch (error) {
        console.warn('Cache contains invalid package: ', f, error)
        process.exit()
        return {
          location: f,
          error: 'invalid package'
        };
      }
    });

    return metadata;
  }
  async getLatest() {
    let releases = await this.getReleases();
    let filtered = releases.filter(r => !r.error);
    if (filtered.length === 0) {
      return null;
    }
    // sort releases by semver (major.minor.patch)
    let sorted = filtered.sort(this.compareVersions);
    return sorted[0];
  }
}

module.exports = CacheRepo