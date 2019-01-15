import path from 'path'
import GithubRepo from '../updater/repositories/Github'
import { assert } from 'chai'
import nock from 'nock'
import semver from 'semver'
import { IRelease } from '../updater/api/IRelease';

describe('Github', () => {

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
      assert.equal(21, releases.length)
    });

    it('should sort releases using semver and return them descending (latest first)', async () => {
      // releases are returned in a shuffled order by the mock server
      let releases = await githubRepo.getReleases()
      let sortedVersions = '0.1.19-alpha, 0.1.10-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.9-alpha, 0.1.5-alpha, 0.1.3, 0.1.3-alpha, 0.1.2, 0.1.2, 0.1.1, 0.1.0, 0.1.0, no version'
      let versions = releases.map((r : any) => r.version || 'no version').join(', ')
      assert.equal(sortedVersions, versions)
    });

    it.skip("should handle pagination", async function() {
      
    });

  })

  describe('getLatest()', () => {
    it('returns only the latest release from Github API', async () => {
      let release = await githubRepo.getLatest() as IRelease
      assert.equal('0.1.19-alpha', release.version)
    });
  })

  describe('download()', () => {

  })

})