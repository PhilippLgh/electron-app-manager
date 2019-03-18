import { assert } from 'chai'
import AppPackage from '../updater/AppPackage'

const tarPath = __dirname + '/fixtures/TarCache/' + 'geth-darwin-amd64-1.8.22-7fa3509e.tar.gz'


describe('AppPackage', () => {

  describe('ctor()', () => {
  })

  describe('getEntries()', () => {
    
    it('returns all entries from the package', async () => {
      let appPackage = await new AppPackage(tarPath).init()
      let entries = await appPackage.getEntries()
      assert.isArray(entries)
      assert.equal(entries.length, 3)
    })

  })

  describe('getEntry()', async () => {
    
    it('returns the entry header and buffer from the package', async () => {
      let appPackage = await new AppPackage(tarPath).init()
      let entry = await appPackage.getEntry('geth-darwin-amd64-1.8.22-7fa3509e/geth')
      assert.isNotNull(entry)
    })

  })

  describe('entry.getData()', () => {
    
    it('returns the entry header and buffer from the package', async function(){
      let appPackage = await new AppPackage(tarPath).init()
      let entry = await appPackage.getEntry('geth-darwin-amd64-1.8.22-7fa3509e/geth')
      assert.isNotNull(entry)
      // @ts-ignore entry != null
      let data = await entry.file.readContent()
      assert.equal(data.length, 14346)
    })

  })

  describe('extract()', () => {

    it.skip("extracts the package content to the same director", async () => {
      let packagePath = __dirname + '/fixtures/PackageCache/mist-ui-react_0.1.19b.zip'
      let appPackage = await new AppPackage(packagePath).init()
      appPackage.extract()
    });

  })
  
})