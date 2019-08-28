import url from 'url'
import { IPackage, pkgsign } from "ethpkg"
import { IRepository } from './api/IRepository'
import { EventEmitter } from 'events'

// singleton class that keeps track of hot-loaded modules

interface IModule {
  pkg : IPackage,
  repo?: IRepository
}

class ModuleRegistry extends EventEmitter{
  
  modules: {[index:string] : IModule}  ;

  constructor() {
    super()
    this.modules = {}
  }

  async add(mod : IModule) : Promise<string> {
    let moduleId
    if (mod.repo) moduleId = [mod.repo.name || '_', mod.repo.owner || '_', mod.repo.repo || '_'].join('.').toLowerCase()
    else
      moduleId = Math.random().toString(26).slice(2)

    const {pkg} = mod
    if(await pkgsign.isSigned(pkg)) {
      console.log('is signed')
    } else {
      console.log('not signed')
      // FIXME check policy and throw if unsigned: don't serve unsigned packages
    }
    this.modules[moduleId] = mod

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

  getPackage(moduleId : string){
    return this.modules[moduleId].pkg
  }

  getAllModules() {
    return this.modules
  }

  // FIXME add unload functionality

}

export default new ModuleRegistry()