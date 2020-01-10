const { md5 } = require('../lib/hashes')
const fs = require('fs')
const openpgp = require('openpgp') 

export const verifyPGP = async (fileName : string, pubKey : string, detachedSig : string) => {

  const readableStream = fs.createReadStream(fileName)

  const options = {
      message: await openpgp.message.fromBinary(readableStream),    // CleartextMessage or Message object
      signature: await openpgp.signature.readArmored(detachedSig), // parse detached signature
      publicKeys: (await openpgp.key.readArmored(pubKey)).keys    // for verification
  };


  // unwrapped verify function
  /*
  let publicKeys = [options.publicKeys]
  let date = new Date()
  let streaming = true
  let signature = options.signature
  let message = options.message
  const result : any = {};
  result.signatures = await message.verifyDetached(signature, publicKeys, date, streaming)
  result.data = message.getLiteralData();
  if (streaming) linkStreams(result, message);
  result.data = await convertStream(result.data, streaming);
  // if (!streaming) await prepareSignatures(result.signatures);
  */

 let verified = await openpgp.verify(options) as any
  /*
  let verified = result
 */
  await openpgp.stream.readToEnd(verified.data);
  let validity = await verified.signatures[0].verified;
  return validity
}

export const checksumMd5 = (fileName : string) => {
  const content = fs.readFileSync(fileName)
  let calculatedHash = md5(content)
  return calculatedHash as string
} 
