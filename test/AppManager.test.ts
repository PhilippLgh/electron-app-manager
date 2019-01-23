import { assert } from 'chai'
import AppManager from '../updater/AppManager'
import nock from 'nock'
import path from 'path'
import fs from 'fs'
import { IRelease } from '../updater/api/IRelease';

describe('App Manager', () => {

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

  describe('Constructor', () => {

    it("detects the correct repo based on the given url", async function () {
      const githubUpdater = new AppManager({
        repository: 'https://github.com/ethereum/mist-ui'
      })
      assert.equal(githubUpdater.remote.name, 'Github')
  
      const azureUpdater = new AppManager({
        repository: 'https://gethstore.blob.core.windows.net/'
      })
      assert.equal(azureUpdater.remote.name, 'Azure')
    })
  
    it("throws an exception if the repo url is not supported", async function () {
      assert.throws(() => {
        const updater = new AppManager({
          repository: 'https://hitgub.com/ethereum/mist-ui'
        })
      })
    })
    
  })

  describe('Parser', () => {

    it("supports parser modifiers", async function () {
      const azureUpdater = new AppManager({
        repository: 'https://gethstore.blob.core.windows.net' + '/builds?restype=container&comp=list', // FIXME remove query params
        modifiers: {
          // @ts-ignore
          version: ({ version })  => version.split('-').slice(0, -1).join('-')
        },
        cacheDir: __dirname + '/fixtures/TestCache/'
      })
  
      const latest = await azureUpdater.getLatest()
      assert.equal(latest && latest.version, '1.8.21')
    })
    
  })


  describe('Cache', () => {

    it("finds the latest cached package", async function () {
      const azureUpdater = new AppManager({
        repository: 'https://gethstore.blob.core.windows.net/',
        cacheDir: __dirname + '/fixtures/PackageCache/'
      })
      const latest = await azureUpdater.getLatestCached()
      assert.equal(latest && latest.version, '0.1.19')
    })

  })

  describe('Web / Dev mode', () => {

    it("loads a web app by url in dev mode", async function () {
    
    })

  })

  describe('Downloader', () => {

    it("downloads the package if it isn't cached", async function () {

      const cachePath = __dirname + '/fixtures/TestCache/'
  
      const azureUpdater = new AppManager({
        repository: 'https://gethstore.blob.core.windows.net' + '/builds?restype=container&comp=list', // FIXME remove query params
        modifiers: {
          // @ts-ignore
          version: ({ version })  => version.split('-').slice(0, -1).join('-')
        },
        cacheDir: cachePath
      })
  
      const latest = await azureUpdater.getLatest()
  
      if(latest === null){
        throw new Error('latest should not be null')
      }
  
      assert.equal(latest.version, '1.8.21')
  
      await azureUpdater.download(latest)
  
      assert.isTrue(fs.existsSync(cachePath + latest.fileName))
  
    })

  })

})
