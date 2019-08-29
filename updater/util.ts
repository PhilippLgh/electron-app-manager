import path from 'path'
// @ts-ignore
import {parseString} from 'xml2js'
import { IRelease, IInvalidRelease } from "./api/IRelease"
import { pkgsign } from 'ethpkg'
import { download } from "./lib/downloader"
import semver from 'semver'
import { WebContents } from 'electron'
import { md5 } from './lib/hashes'

export function parseXml(xml : string){
  return new Promise((resolve, reject) => {
    parseString(xml, (err : any, result : any) => {
      if(err) return reject(err)
      resolve(result)
    })
  });
}

const semverMatcher = /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?\b/ig;
// https://github.com/sindresorhus/semver-regex
export function extractVersion(str : string){
  semverMatcher.lastIndex = 0
  let result = semverMatcher.exec(str)
  return result && result.length > 0 ? result[0] : undefined
}

// heuristic to extract platform (display) name
export function extractPlatform(str : string){
  str = str.toLowerCase() 
  if (str.includes('win32') || str.includes('windows')) {
    return 'windows'
  }
  if (str.includes('darwin') || str.includes('mac') || str.includes('macos')) {
    return 'mac'
  }
  if (str.includes('linux')) {
    return 'linux'
  }
  return undefined
}

/*
* https://askubuntu.com/questions/54296/difference-between-the-i386-download-and-the-amd64
* amd64 and intel64 are compatible
* TODO but we might want to distinguish arm chips etc
* https://en.wikipedia.org/wiki/ARM_architecture#Cores
*/
const ARCH = {
  'ARM32': '32 Bit',
   // all arm are 32 since ARMv8-A they are 64/32
  'ARM64': '64 Bit',
  'B32': '32 Bit',
  // TODO use this notation?
  'B3264': '32/64 Bit',
  'B64': '64 Bit'
}

// heuristic to extract platform architecture (display) name
export function extractArchitecture(str : string){
  try {
    // FIXME remove extension first
    str = str.toLowerCase()
    let name = str
    // FIXME this heuristic wil fail for binaries with names like winrar
    // FIXME we can probably re-use the result from extractPlatform here for perf
    let isWindows = name.includes('windows') || name.includes('win')
    const parts = str.split(/[\s_-]+/)
    for(str of parts) {
      if (isWindows) {
        if (str.includes('386')) {
          return ARCH.B32
        }
        if (str.includes('amd64')) {
          return ARCH.B64
        }
        if (str.includes('win32')) {
          return ARCH.B32
        }
      }
      if (str.includes('x86-64')) {
        return ARCH.B64
      }
      if (str.includes('x86')) {
        return ARCH.B32
      }
      if (str.includes('ia32')) {
        return ARCH.B32
      }
      if (str === 'arm64') {
        return ARCH.ARM64
      }
      if (str === 'arm') {
        return ARCH.ARM32
      }
    }
    return ARCH.B32    
  } catch (error) {
    return undefined
  }
}

// 0.4.4-Unstable-0bc45194 -> v0.4.4
export function simplifyVersion(str : string){
  var n = str.indexOf('-')
  str = str.substring(0, n != -1 ? n : str.length)
  return `v${str}`
}

const REALEASE_CHANNEL : {[index:string] : number} = {
  dev: -1,
  ci: -1,
  alpha: 0,
  beta: 1,
  nightly: 2,
  production: 3,
  master: 4,
  release: 4,
}
export const compareVersions = (a : IRelease | IInvalidRelease | {version?:string, channel?: string}, b : IRelease | IInvalidRelease | {version?:string, channel?: string}) => {
  if(!('version' in a) || !a.version) return -1
  if(!('version' in b) || !b.version) return 1
  // don't let semver apply its "channel logic": 
  // coerce to apply custom channel logic on same versions (same before "-channel")
  let av = semver.coerce(a.version)
  let bv = semver.coerce(b.version)
  // @ts-ignore
  const semComp = semver.compare(bv, av)
  if(semComp === 0) {
    const channelA = REALEASE_CHANNEL[a.channel || '']
    const channelB = REALEASE_CHANNEL[b.channel || '']
    if(channelA === undefined) return -1
    if(channelB === undefined) return 1
    if(channelA > channelB) return -1
    if(channelB > channelA) return 1
    return 0
  }
  return semComp
}

export function isUrl(str : string) {
  var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}

const SUPPORTED_EXTENSIONS = ['.zip', '.tar.gz', '.tgz', '.tar']

// this helper is especially used to support .tar.gz
export const getExtension = (fileName : string) => {
  for (let i = 0; i < SUPPORTED_EXTENSIONS.length; i++) {
    const ext = SUPPORTED_EXTENSIONS[i];
    if(fileName.endsWith(ext)){
      return ext
    }
  }
  return path.extname(fileName)
}

export function hasSupportedExtension(fileName : string){
  const ext = getExtension(fileName)
  return SUPPORTED_EXTENSIONS.includes(ext)
}

export const isRelease = <IRelease>(value: any): value is IRelease => {
  return value !== null && value !== undefined && !value.error && value.version
}

export const getEthpkg = async (app : IRelease | Buffer | string) => {
  let pkg
  if(Buffer.isBuffer(app)) {
    return pkgsign.loadPackage(app)
  } 
  else if (typeof app === 'string') {
    if (isUrl(app)) {
      const appBuf = await download(app)
      return pkgsign.loadPackage(appBuf)
    } else {
      return pkgsign.loadPackage(app)
    }
  }
  else if(isRelease(app)) {
    // TODO if local
    return pkgsign.loadPackage(app.location)
  }
  else {
    throw new Error('unsupported package format')
  }
}

export const isElectron = () => {
  // Renderer process
  // @ts-ignore
  if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
    return true
  }
  // Main process
  // @ts-ignore Property 'electron' does not exist on type 'ProcessVersions'
  if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
    return true
  }
  // Detect the user agent when the `nodeIntegration` option is set to true
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
    return true
  }
  return false
}

export const isPackaged = () => {
  try {
    const electron = require('electron')
    const app = electron.app || electron.remote.app;
    return app.isPackaged
  } catch (error) {
    return false
  }
}

export const findWebContentsByTitle = (windowTitle : string) : Promise<WebContents> => new Promise((resolve, reject) => {
  const { webContents } = require('electron')
  let _webContents = webContents.getAllWebContents()

  const assignListeners = (fun : Function) => {
    _webContents.forEach((w : any) => {
      w.on('page-title-updated', fun)
    })
  }

  const removeListeners = (fun : Function) => {
      _webContents.forEach((w : any) => {
        w.removeListener('page-title-updated', fun)
      })
  }

  const rendererDetection = function({sender: webContents} : any, title : string) {
    if (title === windowTitle) {
      // found the webContents instance that is rendering the splash:
      removeListeners(rendererDetection)
      resolve(webContents)
    }
  }

  // we assign a listener to each webcontent to detect where the title changes
  assignListeners(rendererDetection)
})

// TODO implement expiration
// TODO implement persistence
export const memoize = (fn : Function) => {
  let cache : any = {}
  return async (...args : any[]) => {
    const n = md5(JSON.stringify(args));
    if (n in cache) {
      return cache[n];
    }
    else {
      let result
      try {
        result = await fn(args)
      } catch (error) {
        console.log('error in memoize', error)
      }
      cache[n] = result;
      return result;
    }
  }
}