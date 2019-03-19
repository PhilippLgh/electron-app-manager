import fs, { realpath } from 'fs'
import path from 'path'
import zlib from 'zlib'

import WritableMemoryStream from './lib/WritableMemoryStream'

import { ethpkg, IPackage, IPackageEntry } from '@philipplgh/ethpkg';


const pubKeyBuildServer = `
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: SKS 1.1.6
Comment: Hostname: keyserver.ubuntu.com

mQINBFggyzEBEADjYwaAWcEHkzAC9uGMIU0HlCFILiZ1pKG3sVIc6sCiLWzmOuat47xhp8nX
VwkPyRVUdZEl/Vll4bkMlvKMUR+08O0cJwiPBy/f4eUj7fiV/6jSm3dtznJhRBtzKpIqWvNI
+Jt8SWDHrPY35YFZ1MCHOuQ8ZSSzqqYLPMOJHZcA/PG71RGZGjv0b/mMrnqxx/jGqpDbZ5fQ
GzbGa0O1gd8Y6EzOVM0OrMjKopS7pDyr4vedmE3vEyqBk6wZYaWrjzPm9isZirMe5D5HW2AS
ww6Fy/uzzm9MqCwZi92QdOEc25yoiMreK+aZJ8A+pYd/0nzRhZKqTKgW2pObGJu+BlZBwYi3
vfrsnidRWDWFF7FygIHSCTXUUCvtz93y7d9cdqSH2mRrwSEurcQ4aIelVUxADUNDqd4RSyQ2
t9of+eMVrV3thCP8NGj89wPwJEtUjPOiQMaab+Av2yX9q8ibqtPJfymRVwdDgTOcFfO6Vgdb
EHibiPADSoDHrLm9n5TP2sA7qNUEjftCpVF0fMA/5LA5oWndctesLmdLjvSZIrhiPZKUbxWp
PXwYlbuUNxV30D4UtVmXr4j02Xk5RpOf5FngTRK08/WmhvFOhztkvDqkoJjxszeAyL+lbBhI
HU4jrgLAfwQJpi2wvpdafnXgGTeVRK3YCKHjFh7mlmo947Lo6QARAQABtDJHbyBFdGhlcmV1
bSBXaW5kb3dzIEJ1aWxkZXIgPGdldGgtY2lAZXRoZXJldW0ub3JnPokBnAQQAQoABgUCWiFs
JAAKCRDhA6IIrN/6EY5qC/9PtGVNvicWn3/fZdmS/H9YWIC0/Fvtpn/bW080q8yWVZ1yiVzV
HLe2D1oZm7ei0+m4sxFbh95ATJvFvQiWbNHDZQ0hNBx6B+68TedRkjGkRmw8HuErb6/Ekpg1
o5ub0M6z8znXUASzQ9rIJ3PyBs5Jc4AzfR3Q9qC7JJnyd6q4pSNl4DmseGQ6HIw8zOVDljPz
+kWRKx5+rIoCFbEcO06Y3XXslR/FHRH4MBkmwMIy8eqWDevPVwrArkkwO5bPpueMhuuMXmHw
AVcW6rgHsv7FIL6E9yhntoSi0pNonQ8/6/ioUBewswu4H0Oju4qdyrQjBIrs2au0AP0kkVf1
2uoQYb1/s0ZNq//IM+/Zcgv9SJM2YN8JJntBm1bSMcbGGU63P3xOUSVXO9kPdOl58O8YLvnL
CZ6xkOEmldzVkJ5YQckgzV23U++PMLFmeRneXH9HRZ3DWDQirYzOskOgpmhsXbKZJG5VntEW
QVB9BnWyImvXaH2xklfUSvLczLtz8a+JAjgEEwECACIFAlggyzECGwMGCwkIBwMCBhUIAgkK
CwQWAgMBAh4BAheAAAoJEJQXMJ7Spn6sqJ4P/3bVVnH4g9YeiCgnUMK2kZsOEyp56NstYWcQ
A0WZPdTBKkM+xeM+MnGL4Vcm/HZ00wGQ8Xk2yxJJ6Iso/Ug58fKQxc4rOdASMT7bDItJJtIk
a/IdAH4bsPA87+D+fAn6VRQ/xo1E8pRgqTgKKXTAS5m/p5zq0O5VfBHZ9hhHRM9wwkpQTivm
WGUWn+xp3dBElK+7mRIS7JFb33HS6LieIYzInbohjksY8XBKzYaGPfhRqDph2dO48pNR+DiP
l4ZkxQ5sPDNceD3K02yFsGqUN8U0Krg06wR9dm/6inCF9zhDGpBTr5q01J5EjnYQDYBdm6C6
m+86mCAY9ME/yyHMjbkjxaXZYjPESIEG9Gq9/WbQArDxl0JcKa4Pb9jGJScLT6K3aQ9eiEFn
/XTOYdqjA/XXw0A/9F5/TdsU8R+cqwhEqgLdOSsZc+EqywD5ieM/Tg4EV8O3sKQc/OaPCEI6
9cbK6lY+emF0+WWMfk6QfJMut5aHXrUZLlm6or1tq75cmeFQnivox5dIaEz3iY6tWtA9/j+n
syKEdMRP1AOESKN+O0nbOxU7VvAgCw3w3BWMWp4BydHh58F9VdeMZ/1Q0IapBHta140r4dWT
r1SPANB30cTzENxbOwMnuvSopLq2jxmHYQSLVeQC9fbnov8W1ELBaKBrftn2MzgmWt/9DVpB
=SbbF
-----END PGP PUBLIC KEY BLOCK-----
  `

