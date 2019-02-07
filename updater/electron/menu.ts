import path from 'path'
import { IRelease, IInvalidRelease } from "../api/IRelease"
import { dialog, nativeImage, BrowserWindow, shell } from 'electron'
import AppManager from "../AppManager"

const showDialog = (title: string, message: string, buttonHandler : { [index:string] : any } = {} ) => {
  // TODO make sure this does not introduce memory leaks.. use weak map?
  return new Promise((resolve, reject) => {
    const buttons = Object.keys(buttonHandler)
    dialog.showMessageBox({
      title,
      message,
      buttons,
      // icon: nativeImage.createFromBuffer(fs.readFileSync(path.join(__dirname, 'logo-placeholder.png')))
    }, async response => {
      const button = buttons[response]
      try {
        if(typeof buttonHandler[button] === 'function'){
          (buttonHandler[button])()
        }
      } catch (error) {
        reject(error)
      }
      resolve()
    })
  });
}

// TODO remove redundant definition
const SOURCES = {
  CACHE: 'Cache',
  HOTLOADER: 'HotLoader'
}

const isRemoteSource = (source : string) => source && source !== SOURCES.CACHE && source !== SOURCES.HOTLOADER

class MenuBuilder {

  menuTemplate : any // cached electron menu template
  appManager: AppManager;

  constructor(appManager : AppManager) {
    this.appManager = appManager
  }
  
  async createCheckUpdateMenu(onReload: Function){
    return {
      label: 'Check Update',
      click: async () => {
        try {
          const updateInfo = await this.appManager.checkForUpdates()
          const { latest } = updateInfo
          if (updateInfo.updateAvailable) {
            if (latest === null) {
              throw new Error('latest release in update info must not be null')
            }
            await showDialog('Update Found', `Update Found:\n\n${latest.name} - ${latest.version}\n\n${latest.location}\n\n`, {
              'update': async () => {
                const appUrl = await this.appManager.hotLoad(latest)
                onReload(appUrl)
              },
              'cancel': () => {
                // do nothing
              }
            })
          } 
          else if(latest && !isRemoteSource(updateInfo.source)){
            showDialog('Latest version', 'Latest version is being used')
          } else {
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
  
  async createSwitchVersionMenu(onReload: Function, options = {
    limit: 15
  }) {
    const { limit } = options
    let releases = await this.appManager.getReleases()
    releases = releases.slice(0, Math.min(releases.length - 1, limit))
  
    // @ts-ignore
    const switchVersionMenu = releases.map((release: IRelease) => {
      return {
        label: release.tag,
        click: async () => {
          let version = release.version
          let title = 'Switch Version'
          let message = `Do you want to load version ${version}?`
          showDialog(title, message, {
            'ok': async () => {
              let appUrl = await this.appManager.hotLoad(release)
              onReload(appUrl)
            },
            'cancel': () => { },
          })
        }
      }
    })
    return switchVersionMenu
  }

  async createMenuTemplate(onReload: Function) {
    if(this.menuTemplate){
      console.log('cached menu template found')
    }
    const menuTemplate = {
      label: 'Updater',
      submenu: [
        await this.createCheckUpdateMenu(onReload),
        { type: 'separator' },
        {
          label: 'Switch Version',
          submenu: await this.createSwitchVersionMenu(onReload)
        },
        {
          label: 'HotLoad Latest',
          click: async () => {
            const hotUrl = await this.appManager.hotLoadLatest()
            onReload(hotUrl)
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
