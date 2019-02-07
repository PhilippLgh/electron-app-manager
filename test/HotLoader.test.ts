import HotLoader from "../updater/HotLoader";
import AppManager from "../updater/AppManager";
import { assert } from 'chai'

describe.skip('HotLoader', () => {

  it.skip("stores the loaded app in currentApp", async function() {
    let appManager = new AppManager({
      repository: ''
    })
    let hotLoader = new HotLoader(appManager)
    // loads latest
    await hotLoader.loadLatest()
    assert.isDefined(hotLoader.currentApp)
    const latest = await appManager.getLatestRemote()
    // assert.equal(latest.version, hotLoader.currentApp.version)
  })

})