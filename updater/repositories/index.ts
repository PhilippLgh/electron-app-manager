import GithubRepo from './Github'
import AzureRepo from './Azure'
import { IRelease } from '../api/IRelease'

export const getRepository = (urlString : string, modifiers? : any, filter? : any) => {
  if(urlString.startsWith('https://github.com/')) {
    return new GithubRepo(urlString)
  }
  else if(urlString.includes('blob.core.windows.net')){

    // FIXME check that only host name provided or parse
    urlString += '/builds?restype=container&comp=list'

    if(modifiers){
      let mod = (release : IRelease) => {
        let result : {[key:string] : any} = { }
        for(var m in modifiers){
          result[m] = modifiers[m](release)
        }
        return result
      }
      return new AzureRepo(urlString, {
        onReleaseParsed: mod,
        filter
      })      
    } else {
      return new AzureRepo(urlString)
    }
  }
  else {
    throw new Error('No repository strategy found for url: ' + urlString)
  }
}