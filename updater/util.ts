import path from 'path'
// @ts-ignore
import {parseString} from 'xml2js'

import { IRelease } from "./api/IRelease"
import { pkgsign } from '@philipplgh/ethpkg'

import { download } from "./lib/downloader"

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

export function isUrl(str : string) {
  var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}

const SUPPORTED_EXTENSIONS = ['.zip', '.tar.gz', '.tar']

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

const isRelease = <IRelease>(value: any): value is IRelease => {
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