const semver = require('semver')

class Repo {
  normalizeTag(tag) {
    if (tag[0] == 'v') tag = tag.slice(1);
    return tag;
  }
  compareVersions(v1, v2) {
    if (semver.gt(v1.version, v2.version)) {
      return -1;
    }
    if (semver.lt(v1.version, v2.version)) {
      return 1;
    }
    return 0;
  }
}

module.exports = Repo