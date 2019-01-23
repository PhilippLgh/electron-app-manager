import path from 'path'
import GithubRepo from '../updater/repositories/Github'
import { assert } from 'chai'
import nock from 'nock'
import semver from 'semver'
import { IRelease, IReleaseExtended } from '../updater/api/IRelease';

describe.skip('Github', () => {

  /**
   * Shuffles array in place.
   * @param {Array} a items An array containing the items.
   */
  function shuffle(a : any) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
  }

  const scope = nock("https://api.github.com")
    .persist() // don't remove interceptor after request -> always return mock obj
    .get("/repos/ethereum/mist-ui/releases")
    .reply(200, shuffle(require('./fixtures/githubReleases1.json')))

  const scope2 = nock("https://github.com")
    .persist()
    .head("/ethereum/mist-ui/releases/download/v0.1.19-alpha_1544698606/metadata.json")
    .reply(200, 'ok')
    .persist()
    .get("/ethereum/mist-ui/releases/download/v0.1.19-alpha_1544698606/metadata.json")
    .reply(200, require('./fixtures/metadata.json'));
  
  const repo = "https://github.com/ethereum/mist-ui"
  const githubRepo = new GithubRepo(repo)
  
  describe('getReleases()', () => {

    it('returns all the releases from Github API', async () => {
      let releases = await githubRepo.getReleases()
      assert.equal(releases.length, 21)
    });

    it('sorts releases using semver and return them descending (latest first)', async () => {
      // releases are returned in a shuffled order by the mock server
      let releases = await githubRepo.getReleases()
      let sortedVersions = '0.1.19-alpha, 0.1.10-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.5-alpha, 0.1.3, 0.1.3-alpha, 0.1.2, 0.1.2, 0.1.1, 0.1.0, 0.1.0, no version'
      let versions = releases.map((r : any) => r.version || 'no version').join(', ')
      assert.equal(versions, sortedVersions)
    });

    it.skip("handles pagination", async function() {
      
    });

  })

  describe('getLatest()', () => {

    it('returns only the latest ReleaseInfo from Github API', async () => {
      let release = await githubRepo.getLatest() as IRelease
      assert.equal(release.version, '0.1.19-alpha')
    });

    it('returns ReleaseInfoExtended if detached metadata.json present in assets', async () => {
      let release = await githubRepo.getLatest() as IReleaseExtended
      const sha512 = '047bb4e33fb42e953db1978eb1b320fb4615d6dacb9ae0369179c15eb3ed37fe5b6a0030c35abf1738ffac9e0417e63771c189f2ac690cc3f5259daa222b4390'
      assert.equal(release.checksums.sha512, sha512)
    });

  })

  describe('getVersion(version : string)', () => {
    it.skip('returns the ReleaseInfo for the specified version', async () => {

    });
  })

  describe('getMetadata(IReleaseInfo release)', () => {
    it('returns the (detached | included | hosted) IMetadata for a given IReleaseInfo', async () => {
      let releases = await githubRepo.getReleases()
      let latest = releases[0] as IRelease
      let meta = await githubRepo.getMetadata(latest)
      if(meta === null) throw new Error('metadata is null')
      const sha512 = '047bb4e33fb42e953db1978eb1b320fb4615d6dacb9ae0369179c15eb3ed37fe5b6a0030c35abf1738ffac9e0417e63771c189f2ac690cc3f5259daa222b4390'
      assert.equal(meta.sha512, sha512)
    });
  })

  describe('download(IReleaseInfo release)', () => {
    it.skip('downloads the package for a given ReleaseInfo', async () => {

    });
  })

})