const {verifyPGP, checksumMd5} = require('../updater/tasks/verify')
import { assert } from 'chai'


describe('Verification', () => {

  const binFileName = __dirname + '/fixtures/BinCache/geth-windows-amd64-1.8.20-24d727b6.exe'
  const binChecksumMd5 = '435eb57fb3bf77393e4086e1ea2f275c'
  const detachedSig = `
-----BEGIN PGP SIGNATURE-----

wsFcBAABCAAQBQJcD9I2CRCUFzCe0qZ+rAAABSgQAFVca4KgXeomNjiREFII3aVM
2DtWWa53Kjih1qTAS/m+zVU8QQB+PccgRTl01WjgD7wINddsFbx788j+Baipf8u6
q6yVMtbasnrVUdvmT9XXnn9ZDd1k5VsbK+TeWnSw5E9nQgn1KOcNeuv79UARJczD
qgWG1jeoudKL2a9SPSmaT3GUkSi54X8euiERBv2OrC4+wmqpRFYxgnZwU8oJpPQ9
EJr2fsdGZQxIx5Iae4OPc26x2BJqhMeWErEF1PcDzwErjRcIea1rPJpEExWB8Pwc
+A0lvqJujOPXbJluiuwYo3FPYfRamt/bW7ICP2LRAKdg/dwjmhFjH1i/iUA5+m3h
dsSEJOBzZ4pm3uydanVcsiesq3DBPlzqdqIJ79Z8zlsYDf/kzcy+BwD4ex+ReYiU
bEwdLzDrA4jEdI9QkWnR76Cdxrx62dnjnW2x7gnARhZ7gPq7Ii3qawJMKH3BUhpB
oVmwM884pG1LyoNUC7lKslIeEldJfrCAOcfUUktp9ZCdAMic84bTb1bpihN2CvmJ
K2bGDuXlROc5hjOMX91WYSG4CQk9EupJ7ihi+CkYm9917Vm32TswxapDn8w57CG5
mjplVIg09uVCovddfCOMcgp6rf/qDpxBbumNnJf1uobmxPIAVo9Wn8xGBHBOmCQP
gZ5OTEVT2+m4kQy3/mjB
=DwaV
-----END PGP SIGNATURE-----
`
  const pubKeyBuildServer = `
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: SKS 1.1.6
Comment: Hostname: keyserver.ubuntu.com

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
=SbbF
-----END PGP PUBLIC KEY BLOCK-----
  `

  it("should verify md5 checksums", async function() {
      let result = checksumMd5(binFileName)
      assert.equal(binChecksumMd5, result)
  });

  it("should verify signature", async function() {
    let result = await verifyPGP(binFileName, pubKeyBuildServer, detachedSig)
    assert.isTrue(result)
  });

})