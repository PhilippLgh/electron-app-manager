import { IRelease, IInvalidRelease, IMetadata, IReleaseExtended } from '../api/IRelease'
import { IRemoteRepository } from '../api/IRepository'
import RepoBase from '../api/RepoBase'
import { download, downloadJson } from '../lib/downloader'
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

// this helper is especially used to support .tar.gz
const getExtension = (fileName : string) => {
  for (let i = 0; i < SUPPORTED_EXTENSIONS.length; i++) {
    const ext = SUPPORTED_EXTENSIONS[i];
    if(fileName.endsWith(ext)){
      return ext
    }
  }
  return path.extname(fileName)
}

// https://docs.microsoft.com/en-us/rest/api/storageservices/blob-service-rest-api
class Azure extends RepoBase implements IRemoteRepository {
  
  repoUrl: string;
  onReleaseParsed: Function;

  public name: string = 'Azure';
  filter: Function;

  constructor(repoUrl : string, options? : any){
    super()
    this.repoUrl = repoUrl
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
      ..._release // overwrite with client values
    } as any

    return release
  }

  async getReleases(): Promise<(IRelease | IInvalidRelease | IInvalidRelease)[]> {
    let result = await download(this.repoUrl)
    const parsed = await parseXml(result)
    const blobs = parsed.EnumerationResults.Blobs[0].Blob
    
    let releases = blobs.map(this.toRelease)

    // scan to create client specific mapping ansd filter
    let mapping : {[index : string] : IRelease } = {}
    const packages : any = []
    releases.forEach((release : IRelease) => {
      let { fileName, version } = release
      const extension = fileName.split('.').slice(1).join('.')
      
      let ext = getExtension(fileName)
      let isExtensionSupported = SUPPORTED_EXTENSIONS.includes(ext)

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

    // filter invalid versions?

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

  async getLatest(): Promise<IRelease | IReleaseExtended | null> {
    const releases = await this.getReleases()
    const release = releases[0] as any
    if(release.signature){
      let signatureData = await download(release.signature)
      release.signature = signatureData.toString()
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
