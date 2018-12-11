const http = require('http')
const https = require('https')
const stream = require('stream')

function downloadRaw(url, w, progress = () => {}) {
  return new Promise((resolve, reject) => {
    let protocol = /^https:/.exec(url) ? https : http;
    progress(0);

    const _download = (res) => {
      const total = parseInt(res.headers['content-length'], 0);
      let completed = 0;
      res.pipe(w);
      res.on('data', data => {
        completed += data.length;
        progress(completed / total);
      });
      res.on('progress', progress);
      res.on('error', reject);
      res.on('end', () => resolve(w.path));
    }

    protocol
      .get(url, res1 => {
        // if redirect -> follow
        if(res1.headers.location){
          protocol = /^https:/.exec(res1.headers.location) ? https : http;
          protocol.get(res1.headers.location, res2 => _download(res2)).on('error', reject);
        }else{
          _download(res1)
        }
      })
      .on('error', reject);
  });
}

/*
async function downloadBinAxios(url) {
  let response = await axios.get(url, {
    responseType: 'arraybuffer',
    // not working!
    // https://github.com/axios/axios/issues/928#issuecomment-322053374
    onDownloadProgress: (progressEvent) => {
      console.log('progress', progressEvent)
    }
  })
  return new Buffer.from(response.data, 'binary')
}
*/

class WMStrm extends stream.Writable {
  constructor(){
    super()
    this.buffer
  }
  _write (chunk, enc, cb) {
    var buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc);
    if(this.buffer === undefined) {
      this.buffer = buffer
    } else {
      this.buffer = Buffer.concat([this.buffer, buffer]);
    }
    cb()
  }
}

async function download(url, onDownloadProgress) {
  const memoryBuffer = new WMStrm()
  await downloadRaw(url, memoryBuffer, onDownloadProgress)
  return memoryBuffer.buffer
}

async function downloadJson(url){
  let response = await download(url)
  response = JSON.parse(response.toString())
  return response
}

function downloadToFile(filePath){
  // const dest = fso.createWriteStream(filePath);
  // downloadRaw(url, dest) 
}

module.exports.download = download
module.exports.downloadJson = downloadJson