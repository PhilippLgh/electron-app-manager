import { assert } from 'chai'
import AppPackage from '../updater/AppPackage';


describe('AppPackage', () => {

  describe('ctor()', () => {
  })

  describe('getEntries()', () => {
    
    it('returns all entries from the package', async () => {
      let tarPath = __dirname + '/fixtures/TarCache/' + 'geth-darwin-amd64-1.8.22-unstable-24d66944.tar.gz'
      let appPackage = new AppPackage(tarPath)
      let entries = await appPackage.getEntries()
      assert.isArray(entries)
      assert.equal(entries.length, 3)
    })

  })

  describe('getEntry()', () => {
    
    it('returns the entry header and buffer from the package', async function(){
      this.timeout(20 * 1000)
      let tarPath = __dirname + '/fixtures/TarCache/' + 'geth-darwin-amd64-1.8.22-unstable-24d66944.tar.gz'
      let appPackage = new AppPackage(tarPath)
      let entry = await appPackage.getEntry('geth-darwin-amd64-1.8.22-unstable-24d66944/geth')
      assert.isNotNull(entry)
    })

  })

  describe('entry.getData()', () => {
    
    it('returns the entry header and buffer from the package', async function(){
      this.timeout(20 * 1000)
      let tarPath = __dirname + '/fixtures/TarCache/' + 'geth-darwin-amd64-1.8.22-unstable-24d66944.tar.gz'
      let appPackage = new AppPackage(tarPath)
      let entry = await appPackage.getEntry('geth-darwin-amd64-1.8.22-unstable-24d66944/geth')
      assert.isNotNull(entry)
      // @ts-ignore entry != null
      let data = await entry.getData()
      assert.equal(data.length, 31877024)
    })

  })

  describe('extract()', () => {

    it.skip("extracts the package content to the same director", async function() {
      let packagePath = __dirname + '/fixtures/PackageCache/mist-ui-react_0.1.19b.zip'
      let appPackage = new AppPackage(packagePath)
      appPackage.extract()
    });

  })
  
})