export default class AppPackage {

  private pkg: IPackage | null = null;
  private packagePath: string;
  initialized: boolean = false;

  constructor(packagePath : string){
    // TODO asar files might need special handling
    if(!fs.existsSync(packagePath)){
      throw new Error('package does not exist: ' + packagePath)
    }
    this.packagePath = packagePath
  }

  async init() {
    this.pkg = await ethpkg.getPackage(this.packagePath)
    if(!this.pkg) {
      throw new Error('package could not be initialized')
    }
    this.initialized = true
    setTimeout(() => {
      if(!this.initialized) {
        throw new Error('package not initialized - forgot to call init() ?')
      }
    }, 500)
    return this
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

  async hasEmbeddedMetadata(): Promise<any> {
    // FIXME bad path /metadata.json -.> _META_ dir
    const includedMeta = this.pkg ? await this.pkg.getEntry('metadata.json') : null
    return includedMeta !== null
  }

  hasDetachedMetadata(): any {
    return fs.existsSync(this.detachedMetadataPath)
  }

  async getEmbeddedMetadata(): Promise<Object | null> {

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
      let entry = await this.pkg!.getEntry('metadata.json')
      if(!entry){
        return null
      }
      let content = entry.file.readContent()
      return JSON.parse(content.toString())
    } catch (error) {
      return null
    }
  }

  async getDetachedMetadata() : Promise<Object | null> {
    try {
      return JSON.parse(fs.readFileSync(this.detachedMetadataPath, 'utf8'))
    } catch (error) {
      // console.log('could not read detached metadata', error)
      return null
    }
  }

  async getMetadata(): Promise<any> {
    if(await this.hasEmbeddedMetadata()){
      return this.getEmbeddedMetadata()
    } else if(this.hasDetachedMetadata()){
      return this.getDetachedMetadata()
    } else {
      return null
    }
  }

  async getEntries() : Promise<IPackageEntry[]>{
    return this.pkg!.getEntries()
  }
  async getEntry(entryPath : string) : Promise<IPackageEntry | null>{
   return this.pkg!.getEntry(entryPath)
  }
  async extract(){
    let targetDir = path.basename(this.packagePath)
    if(this.isZip){
      // FIXME this.zip.extractAllTo(targetDir, /*overwrite*/false);
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