const http = require('http')
const https = require('https')

const axios = require('axios')

function download(url, w, progress = () => {}) {
  return new Promise((resolve, reject) => {
    let protocol = /^https:/.exec(url) ? https : http;
    progress(0);
    protocol
      .get(url, res1 => {
        protocol = /^https:/.exec(res1.headers.location) ? https : http;
        protocol
          .get(res1.headers.location, res2 => {
            const total = parseInt(res2.headers['content-length'], 10);
            let completed = 0;
            res2.pipe(w);
            res2.on('data', data => {
              completed += data.length;
              progress(completed / total);
            });
            res2.on('progress', progress);
            res2.on('error', reject);
            res2.on('end', () => resolve(w.path));
          })
          .on('error', reject);
      })
      .on('error', reject);
  });
}

async function downloadJson(url){
  let response = await axios.get(url)
  return response.data
}

function downloadToFile(){

}

module.exports.download = download
module.exports.downloadJson = downloadJson