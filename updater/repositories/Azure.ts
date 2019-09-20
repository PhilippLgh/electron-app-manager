import { IRelease, IInvalidRelease, IMetadata, IReleaseExtended } from '../api/IRelease'
import { IRemoteRepository, IFetchOptions } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
import { download, downloadJson } from '../lib/downloader'
import { getExtension, hasSupportedExtension, extractPlatform, extractArchitecture, simplifyVersion } from '../util'
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

const SUPPORTED_EXTENSIONS = ['.zip', '.tar.gz', '.tar']

// https://docs.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api
class Azure extends RepoBase implements IRemoteRepository {
  
  repoUrl: string;
  onReleaseParsed: Function;

  public name: string = 'Azure';
  filter: Function;

  constructor(repoUrl : string, options : any = {}){
    super()
    const { prefix } = options
    // FIXME check that only host name provided or parse
    this.repoUrl = repoUrl + '/builds?restype=container&comp=list' + (prefix ? `&prefix=${prefix}` : '')
    this.onReleaseParsed = options && options.onReleaseParsed
    this.filter = options && options.filter
    this.toRelease = this.toRelease.bind(this)
  }

  get repositoryUrl(){
    return this.repoUrl
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
    const fileName = releaseInfo.Name[0]
    let ext = getExtension(fileName)
    const name = fileName.slice(0, -ext.length); 
    const Properties = releaseInfo.Properties[0]
    const lastModified = Properties['Last-Modified'][0]
    const etag = Properties['Etag'][0]
    const size = Properties['Content-Length'][0]
    const contentType = Properties['Content-Type'][0]
    const md5 = Properties['Content-MD5'][0]

    const version = semver.clean( extractVersion(name) || '' ) || ''
    const displayVersion = simplifyVersion(version)

    const platform = extractPlatform(name)
    const arch = extractArchitecture(name)

    let _release = {}
    // give client the chance to define their own parser
    if(this.onReleaseParsed){
      _release = this.onReleaseParsed({
        name,
        fileName,
        version,
        size,
        lastModified,
        contentType
      })
    }

    let md5AtoB = Buffer.from(md5, 'base64').toString('binary')
    md5AtoB = md5AtoB.split('').map(char => ('0' + char.charCodeAt(0).toString(16)).slice(-2)).join('')

    if (version === '') {
      // console.log('bad format: ', name)
    }

    // FIXME use url parser
    let baseUrl = this.repoUrl.split("?").shift()

    const location = `${baseUrl}/${fileName}`

    let release = {
      name,
      fileName,
      version,
      displayVersion,
      platform,
      arch,
      tag: version,
      commit: undefined,
      size,
      channel: undefined,
      location: location,
      error: undefined,
      checksums: {
        md5: md5AtoB
      },
      ..._release, // overwrite with client values
      remote: true
    } as any

    return release
  }

  async getReleases({
    sort = true,
    filterInvalid = true,
    version
  } : IFetchOptions = {}): Promise<(IRelease | IInvalidRelease | IInvalidRelease)[]> {
    // console.time('download')
    let result = await download(this.repoUrl)
    // console.timeEnd('download') // 1502.350ms
    // console.time('parse')
    let parsed
    try {
      parsed = await parseXml(result)
    } catch (error) {
      console.log('error: release feed could not be parsed: ', result)
      return []
    }
    // console.timeEnd('parse') // 93.232ms
    const blobs = parsed.EnumerationResults.Blobs[0].Blob
    if(!blobs) {
      return []
    }
    // console.time('convert')
    let releases = blobs.map(this.toRelease)
    // console.timeEnd('convert') // 11.369ms

    // scan to create client specific mapping ansd filter
    let mapping : {[index : string] : IRelease } = {}
    const packages : any = []
    releases.forEach((release : IRelease) => {
      let { fileName, version } = release
      
      let isExtensionSupported = hasSupportedExtension(fileName)

      if(fileName && fileName.endsWith('.asc')){
        mapping[fileName] = release
      } else if(isExtensionSupported && version){
        // TODO client-defined filter
        if(this.filter){
          if(this.filter(release)){
            packages.push(release)
          }
        } else {
          packages.push(release)
        }
      } else {
        // console.log('ignored', fileName)
      }
    })

    // 2nd iteration to apply mapping
    // console.log('mapping', mapping)
    packages.forEach((release : any) => {
      // construct lookup key
      const k = release.fileName + '.asc'
      if(mapping[k]){
        release.signature = mapping[k].location
      }
    });

    // filter invalid versions
    if(version) {
      // @ts-ignore
      releases = releases.filter(release => semver.satisfies(semver.coerce(release.version).version, version))
    }

    /*
    signatures.forEach(signature => { });
    const packages = releases
    .filter((release : any) => ! (release.fileName.endsWith('.asc') || release.fileName.includes('unstable')))
    .filter((release : any) => release.fileName.endsWith('.zip') && release.version )
    */

    // console.log('filtered', packages.map(r => r.version))

    let sorted = packages.sort(this.compareVersions)

    return sorted
  }

  async getLatest(options : IFetchOptions = {}): Promise<IRelease | IReleaseExtended | null> {
    let releases = await this.getReleases({
      version: options.version
    })
    if (releases.length <= 0) {
      return null
    }
    const release = releases[0] as any
    if (release.signature){
      const signatureData = await download(release.signature)
      if (signatureData) {
        release.signature = signatureData.toString()
      }
    }
    return release
  }

  async download(release : IRelease, onProgress = (progress : number) => {}) : Promise<Buffer> {
    const { location } = release;
    let data = await download(location, onProgress);
    return data;
  }
}

export default Azure
