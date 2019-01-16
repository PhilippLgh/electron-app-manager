const { md5 } = require('../lib/hashes')
const fs = require('fs')

export const verifyPGP = () => {


}

export const checksumMd5 = (fileName : string) => {
  const content = fs.readFileSync(fileName)
  let calculatedHash = md5(content)
  return calculatedHash as string
} 
