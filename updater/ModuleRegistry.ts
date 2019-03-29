import url from 'url'
import { IPackage, pkgsign } from "@philipplgh/ethpkg"

// singleton class that keeps track of hot-loaded modules

class ModuleRegistry {
  
  modules: {[index:string] : IPackage}  ;

  constructor() {
    this.modules = {}
  }

  async add(pkg : IPackage) : Promise<string> {
    const moduleId = Math.random().toString(26).slice(2)
    if(await pkgsign.isSigned(pkg)) {
      console.log('is signed')
    } else {
      console.log('not signed')
      // FIXME check policy and throw if unsigned: don't serve unsigned packages
    }
    this.modules[moduleId] = pkg
    const protocol = 'package:'
    const appUrl = url.format({
      slashes: true,
      protocol,
      pathname: `${moduleId}/index.html`, // path does only exist in memory
    })
    // app can now be served from this url
    return appUrl
  }

  has(moduleId : string){
    return this.modules[moduleId] !== undefined
  }

  get(moduleId : string){
    return this.modules[moduleId]
  }

  // FIXME add unload functionality

}

export default new ModuleRegistry()