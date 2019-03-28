import path from 'path'
// @ts-ignore
import {parseString} from 'xml2js'

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
