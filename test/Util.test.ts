import { compareVersions } from "../updater/util";
import { assert } from 'chai'

describe('Utils', () => {

  it('sorts releases', async () => {
    let releases = [
      {version: '1.0.0-alpha', channel: 'alpha'},
      {version: '1.0.0-master', channel: 'master'},
      {version: '1.0.0-dev', channel: 'dev'},
      {version: '1.0.0-master', channel: 'master'},
      {version: '1.0.0', channel: 'dev'},
      {version: '1.0.0', channel: 'alpha'},
      {version: '1.0.0', channel: 'dev'},
      {version: '1.0.0-alpha', channel: 'alpha'},
      {version: '1.0.0', channel: 'dev'},
      {version: '1.0.0', channel: 'alpha'},
      {version: '1.0.0-nightly', channel: 'nightly'},
      {version: '1.0.0', channel: 'alpha'},
    ]
    let sorted = releases.sort(compareVersions)
    const result = sorted.map(r => r.channel).join(',')
    assert.equal(result, 'master,master,nightly,alpha,alpha,alpha,alpha,alpha,dev,dev,dev,dev')
  });

})