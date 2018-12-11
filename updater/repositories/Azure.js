const path = require('path')
const url = require('url')

const semver = require('semver')

const Repo = require('./Repo')
const { download } = require('../downloader')
const { extractVersion, parseXml } = require('../util')

// https://docs.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api
class AzureBlobRepo extends Repo {
  constructor(repoUrl){
    super()
    this.url = repoUrl
  }
  toRelease(releaseInfo) {
    /* unhandled:
      'Content-Encoding': [ '' ],
      'Content-Language': [ '' ],
      'Cache-Control': [ '' ],
      'Content-Disposition': [ '' ],
      'BlobType': [ 'BlockBlob' ],
      'LeaseStatus': [ 'unlocked' ],
      'LeaseState': [ 'available' ]
    */
    const name = releaseInfo.name
    const lastModified = releaseInfo['Last-Modified'][0]
    const etag = releaseInfo['Etag'][0]
    const size = releaseInfo['Content-Length'][0]
    const contentType = releaseInfo['Content-Type'][0]
    const md5 = releaseInfo['Content-MD5'][0]

    let md5AtoB = Buffer.from(md5, 'base64').toString('binary')
    md5AtoB = md5AtoB.split('').map(char => ('0' + char.charCodeAt(0).toString(16)).slice(-2)).join('')

    let parts = name.split('-')

    const version = semver.clean( extractVersion(path.basename(name, path.extname(name))) || '' ) || ''

    if (version === '') {
      // console.log('bad format: ', name)
    }

    // FIXME use url parser
    let baseUrl = this.url.split("?").shift()

    const location = `${baseUrl}/${name}`

    return {
      name,
      fileName: name,
      version: version,
      tag: undefined,
      commit: undefined,
      size,
      channel: undefined,
      location: location,
      error: undefined,
      checksums: {
        md5: md5AtoB
      },
      signature: undefined,
      dependencies: undefined,
      permissions: undefined,
      notes: undefined
    }

  }
  async getReleases(){
    let result = await download(this.url)
    const parsed = await parseXml(result)
    const blobs = parsed.EnumerationResults.Blobs[0].Blob
    
    let releases = blobs.map(blob => {
      const name = blob.Name[0]
      const properties = blob.Properties[0]
      const release = this.toRelease({
        name,
        ...properties
      })
      return release
    })

    let signatures = releases.filter(release => release.fileName.endsWith('.asc'))
    signatures.forEach(signature => {

    });

    const filteredReleases = releases
      .filter(release => ! (release.fileName.endsWith('.asc') || release.fileName.includes('unstable')))
      .filter(release => release.fileName.endsWith('.zip') && release.version )

    // console.log('filtered', filteredReleases.map(r => r.version))

    let sorted = filteredReleases.sort(this.compareVersions)

    return sorted
  } 
  async getLatest() {
    let releases = await this.getReleases()
    return releases[0]
  }
  async download(release, onProgress = () => {}) {
    const { location } = release;
    let data = await download(location, onProgress);
    return data;
  }
}

module.exports = AzureBlobRepo
