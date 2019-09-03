import path from 'path'
import { IRelease, IInvalidRelease } from "../api/IRelease"
import { dialog, nativeImage, BrowserWindow, shell, MenuItem } from 'electron'
import AppManager from "../AppManager"
import { IRepository } from '../api/IRepository'
import semver from 'semver'

const VALID_CHANNELS = [
  'dev',
  'ci',
  'alpha',
  'beta',
  'nightly',
  'production',
  'master',
  'release',
]

const showDialog = (title: string, message: string, buttonHandler : { [index:string] : any } = {} ) => {
  // TODO make sure this does not introduce memory leaks.. use weak map?
  return new Promise((resolve, reject) => {
    const buttons = Object.keys(buttonHandler)
    dialog.showMessageBox({
      title,
      message,
      buttons,
      // icon: nativeImage.createFromBuffer(fs.readFileSync(path.join(__dirname, 'logo-placeholder.png')))
    })
    .then(({ response }) => {
      const button = buttons[response]
      console.log('response was', response, button)
      try {
        if(typeof buttonHandler[button] === 'function'){
          console.log('button handler found and called');
          (buttonHandler[button])()
        }
      } catch (error) {
        reject(error)
      }
      resolve()
    })
  })
}

// TODO remove redundant definition
const SOURCES = {
  CACHE: 'Cache',
  HOTLOADER: 'HotLoader'
}

const isRemoteSource = (source : string) => source && source !== SOURCES.CACHE && source !== SOURCES.HOTLOADER


export const createSwitchVersionMenu = (releases : any, onSwitchVersion : Function, options = {
  limit: 15 // limit per channel
}) => {
  const { limit } = options
  releases = releases.slice(0, Math.min(releases.length - 1, 100))

  // create it this way to get "stable" order
  let channelMenu : {[index: string] : Object[] } = {
    'release': [],
    'production': [],
    'master': [],
    'nightly': [],
    'alpha': [],
    'beta': [],
    'dev': [],
    'ci': [],
    'unknown': [],
  }
  
  // @ts-ignore
  releases.forEach((release : IRelease) => {

    let {version, channel} = release
    if(!channel) {
      channel = 'unknown'
    }

    const releaseItem = {
      label: release.tag,
      click: async () => {
        let title = 'Switch Version'
        let message = `Do you want to load version ${version}?`
        showDialog(title, message, {
          'ok': () => {
            console.log('switch now')
            onSwitchVersion(version)
          },
          'cancel': () => { 

          },
        })
      }
    }

    if (channelMenu[channel].length < limit) {
      channelMenu[channel].push(releaseItem)
    }

  })

  let channels = Object.keys(channelMenu)

  // remove channels without items
  channels.forEach(channel => {
    if(channelMenu[channel].length <= 0) {
      delete channelMenu[channel]
    }
  })

  // if all items are lacking channel info don't create submenu
  channels = Object.keys(channelMenu)
  if(channels.length === 1 && channels[0] === 'unknown') {
    return channelMenu['unknown']
  } 

  // convert channel struct to submenu
  return channels.map(label => ({
    label,
    submenu: [...channelMenu[label]]
  }))

}

export const createCheckUpdateMenu = (currentVersion: string, getLatest: Function) => {
  return {
    label: 'Check Update',
    click: async () => {
      try {
        const latest = await getLatest()
        if (latest && semver.lt(currentVersion, latest.version)) {
          await showDialog('Update Found', `Update Found:\n\n${latest.name} - ${latest.version}\n\n${latest.location}\n\n`, {
            'update': async () => {
              // FIXME const appUrl = await this.appManager.hotLoad(latest)
              // onReload(appUrl)
            },
            'cancel': () => {
              // do nothing
            }
          })
        } 
        else {
          showDialog('Update not found', 'Update not found')
        }
      } catch (error) {
        console.log('error during update check', error)
        showDialog('Update Error', 'Update Error')
        return
      }
    }
  }
}

export const createMenu = async (
  name: string, 
  version : string, 
  repo : IRepository,
  onSwitchVersion: Function
) => {

  const releases = await repo.getReleases()

  const sub = {
    label: name,
    submenu: [
      createCheckUpdateMenu(version, repo.getLatest.bind(repo)),
      { type: 'separator' },
      {
        label: 'Switch Version',
        submenu: createSwitchVersionMenu(releases, onSwitchVersion)
      },
      { type: 'separator' },
      {
        label: 'Open Cache',
        click: function(){
          console.log('open cache')
          // shell.showItemInFolder(this.appManager.cacheDir) 
        }
      },
      { type: 'separator' },
      {
        id: 'version',
        label: version,
        enabled: false
      },
    ]
  }

  const menuTemplate = {
    label: 'Updater',
    click: () => {},
    submenu: [sub]
  }
  return menuTemplate
}


class MenuBuilder {

  menuTemplate : any // cached electron menu template
  appManager: AppManager;

  constructor(appManager : AppManager) {
    this.appManager = appManager
  }
  
  
  
 

  async createMenuTemplate(onReload: Function) {
    if(this.menuTemplate){
      console.log('cached menu template found')
    }
    const menuTemplate = {
      label: 'Updater',
      click: () => {},
      submenu: [
        // await this.createCheckUpdateMenu(onReload),
        { type: 'separator' },
        {
          label: 'Switch Version',
          submenu: [] //await this.createSwitchVersionMenu(onReload)
        },
        {
          label: 'HotLoad Latest',
          click: async () => {
            // FIXME const hotUrl = await this.appManager.hotLoadLatest()
            // FIXME onReload(hotUrl)
          }
        },
        { type: 'separator' },
        {
          label: 'Open Cache',
          click: async () => { shell.showItemInFolder(this.appManager.cacheDir) }
        },
        { type: 'separator' },
        {
          id: 'version',
          label: 'Version not set',
          enabled: false
        },
      ]
    }
  
    // cache menu template
    this.menuTemplate = menuTemplate
  
    return menuTemplate
  }

  async updateMenuVersion(version : string) {
    let menuTemplate  = this.menuTemplate
    if(!menuTemplate) {
      throw new Error('menu needs to be created before it can be updated')
    }
  
    const vMenuItem = menuTemplate.submenu.find((mItem : any) => mItem.id === 'version')
    if (vMenuItem) {
      vMenuItem.label = `Version ${version}`
    }
  
    return menuTemplate
  }

}

export default MenuBuilder
