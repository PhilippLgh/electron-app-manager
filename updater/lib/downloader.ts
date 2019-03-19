import http from 'http'
import https from 'https'
import url from "url"
import WritableMemoryStream from './WritableMemoryStream'

export function request(method : string, _url : string, opts = {}) : Promise<http.IncomingMessage> {
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

export async function downloadStreamToBuffer(response : http.IncomingMessage, progress = (p : number) => {}) : Promise<Buffer>{
  return new Promise((resolve, reject) => {
    let headers = response.headers;
    const total = parseInt(headers["content-length"] || '0', 0);
    let completed = 0;
    let writable = new WritableMemoryStream()
    response.pipe(writable)
    response.on("data", (data : any) => {
      completed += data.length;
      progress(completed / total);
    });
    //response.on("progress", progress);
    response.on("error", reject);
    // race-condition: response.on("end", () => resolve(writable.buffer))
    writable.on('finish', () => resolve(writable.buffer))
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

export async function download(_url : string, onProgress = (progress : number) => {}, redirectCount = 0): Promise<Buffer> {
  if(redirectCount > 5) {
    throw new Error('too many redirects: ' + redirectCount)
  }
  // test for and follow redirect (GitHub)
  const result = await request("HEAD", _url);
  const headers = result.headers;
  if ((headers.status === "302 Found" || headers.status === '301 Moved Permanently') && headers.location) {
    // console.log('follow redirect for', _url)
    _url = headers.location
    return download(_url, onProgress, redirectCount++)
  }
  const response = await request('GET', _url)
  // console.log('received response', response.headers)
  const buf = await downloadStreamToBuffer(response, onProgress)
  return buf
}

export async function downloadJson(_url : string) : Promise<any> {
  let response = await download(_url)
  response = JSON.parse(response.toString())
  return response
}

function downloadToFile(filePath : string){
  // const dest = fso.createWriteStream(filePath);
  // downloadRaw(url, dest) 
}

