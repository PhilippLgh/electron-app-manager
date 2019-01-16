const { md5 } = require('../lib/hashes')
const fs = require('fs')
const openpgp = require('openpgp') 

const verify = (options : any) => {
  return new Promise((resolve, reject) => {
    openpgp.verify(options).then(function(verified : any) {
      console.log('data ready')
      resolve(verified)
    })
  });
}

export const verifyPGP = async (fileName : string, pubKey : string, detachedSig : string) => {

  const readableStream = fs.createReadStream(fileName)

  const options = {
      message: await openpgp.message.fromBinary(readableStream),        // CleartextMessage or Message object
      signature: await openpgp.signature.readArmored(detachedSig), // parse detached signature
      publicKeys: (await openpgp.key.readArmored(pubKey)).keys     // for verification
  };

  let verified = await verify(options) as any
  await openpgp.stream.readToEnd(verified.data);
  let validity = await verified.signatures[0].verified;
  return validity
}

export const checksumMd5 = (fileName : string) => {
  const content = fs.readFileSync(fileName)
  let calculatedHash = md5(content)
  return calculatedHash as string
} 
