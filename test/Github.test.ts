import path from 'path'
import GithubRepo from '../updater/repositories/Github'
import { assert } from 'chai';
import nock from 'nock'


describe('Github', () => {

  const scope = nock("https://api.github.com")
    .persist() // don't remove interceptor after request -> always return mock obj
    .get("/repos/ethereum/mist-ui/releases")
    .reply(200, require('./fixtures/githubReleases1.json'))
  
  const repo = "https://github.com/ethereum/mist-ui"
  const githubRepo = new GithubRepo(repo)
  
  describe('getReleases()', () => {

    it('returns all the releases from Github API', async () => {
      let releases = await githubRepo.getReleases()
      assert.equal(21, releases.length)
    });

    it.skip("should handle pagination", async function() {
      
    });

    it.skip("should sort releases from 'latest version' descending based on semver", async function() {

    });

  })

  describe('getLatest()', () => {
    it('returns only the latest release from Github API', async () => {
      let releases = await githubRepo.getReleases()
      assert.equal(21, releases.length)
    });
  })

  describe('download()', () => {

  })

})