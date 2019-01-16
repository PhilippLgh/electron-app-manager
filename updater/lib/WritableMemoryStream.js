const stream = require('stream')

class WMStrm extends stream.Writable {
  constructor(){
    super()
    this.buffer = undefined
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

module.exports = WMStrm
