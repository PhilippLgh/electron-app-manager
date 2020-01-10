import stream from 'stream'
export default class WMStrm extends stream.Writable {
  
  buffer: Buffer | undefined;
  data : any[] = []

  constructor(){
    super()
    this.buffer = undefined
    this.data = []
    this.once('finish', () => {
      // it seems that if data ony contains one item concat takes significantly longer
      // which uncovered a race condition of stream events
      this.buffer = this.data.length === 1 ? this.data.pop() : Buffer.concat(this.data)
    })
  }
  // for 30 MB file this takes .3 sec
  _write (chunk : any, enc : string, cb : Function) {
    this.data.push(chunk)
    cb()
  }
  /*
  for 30 MB file this can take 30 sec
  _write (chunk : any, enc : string, cb : Function) {
    var buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc);
    if(this.buffer === undefined) {
      this.buffer = buffer
    } else {
      // this.buffer = Buffer.concat([this.buffer, buffer]);
    }
    cb()
  }
  */
}
