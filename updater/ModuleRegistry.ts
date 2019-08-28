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

  async add(mod : IModule, moduleId? : string) : Promise<string> {
    const mId = moduleId || ('' + Math.random().toString(26).slice(2))
    const {pkg} = mod
    if(await pkgsign.isSigned(pkg)) {
      console.log('is signed')
    } else {
      console.log('not signed')
      // FIXME check policy and throw if unsigned: don't serve unsigned packages
    }
    this.modules[mId] = mod
    return mId
  }

  has(moduleId : string){
    return this.modules[moduleId] !== undefined
  }

  get(moduleId : string) {
    return this.modules[moduleId]
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