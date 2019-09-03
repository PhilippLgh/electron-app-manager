import { assert } from 'chai'
import { download, downloadJson } from '../updater/lib/downloader'

describe('Downloader', function(){
  this.timeout(120 * 1000);

  it.skip('throws on 404', async () => {
    const onProgress = (progress : number) => {}
    const result = await download('https://httpstat.us/404', onProgress)
    console.log('result', result)
    assert.equal(1, 1)
  });

  it('downloads from bintray', async () => {
    console.time('download time')
    const onProgress = (progress : number) => {
      // console.log('progress', progress)
    }
    const location = 'https://bintray.com/consensys/pegasys-repo/download_file?file_path=pantheon-1.1.4.tar.gz'
    const result = await download(location, onProgress, 0, {
      parallel: 0
    })
    console.timeEnd('download time')
    assert.equal(result.length, 35104796)
  })

})

