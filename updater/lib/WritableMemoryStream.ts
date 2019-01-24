import stream from 'stream'
export default class WMStrm extends stream.Writable {
  
  buffer: Buffer | undefined;

  constructor(){
    super()
    this.buffer = undefined
  }
  _write (chunk : any, enc : string, cb : Function) {
    var buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc);
    if(this.buffer === undefined) {
      this.buffer = buffer
    } else {
      this.buffer = Buffer.concat([this.buffer, buffer]);
    }
    cb()
  }
}
