import path from 'path'
import { assert } from 'chai';
import Cache from '../updater/repositories/Cache'

describe('Cache', () => {

  describe('getReleases()', () => {

    const cacheDir = path.join(__dirname, 'fixtures', 'Cache')

    it('returns all the releases from Cache directory on fs', async () => {
      const cache = new Cache(cacheDir)
      const releases = await cache.getReleases()
      assert.equal(1, releases.length)
    });

    it.skip('should sort releases using semver and return them descending (latest first)', async () => {

    });

    it.skip("should search all paths when provided with the paths[] option", async function() {
      
    });

  })

})