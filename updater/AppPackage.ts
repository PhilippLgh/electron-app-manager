import fs, { realpath } from 'fs'
import path from 'path'
import zlib from 'zlib'

import WritableMemoryStream from './lib/WritableMemoryStream'
import IPackageEntry from './api/IPackageEntry'

//@ts-ignore
import AdmZip from 'adm-zip'
//@ts-ignore
import tar from 'tar-stream'


const pubKeyBuildServer = `
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: SKS 1.1.6
Comment: Hostname: keyserver.ubuntu.com

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
=SbbF
-----END PGP PUBLIC KEY BLOCK-----
  `

export default class AppPackage {

  private zip: any;
  private packagePath: string;

  constructor(packagePath : string){
    // TODO asar files might need special handling
    if(!fs.existsSync(packagePath)){
      throw new Error('package does not exist: ' + packagePath)
    }
    this.packagePath = packagePath
    // TODO replace with ethpkg
    this.zip = this.isZip ? new AdmZip(this.packagePath) : null
  }

  get isTar(){
    return this.packagePath.endsWith('.tar.gz')
  }

  get isZip(){
    return this.packagePath.endsWith('.zip')
  }

  get isAsar(){
    return this.packagePath.endsWith('.asar')
  }

  get detachedMetadataPath() : string {
    return this.packagePath + '.metadata.json'
  }

  hasEmbeddedMetadata(): any {
    // FIXME bad path /metadata.json -.> _META_ dir
    return this.zip && this.zip.getEntry('metadata.json') !== null
  }

  hasDetachedMetadata(): any {
    return fs.existsSync(this.detachedMetadataPath)
  }

  getEmbeddedMetadata(): any {

    if(this.isAsar){
      const includedMetadataPath = path.join(this.packagePath, 'metadata.json')
      // FIXME this only works for asar files in electron with patched fs
      const metadataContents = fs.readFileSync(includedMetadataPath, 'utf8')
      let m = JSON.parse(metadataContents);
      // TODO validate
      // TODO verify integrity and authenticity
      return {
        name: m.name,
        version: `${m.version}${m.channel ? ('-' + m.channel) : ''}`,
        location: this.packagePath
      }
    }

    try {
      return JSON.parse(this.zip.getEntry('metadata.json').getData().toString())
    } catch (error) {
      return null
    }
  }

  getDetachedMetadata() : any {
    try {
      return JSON.parse(fs.readFileSync(this.detachedMetadataPath, 'utf8'))
    } catch (error) {
      // console.log('could not read detached metadata', error)
      return null
    }
  }

  async getMetadata(): Promise<any> {
    if(this.hasEmbeddedMetadata()){
      return this.getEmbeddedMetadata()
    } else if(this.hasDetachedMetadata()){
      return this.getDetachedMetadata()
    } else {
      return null
    }
  }

  async getEntries() : Promise<IPackageEntry[]>{
    if(this.isZip){
      // TODO write wrapper
      return this.zip.getEntries()
    }
    else if(this.isTar){
      const gzip = zlib.createGunzip()
      const inputStream = fs.createReadStream(this.packagePath, {highWaterMark: Math.pow(2,16)})
      const extract = tar.extract()
      return new Promise((resolve, reject) => {
        const entries : IPackageEntry[] = []
        extract.on('entry', (header : any, stream : any, next : any) => {
          let { name } = header
          const { size, type} = header
          const relPath = name as string
          name = path.basename(relPath)
          // console.log('process', relPath)
          entries.push({
            name,
            relPath,
            size,
            type,
            // TODO getDataStream()
            getData: async () => {
              let fileData = await this._getEntryData(relPath)
              return fileData
            }
          })
          
          stream.on('end', function() {
            next() // ready for next entry
          })
          stream.resume()
          
        })
        extract.on('finish', () => {
          resolve(entries)
        })
        inputStream.pipe(gzip).pipe(extract)
      });
    } else {
      throw new Error('unsupported operation on package ' + this.packagePath)
    }
  }
  private async readStreamToBuffer(stream : fs.ReadStream, size? : number){
    return new Promise((resolve, reject) => {
      let mStream = new WritableMemoryStream()
      // let fStream = fs.createWriteStream(__dirname+'/test')
      let t0 = Date.now()
      stream.pipe(mStream)
      // stream.pipe(fStream)
      let completed = 0;
      
      stream.on('data', (data : any) => {
        completed += data.length;
        // console.log('data ', completed, '/', size)
      })
      
      stream.on("error", (error : any) => {
        reject(error)
      });
      stream.on('end', () => {
        // console.log( ((Date.now()-t0) / 1000) , ' finished processing')
        // console.log('end of stream', completed, '/',  size)
        // TODO make sure that buffer also contains bytes stream.end vs mStream.end
        resolve(mStream.buffer)
      })
    })
  }
  private async _getEntryData(entryPath : string){
    if(this.isTar){
      const gzip = zlib.createGunzip()
      const inputStream = fs.createReadStream(this.packagePath)
      const extract = tar.extract()
      return new Promise((resolve, reject) => {
        extract.on('entry', async (header : any, stream : any, next : any) => {
          let { name } = header
          const { size, type} = header
          const relPath = name as string
          name = path.basename(relPath)
          if(relPath === entryPath){
            let fileData = await this.readStreamToBuffer(stream, size)
            resolve(fileData)
            // TODO close here
            next()
          } else {
            stream.on('end', function() {
              next() // ready for next entry
            })
            stream.resume()
          }
        })
        extract.on('finish', () => {
          // resolve(entries)
        })
        inputStream.pipe(gzip).pipe(extract)
      });
    } else {
      throw new Error('unsupported operation on package '+this.packagePath)
    }
  }
  async getEntry(entryPath : string) : Promise<IPackageEntry | null>{
    if(this.isZip){
      // TODO
      throw new Error('not implemented')
    }
    else if(this.isTar){
      const entries = await this.getEntries()
      const entry = entries.find(entry => entry.relPath === entryPath)
      return entry ? entry : null
    }
    return null
  }
  async extract(){
    let targetDir = path.basename(this.packagePath)
    if(this.isZip){
      this.zip.extractAllTo(targetDir, /*overwrite*/false);
    }
    else if(this.isTar){
      // this is using tar-fs not tar-stream
      /*
      targetDir = path.dirname(this.packagePath)
      // console.log('extract',this.packagePath,' tar to', targetDir)
      // extracting a directory
      const gzip = zlib.createGunzip()
      // this will overwrite existing files
      const inputStream = fs.createReadStream(this.packagePath)
      return new Promise((resolve, reject) => {
        inputStream.pipe(gzip).pipe(tar.extract(targetDir))
        .on('finish', () => {
          resolve(targetDir)
        })
        // TODO handle error
      });
      */
    }
  }

}