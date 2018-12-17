const http = require('http')
const https = require('https')
const url = require("url")
const WritableMemoryStream = require('./WritableMemoryStream')

function request(method, _url, opts) {
  const parsedURL = url.parse(_url);
  let protocolHandler = parsedURL.protocol === "https:" ? https : http;

  const options = {
    protocol: parsedURL.protocol,
    hostname: parsedURL.hostname,
    method,
    path: parsedURL.path,
    ...opts
  };

  return new Promise((resolve, reject) => {
    let req = protocolHandler.request(options, res => {
      resolve(res);
    });
    req.on("error", e => {
      reject(e);
    });
    req.end();
  });
}

async function downloadStreamToBuffer(response, progress = () => {}){
  return new Promise((resolve, reject) => {
    let headers = response.headers;
    const total = parseInt(headers["content-length"], 0);
    let completed = 0;
    let writable = new WritableMemoryStream()
    response.pipe(writable)
    response.on("data", data => {
      completed += data.length;
      progress(completed / total);
    });
    //response.on("progress", progress);
    response.on("error", reject);
    response.on("end", () => resolve(writable.buffer));
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

async function download(url, progress = () => {}){
  // test for and follow redirect (GitHub)
  let result = await request("HEAD", url);
  let headers = result.headers;
  if (headers.status === "302 Found" && headers.location) {
    url = headers.location
  }
  let response = await request('GET', url)
  let buf = await downloadStreamToBuffer(response, progress)
  return buf
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

module.exports.request = request
module.exports.download = download
module.exports.downloadResponse = downloadStreamToBuffer
module.exports.downloadJson = downloadJson
