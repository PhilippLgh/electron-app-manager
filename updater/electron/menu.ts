import path from 'path'
import { IRelease, IInvalidRelease } from "../api/IRelease"
import { dialog, nativeImage, BrowserWindow, shell } from 'electron'
import AppManager from "../AppManager"

const showDialog = (title: string, message: string, buttonHandler = {}) => {
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
        // @ts-ignore
        buttonHandler[button]()
      } catch (error) {
        reject(error)
      }
      resolve()
    })
  });
}

const createCheckUpdateMenu = (appManager: AppManager, onReload: Function) => {
  return {
    label: 'Check Update',
    click: async () => {
      try {
        const update = await appManager.checkForUpdates()
        if (update) {
          await showDialog('Update Found', `Update Found:\n\n${update.name} - ${update.version}\n\n${update.location}\n\n`, {
            'update': async () => {
              // @ts-ignore
              const appUrl = await appManager.hotLoad(update)
              onReload(appUrl)
            },
            'cancel': () => {
              // do nothing
            }
          })
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

const createSwitchVersionMenu = async (appManager: AppManager, onReload: Function, options = {
  limit: 15
}) => {
  const { limit } = options
  let releases = await appManager.getReleases()
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
            let appUrl = await appManager.hotLoad(release)
            onReload(appUrl)
          },
          'cancel': () => { },
        })
      }
    }
  })

  return switchVersionMenu
}

const createMenuTemplate = async (appManager : AppManager, onReload: Function) => {
  const menuTemplate = {
    label: 'Updater',
    submenu: [
      createCheckUpdateMenu(appManager, onReload),
      { type: 'separator' },
      {
        label: 'Switch Version',
        submenu: await createSwitchVersionMenu(appManager, onReload)
      },
      {
        label: 'HotLoad Latest',
        click: async () => {
          const hotUrl = await appManager.hotLoadLatest()
          onReload(hotUrl)
        }
      },
      { type: 'separator' },
      {
        label: 'Open Cache',
        click: async () => { shell.showItemInFolder(appManager.cacheDir) }
      },
      { type: 'separator' },
      {
        label: 'Version x.y.z',
        enabled: false
      },
    ]
  }
  return menuTemplate
}

export default {
  createSwitchVersionMenu,
  createCheckUpdateMenu,
  createMenuTemplate
}
