import path from 'path'
import { assert } from 'chai';
import Cache from '../updater/repositories/Cache'
import { IRelease, IReleaseExtended } from '../updater/api/IRelease'

describe('Cache', () => {

  const packageCacheDir = path.join(__dirname, 'fixtures', 'PackageCache')
  const detachedCacheDir = path.join(__dirname, 'fixtures', 'DetachedCache')

  describe('getReleases()', () => {

    it('returns all the releases from Cache directory on fs', async () => {
      const cache = new Cache(packageCacheDir)
      const releases = await cache.getReleases()
      assert.equal(releases.length, 1)
    });

    it('detects detached metadata and parses it', async () => {
      const cache = new Cache(detachedCacheDir)
      const releases = await cache.getReleases()
      const release = releases[0] as IReleaseExtended
      // console.log('release', release)
      assert.equal(release.checksums.md5, "c2ada7c395e8552c654ea89dfaa20def")
    });

    it('detects embedded metadata and parses it', async () => {
      const cache = new Cache(detachedCacheDir)
      const releases = await cache.getReleases()
      const release = releases[0] as IReleaseExtended
      // console.log('release', release)
      assert.equal(release.checksums.md5, "c2ada7c395e8552c654ea89dfaa20def")
    });

    it.skip('finds metadata in zip files', async () => {

    });

    it.skip('finds metadata in asar files', async () => {

    });

    it('validates packages based on metadata', async () => {
      assert.isTrue(false)
    });

    it.skip('sorts releases using semver and return them descending (latest first)', async () => {

    });

    it.skip("searches all paths when provided with the paths[] option", async function() {
      
    });

  })

  describe('getLatest()', () => {
    
    it('returns only the latest ReleaseInfo from cache directory', async () => {
      const cache = new Cache(packageCacheDir)
      let release = await cache.getLatest() as IRelease
      assert.equal(release.version, '0.1.19')
    })

    it.skip('respects user settings for the latest package', async () => {

    });

  })

})