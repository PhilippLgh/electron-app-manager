import { assert } from 'chai'
import AppPackage from '../updater/AppPackage';


describe('AppPackage', () => {

  describe('ctor()', () => {
  })

  describe('extract()', () => {

    it("extracts the package content to the same director", async function() {
      let packagePath = __dirname + '/fixtures/PackageCache/mist-ui-react_0.1.19b.zip'
      let appPackage = new AppPackage(packagePath)
      appPackage.extract()
    });

  })
  
})