var crypto = require('crypto');

module.exports.md5 = data => crypto.createHash('md5').update(data).digest("hex")