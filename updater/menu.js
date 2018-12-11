import { dialog, Menu, MenuItem, shell } from 'electron';
import updater from './updater'

function createUiChooserSubMenu(){
  const UiChooserSubMenu = new Menu();  
  UiChooserSubMenu.append(
    new MenuItem({
      label: 'Prod UI',
      click: async () => {
        try {
          let cached = await updater.getLatestCached();
          if (cached === null) {
            throw new Error('No package in cache found: press "check update"');
          }
          let asarPath = cached.location;
          //FIXME start(asarPath, cached.version);
        } catch (error) {
          dialog.showMessageBox({
            title: 'Error',
            message: 'Loading UI from cache failed: ' + error.message
          });
        }
      }
    })
  );
  UiChooserSubMenu.append(
    new MenuItem({
      label: 'Dev UI',
      click: async () => {
        let win = windowManager.createWindow(`http://localhost:3080/`)
      }
    })
  );
  UiChooserSubMenu.append(
    new MenuItem({
      label: 'Dev UI (in-place)',
      click: async () => {
        // get a ref to the main window
        let mainWindow = Windows._windows['main']
        // reload with react ui
        mainWindow.load(`http://localhost:3080/`)
      }
    })
  );
  return UiChooserSubMenu
}

function createCheckUpdateMenuItem(){
  return new MenuItem({
    label: 'Check Update',
    click: async () => {
      let update = null
      try {
        update = await updater.checkUpdate();
      } catch (error) {
        console.log('error during update check', error)        
        return
      }
      if (!update) {
        dialog.showMessageBox({
          title: 'No update',
          message: 'You are using the latest version'
        });
        return;
      }
      dialog.showMessageBox(
        {
          title: 'Checking for updates',
          message: `
              React UI update found: v${update.version} 
              Press "OK" to download in background
              `
        },
        async () => {
          let download = await updater.download(update);
          if (!download.error) {
            dialog.showMessageBox({
              title: 'Update downloaded',
              message: `Press OK to reload for update to version ${download.version}`
            });
            let asarPath = download.location;
            updater.emit('user-update-request', asarPath)
          } else {
            dialog.showMessageBox({
              title: 'Download failed',
              message: `Error ${download.error}`
            });
          }
        }
      );
    }
  })
}

function createOpenCacheMenuItem(){
  return new MenuItem({
    label: 'Open Cache',
    click: async () => {
      shell.showItemInFolder(updater.releaseDataPath);
    }
  })
}

function createVersionChooserSubMenu(){

  let VersionChooserSubMenu = new Menu();


  function addReleaseToChannel(channelSubmenu, release){
    let releaseItem =  new MenuItem({
      label: release.tag,
      click: async () => {
        /*
        dialog.showMessageBox({
          title: 'Change Version',
          message: 'Switch to version ' + release.tag
        });
        */
        let download = await updater.download(release);
        if (!download.error) {
          dialog.showMessageBox({
            title: 'Change Version',
            message: 'Switch to version ' + release.tag
          });
          let asarPath = download.location;
          // start(asarPath, download.version);
        }
      }
    })
    channelSubmenu.append(releaseItem)
  }
  
  function addChannelToSubmenu(name){
    let channelSubmenu = new Menu();
    VersionChooserSubMenu.append(
      new MenuItem({
        label: name,
        submenu: channelSubmenu
      })
    ) 
    return channelSubmenu
  }

  // build the version menu
  updater.getReleases()
  .then(releases =>{
    let channels = {}
    releases.forEach(release => {
      if(channels[release.channel] === undefined) {
        channels[release.channel] = addChannelToSubmenu(release.channel)
      }
      let channelMenu = channels[release.channel]
      addReleaseToChannel(channelMenu, release)
    })
    return channels
  })
  .catch(e => {
    console.log('error: could not build channel menu', e)
  }) 

  return VersionChooserSubMenu
}

export default function createMenu(){
  let mainMenu = new Menu();
  /*
  mainMenu.append(new MenuItem({
    label: 'Switch Version',
    submenu: createVersionChooserSubMenu()
  }))
  */
  mainMenu.append(createCheckUpdateMenuItem())
  mainMenu.append(createOpenCacheMenuItem())
  return mainMenu
}