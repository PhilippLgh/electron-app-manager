import { assert } from 'chai'
import AppManager from '../updater/AppManager'
import nock from 'nock'
import path from 'path'
import fs from 'fs'
import { IRelease } from '../updater/api/IRelease';

const getAppManager = () => {
  const cachePath = __dirname + '/fixtures/Cache/'
  return new AppManager({
    repository: 'https://github.com/ethereum/grid-ui',
    cacheDir: cachePath
  })
}

describe('App Manager', () => {

  describe('async clearCache()', () => {

    /*
    it("clears the cache", async function () {
      // TODO check precondition : cache not empty
      const appManager = new AppManager({
        cacheDir: path.join(__dirname, 'fixtures', 'Cache')
      })
      const result = await appManager.clearCache()
      assert.isNotNull(result)
    })

  })

  describe('async getCachedReleases()', () => {

    it("returns all cached releases", async function () {
      const appManager = new AppManager({
        cacheDir: path.join(__dirname, 'fixtures', 'Cache')
      })
      const result = await appManager.getCachedReleases()
      assert.equal(result.length, 1)
    })

  })
  */

  /*
  describe('async checkForUpdates() : Promise<IUpdateInfo>', () => {

    it("returns updateAvailable=true if cache is empty", async function () {
      const appManager = getAppManager()
      const result = await appManager.checkForUpdates()
      console.log('result', result)
      assert.isNotNull(result)
    })

    it("returns updateAvailable=true if cache contains an older version", async function () {
      const appManager = getAppManager()
      const result = await appManager.checkForUpdates()
      console.log('result', result)
      assert.isNotNull(result)
    })
    */

  })

})
