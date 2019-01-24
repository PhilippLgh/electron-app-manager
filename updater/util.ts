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
  let result = semverMatcher.exec(str)
  return result && result.length > 0 ? result[0] : undefined
}

