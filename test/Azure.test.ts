import path from 'path'
import fs from 'fs'
import { assert } from 'chai'
import Azure from '../updater/repositories/Azure'
import nock from 'nock'
import { IRelease, IReleaseExtended } from '../updater/api/IRelease'

describe.skip('Azure', () => {

  const repoUrl = 'https://gethstore.blob.core.windows.net/builds?restype=container&comp=list'

  const scope = nock('https://gethstore.blob.core.windows.net', { allowUnmocked: false })
    .persist()
    .head('/builds?restype=container&comp=list')
    .reply(200, 'ok')
    .persist() // don't remove interceptor after request -> always return mock obj
    .get('/builds?restype=container&comp=list')
    .reply(200, fs.readFileSync(__dirname+'/fixtures/azureReleases.xml'))
    .head('/builds/geth-alltools-windows-386-1.8.21-9dc5d1a9.zip').reply(200, 'ok')
    .get('/builds/geth-alltools-windows-386-1.8.21-9dc5d1a9.zip')
    .reply(200, fs.readFileSync(__dirname+'/fixtures/BinCache/geth'))
    .head('/builds/geth-alltools-windows-386-1.8.21-9dc5d1a9.zip.asc').reply(200, 'ok')
    .get('/builds/geth-alltools-windows-386-1.8.21-9dc5d1a9.zip.asc')
    .reply(200, fs.readFileSync(__dirname+'/fixtures/geth-alltools-darwin-amd64-1.8.21-9dc5d1a9.tar.gz.asc'))

  const releaseModifier = (release : IRelease) => {
    // remove commit id from version:
    const version = release.version.split('-').slice(0, -1).join('-') 
    // return only values here that should be overwritten
    return {
      version
    }
  }

  describe('getReleases()', () => {
    
    it('returns all the releases from Azure API', async () => {
      const azure = new Azure(repoUrl)
      const releases = await azure.getReleases()
      assert.equal(releases.length, 194)
    })

    it.skip('sorts releases using semver and return them descending (latest first)', async () => {
      const azure = new Azure(repoUrl)
      const releases = await azure.getReleases()
      let names = releases.map(rel => rel.name).join('\n')
    })

    it('merges detached metadata urls into metadata fields', async () => {
      const azure = new Azure(repoUrl)
      const releases = await azure.getReleases()
      let release = releases[10] as IRelease
      assert.equal(release.signature, 'https://gethstore.blob.core.windows.net/builds/geth-windows-386-1.8.19-dae82f09.zip.asc')
    })

  })

  describe('getLatest()', () => {

    it('returns only the latest ReleaseInfo from Azure API', async () => {
      const azure = new Azure(repoUrl)
      let release = await azure.getLatest() as IRelease
      assert.equal(release.version, '1.8.21-9dc5d1a9')
    })

    it('applies a modifier to overwrite release-parser defaults', async () => {
      const azure = new Azure(repoUrl, {
        onReleaseParsed: releaseModifier
      })
      let release = await azure.getLatest() as IRelease
      assert.equal(release.version, '1.8.21')
    })

    it('merges detached metadata content into metadata fields', async () => {
      const azure = new Azure(repoUrl, {
        onReleaseParsed: releaseModifier
      })
      let release = await azure.getLatest() as IReleaseExtended
      assert.equal(release.signature, fs.readFileSync(__dirname+'/fixtures/geth-alltools-darwin-amd64-1.8.21-9dc5d1a9.tar.gz.asc', 'utf8'))
    })

  })

  describe('download()', () => {

    it('downloads the release', async function(){
      const azure = new Azure(repoUrl, {
        onReleaseParsed: releaseModifier
      })
      let release = await azure.getLatest() as IRelease
      let bin = await azure.download(release)
      assert.equal(bin.length, release.size)
    })

  })

})