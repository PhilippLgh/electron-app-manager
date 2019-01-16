import { IRelease, IInvalidRelease, IMetadata, IReleaseExtended } from '../api/IRelease'
import { IRemoteRepository } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
const { download, downloadJson } = require('../lib/downloader')
import path from 'path'
import url from 'url'
import semver from 'semver'

const { extractVersion, parseXml } = require('../util')


interface AzureBlob {
  Name: Array<string>
  Properties: Array<{
    'Last-Modified': Array<Date>
    'Etag': Array<string>
    'Content-Length': Array<string>
    'Content-Type': Array<string>
    'Content-MD5': Array<string>
  }>
}

// https://docs.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api
class Azure extends RepoBase implements IRemoteRepository {
  
  repoUrl: string;

  constructor(repoUrl : string){
    super()
    this.repoUrl = repoUrl
    this.toRelease = this.toRelease.bind(this)
  }

  toRelease(releaseInfo : AzureBlob) : IRelease {
    /* unhandled:
      'Content-Encoding': [ '' ],
      'Content-Language': [ '' ],
      'Cache-Control': [ '' ],
      'Content-Disposition': [ '' ],
      'BlobType': [ 'BlockBlob' ],
      'LeaseStatus': [ 'unlocked' ],
      'LeaseState': [ 'available' ]
    */
    const name = releaseInfo.Name[0]
    const Properties = releaseInfo.Properties[0]
    const lastModified = Properties['Last-Modified'][0]
    const etag = Properties['Etag'][0]
    const size = Properties['Content-Length'][0]
    const contentType = Properties['Content-Type'][0]
    const md5 = Properties['Content-MD5'][0]

    let md5AtoB = Buffer.from(md5, 'base64').toString('binary')
    md5AtoB = md5AtoB.split('').map(char => ('0' + char.charCodeAt(0).toString(16)).slice(-2)).join('')

    let parts = name.split('-')

    const version = semver.clean( extractVersion(path.basename(name, path.extname(name))) || '' ) || ''

    if (version === '') {
      // console.log('bad format: ', name)
    }

    // FIXME use url parser
    let baseUrl = this.repoUrl.split("?").shift()

    const location = `${baseUrl}/${name}`

    return {
      name,
      fileName: name,
      version: version,
      tag: version,
      commit: undefined,
      size,
      channel: undefined,
      location: location,
      error: undefined,
      checksums: {
        md5: md5AtoB
      },
    } as any

  }

  async getReleases(): Promise<(IRelease | IInvalidRelease | IInvalidRelease)[]> {
    let result = await download(this.repoUrl)
    const parsed = await parseXml(result)
    const blobs = parsed.EnumerationResults.Blobs[0].Blob
    
    let releases = blobs.map(this.toRelease)

    let signatures = releases.filter((release : any) => release.fileName.endsWith('.asc'))
    console.log('signatures', signatures)
    /*
    signatures.forEach(signature => {

    });
    */

    const filteredReleases = releases
      .filter((release : any) => ! (release.fileName.endsWith('.asc') || release.fileName.includes('unstable')))
      .filter((release : any) => release.fileName.endsWith('.zip') && release.version )

    // console.log('filtered', filteredReleases.map(r => r.version))

    let sorted = filteredReleases.sort(this.compareVersions)

    return sorted
  }

  async getLatest(): Promise<IRelease | IReleaseExtended | null> {
    let releases = await this.getReleases()
    return releases[0] as any
  }

  async download(release : IRelease, onProgress = () => {}) : Promise<IRelease> {
    const { location } = release;
    let data = await download(location, onProgress);
    return data;
  }
}

export default Azure
