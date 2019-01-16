const { dialog, Menu, MenuItem, shell } = require('electron')
/*
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
*/

function createCheckUpdateMenuItem(updater){
  return new MenuItem({
    label: 'Check Update',
    click: async () => {
      let update = null
      try {
        update = await updater.checkForUpdates();
      } catch (error) {
        console.log('error during update check', error)        
        return
      }
    }
  })
}

function createOpenCacheMenuItem(updater){
  return new MenuItem({
    label: 'Open Cache',
    click: async () => {
      shell.showItemInFolder(updater.downloadDir);
    }
  })
}

/*
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
        /
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
*/

function createMenu(updater){
  let mainMenu = new Menu();
  /*
  mainMenu.append(new MenuItem({
    label: 'Switch Version',
    submenu: createVersionChooserSubMenu()
  }))
  */
  mainMenu.append(createCheckUpdateMenuItem(updater))
  mainMenu.append(createOpenCacheMenuItem(updater))

  mainMenu.append(new MenuItem({label: 'Hot Load', click: () => { console.log('hot load mist app') } }))

  let versionMenuItem = new MenuItem({
    label: 'Version: v1.0.1',
    enabled: false
  })

  mainMenu.append(versionMenuItem)

  return mainMenu
}

module.exports = createMenu
