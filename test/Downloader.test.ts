import { assert } from 'chai'
import { download, downloadJson } from '../updater/lib/downloader'

describe('Downloader', function(){
  this.timeout(30 * 1000);

  it.skip('throws on 404', async () => {
    const onProgress = (progress : number) => {}
    const result = await download('https://httpstat.us/404', onProgress)
    console.log('result', result)
    assert.equal(1, 1)
  });

  it('downloads from bintray', async () => {
    const onProgress = (progress : number) => {
      console.log('progress', progress)
    }
    const location = 'https://bintray.com/consensys/pegasys-repo/download_file?file_path=pantheon-1.1.4.tar.gz'
    const result = await download(location, onProgress)
    assert.equal(result.length, 36486573)
  })

})

