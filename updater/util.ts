import path from 'path'
// @ts-ignore
import {parseString} from 'xml2js'

import { IRelease, IInvalidRelease } from "./api/IRelease"
import { pkgsign } from 'ethpkg'

import { download } from "./lib/downloader"

import semver from 'semver'

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
