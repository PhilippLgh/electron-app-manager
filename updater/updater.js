const { EventEmitter } = require('events')
const path = require('path')
const fs = require('fs')
const url = require('url')
const crypto = require('crypto')
const CacheRepo = require('./repositories/LocalCache')
const GithubRepo = require('./repositories/Github')
const AzureRepo = require('./repositories/Azure')
const semver = require('semver')
let fso = fs
let app = undefined
let showSplash = null
let addZip 
try {
  fso = require('original-fs')
  app = require('electron').app
  showSplash = require('./ui/show-splash')
  addZip = require('./electron-zip-support')
  console.log('running in electron: use original-fs')
} catch (error) {
  console.log('running in node: use fs', error)
}
const { request } = require("./downloader");
const AdmZip = require('adm-zip')

function shasum(data, alg) {
  return crypto
    .createHash(alg || 'sha256')
    .update(data)
    .digest('hex');
}

class AppUpdater extends EventEmitter {
  constructor(options) {
    super()

    const { repo, downloadDir } = options

    this.userDownloadDir = downloadDir
    this.repo = repo

    this.cache = new CacheRepo(this.downloadDir)

    if (repo.startsWith('https://github.com/')) {
      this.remote = new GithubRepo(repo)
    }
    if(repo.includes('blob.core.windows.net')){
      this.remote = new AzureRepo(repo)
    }

    if (this.remote == null) {
      throw new Error('No repository strategy available for ' + repo)
    }

    this.log = console

    this.showDialog = (options.useDialog === true)

    this.checkForUpdates = this.checkForUpdates.bind(this)

    this._latest = null

    if (options.auto === true) {
      if (options.interval <= 5 || options.interval > (24 * 60)) {
        throw new Error(`Interval ${options.interval} (min) is unreasonable or not within rate limits`)
      }
      let intervalMin = options.interval || 15
      let intervalSec = intervalMin * 60
      let intervalMs = intervalSec * 1000
      this._startUpdateRoutine(intervalMs)
    }
  }
  get downloadDir() {
    if(this.userDownloadDir){
      return this.userDownloadDir
    }
    // TODO this can cause timing problems if app is not ready yet:
    let userDataPath = __dirname
    try {
      userDataPath = app.getPath('userData')
    } catch (error) {
      
    }
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath)
    }
    let downloadDir = path.join(userDataPath, 'releases')
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir)
    }
    return downloadDir
  }
  async _startUpdateRoutine(interval) {
    if (this.checkHandler) {
      throw new Error('Update routine was started multiple times')
    }
    let errorCounter = 0

    const check = async () => {
      let latest = await this.checkForUpdates()
      if (latest && latest.version) {
        console.log('update found: downloading ', latest.version);
        try {
          let download = await this.download(latest)

        } catch (error) {
          errorCounter++
          console.error(error)
        }
      }
    }

    check()
    this.checkHandler = setInterval(check, interval)
  }
  async getCachedApp() {
     //TODO the user might decide to rollback to an earlier version so the latest is not always correct
    let latestCached = await this.cache.getLatest()
    return latestCached
  }
  async checkForUpdates() {
    this.log.log('checking for updates at ', this.repo)

    const latest = await this.getLatest('all')
    let latestCached = latest.cache
    let latestBackend = latest.remote
    let latestMemory = this._latest

    console.log('compare: ', latestCached, latestBackend, latestMemory)

    // check remote for an updated version
    if(latestBackend) {

      let hasCacheLatestVersion = latestCached && !semver.gt(latestBackend.version, latestCached.version)
      let hasMemoryLatestVersion = latestMemory && !semver.gt(latestBackend.version, latestMemory.version)

      if(hasCacheLatestVersion || hasMemoryLatestVersion) {
        this.log.log('cache or memory has latest version', hasCacheLatestVersion ? latestCached : latestMemory)
        this.emit('update-not-available', hasCacheLatestVersion ? latestCached : latestMemory)
        return null // signals no update
      } else {
        this.log.log('update available: ', latestBackend.version)
        this.emit('update-available', latestBackend)
        return latestBackend
      }
    } else {
      this.log.log('no latest backend version available - update-not-available')
      this.emit('update-not-available', latestCached)
      return null // signals no update
    }
  }
  async checkIntegrity() {
    return true
    /*
    const { filePath, checksums } = release;
    // TODO promisify await
    let data;
    try {
      data = fso.readFileSync(filePath);
    } catch (error) {
      console.log('error during integrity check', error)
      return false;
    }
    const checksumsDownload = {
      sha1: shasum(data, 'sha1'),
      sha256: shasum(data, 'sha256'),
      sha512: shasum(data, 'sha512')
    };
    let isValid = true;
    for (let alg in checksumsDownload) {
      isValid &= checksumsDownload[alg] === checksums[alg];
    }
    return isValid;
    */
  }
  async _getLatest() {

    let latestCached = await this.cache.getLatest()
    let latestRemote = await this.remote.getLatest()
    let latestMemory = this._latest

    let hasCacheLatestVersion = latestCached && !semver.gt(latestRemote.version, latestCached.version)
    let hasMemoryLatestVersion = latestMemory && !semver.gt(latestRemote.version, latestMemory.version)

    let latestTotal = hasCacheLatestVersion ? 'cache' : (hasMemoryLatestVersion ? 'memory' : 'remote')

    return  {
      latest: latestTotal,
      cache: latestCached,
      memory: latestMemory,
      remote: latestRemote
    }
  }
  async getLatest(source) {
    if(!source){
      return this.remote.getLatest()
    } else if(source === 'all') {
      return this._getLatest()
    } else {
      return this.remote.getLatest()
    }
  }
  async hotLoad(indexHtml) {
    if(showSplash == null){
      throw new Error('Splash cannot be displayed - not running in Electron?')
    }

    // 1. show splash to indicate that updater is searching for app version
    showSplash(this, indexHtml)

    // 2. fetch latest release
    const app = await this.getLatest()
    this._latest = app // cache result

    // 3. download zip contents to memory
    const result = await this.download(app)
    
    // 4. allow renderer to access files within zip in memory
    /**
     * TODO things to consider:
     * this is *magic* and magic is usually not a good thing
     * it will overwrite other interceptors - it seems there can only be one which might be a bug
     * this will only allow to read from one zip which is probably intended
     * it will also completely deactivate fs access for files outside the zip which is probably a good thing 
     */
    addZip(result.packagedApp)
    /*
    let result = {}
    const { location } = app;
    let _result = await request("HEAD", location);
    let headers = _result.headers;
    let zipUrl = location
    if (headers.status === "302 Found" && headers.location) {
      zipUrl = headers.location
    }
    let remoteZip = new RemoteZip(zipUrl)
    addZip(remoteZip)
    */

    let electronUrl = url.format({
      slashes: true,
      protocol: 'file:', // even though not 100% correct we are using file and not a custom protocol for the moment
      pathname: '.zip/index.html', // path does only exist in memory
    })
        
    result.electronUrl = electronUrl
    
    return result

  }
  async download(update, cacheFile = false, downloadDir) {

    // console.log('download update ', update)
    // console.log('download update to', dest)

    let pp = 0;
    let onProgress = p => {
      let pn = Math.floor(p * 100);
      if (pn > pp) {
        pp = pn;
        // console.log(`downloading update..  ${pn}%`)
        this.emit('update-progress', update, pn);
      }
    };

    try {

      const data = await this.remote.download(update, onProgress)

      // write file to disk if caching is on. otherwise keep only in memory
      let filePath = ""
      if(cacheFile) {
        if(!downloadDir) {
          downloadDir = this.downloadDir
        }
        filePath = path.join(downloadDir, update.fileName)
        fs.writeFileSync(filePath, data)
      }

      let parsedData = null
      if (update.isAsar) {
        // TODO
      } else {
        parsedData = new AdmZip(data)
      }

      /*
      // if release has no checksum metadata try to fetch
      // TODO remove this
      if (release.checksums === undefined) {
        release = await this.remote.extendWithMetadata(release);
      }

      // TODO verify integratiy and authenticity
      let isValid = await this.checkIntegrity(release);
      if (!isValid) {
        this.emit('update-invalid', update);
        console.log('update is invalid')
        // TODO delete here? - only necessary if data was written
        return;
      }
      */

      let release = Object.assign({}, update, {
        data: parsedData,
        packagedApp: parsedData
      })

      release.location = filePath || release.location

      this.emit('update-downloaded', release)
      return release

    } catch (error) {
      console.log('error during download:', error);
      return Object.assign({
          error: error.message
        },
        update)
    }
  }
}

module.exports = AppUpdater