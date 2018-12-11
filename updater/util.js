const parseString = require('xml2js').parseString
function parseXml(xml){
  return new Promise((resolve, reject) => {
    parseString(xml, (err, result) => {
      if(err) return reject(err)
      resolve(result)
    })
  });
}

const semverMatcher = /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?\b/ig;
// https://github.com/sindresorhus/semver-regex
function extractVersion(str){
  let result = semverMatcher.exec(str)
  return result && result.length > 0 ? result[0] : undefined
}

module.exports.parseXml = parseXml
module.exports.extractVersion = extractVersion
