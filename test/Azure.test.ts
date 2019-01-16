import path from 'path'
import { assert } from 'chai';
import Azure from '../updater/repositories/Azure'

describe.skip('Azure', () => {

  describe('getReleases()', () => {

    const repoUrl = 'https://gethstore.blob.core.windows.net/builds?restype=container&comp=list'


    it('returns all the releases from Cache directory on fs', async function(){
      this.timeout(200000)
      const azure = new Azure(repoUrl)
      const releases = await azure.getReleases()
      // console.log('azure releases', releases)
      assert.equal(1, releases.length)
    });

    it.skip('should sort releases using semver and return them descending (latest first)', async () => {

    });

    it.skip("should search all paths when provided with the paths[] option", async function() {
      
    });

  })

})