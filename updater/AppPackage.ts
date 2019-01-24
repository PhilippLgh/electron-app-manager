import fs from 'fs'
import path from 'path'
//@ts-ignore
import AdmZip from 'adm-zip'

export default class AppPackage {

  private zip: any;
  private packagePath: string;
  isAsar: boolean;

  constructor(packagePath : string){
    this.packagePath = packagePath
    this.zip = new AdmZip(this.packagePath)

    // FIXME temp. deactivate asar
    this.isAsar = false
  }

  get detachedMetadataPath() : string {
    return this.packagePath + '.metadata.json'
  }

  hasEmbeddedMetadata(): any {
    // FIXME bad path /metadata.json -.> _META_ dir
    return this.zip.getEntry('metadata.json') !== null
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
      // TODO verify integratiy and authenticity
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

  getMetadata(): any {
    if(this.hasEmbeddedMetadata()){
      return this.getEmbeddedMetadata()
    } else if(this.hasDetachedMetadata()){
      return this.getDetachedMetadata()
    } else {
      return null
    }
  }

  extract(){
    let targetDir = path.basename(this.packagePath)
    this.zip.extractAllTo(targetDir, /*overwrite*/false);
  }

}