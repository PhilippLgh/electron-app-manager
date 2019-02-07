import crypto from 'crypto'

export const md5 = (data : Buffer | string) => crypto.createHash('md5').update(data).digest("hex")
