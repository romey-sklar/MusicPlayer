const { app, BrowserWindow, dialog, Menu } = require('electron')
const path = require('path')
const url = require('url')
const join = require('path').join
const { autoUpdater } = require('electron-updater')
const fs = require('fs')
const openAboutWindow = require('about-window').default
const storage = require('electron-json-storage')

const dataPath = storage.getDataPath()

let win

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1000,
    height: 620,
    icon: __dirname + '/d20.png',
    webPreferences: {
      nodeIntegration: true
    }
  })


  /**
   * Because menu buttons on MacOS *require* at least one submenu,
   * store them in variables inorder to modify them if application is
   * running on Mac.
   */
  var openFolder = {
    label: 'Folders',
    accelerator: 'CommandOrControl+o',
    click: function () {
      openFolderDialog()
    }
  }

  var info = {
    label: 'Info',
    click: function () {
      openAboutWindow({
        product_name: 'Music d20 Player',
        homepage: 'http://wsavino.com/',
        copyright: 'Developed by Romey Sklar',
        icon_path: join(__dirname, 'build/icon.png')
      })
    }
  }

  if (process.platform === 'darwin') {
    openFolder = {
      label: 'Folders',
      submenu: [
        {
          label: 'Open folder',
          accelerator: 'CommandOrControl+o',
          click: function () {
            openFolderDialog()
          }
        }
      ]
    }

    info = {
      label: 'Info',
      submenu: [
        {
          label: 'Show info',

          click: function () {
            openAboutWindow({
              product_name: 'Music d20 Player',
              homepage: 'http://wsavino.com/',
              copyright: 'Developed by Romey Sklar',
              icon_path: join(__dirname, 'build/icon.png')
            })
          }
        }
      ]
    }

    createMenuMac(openFolder, info)
  } else {
    createMenuOther(openFolder, info)
  }

  // and load the index.html of the app.
  win.loadURL(
    url.format({
      pathname: path.join(__dirname, 'app/index.html'),
      protocol: 'file:',
      slashes: true
    })
  )

  // fs.readFile('path.txt', 'utf-8', function (err, buf) {
  //   if (err) {
  //     return
  //   }
  //   var temp = [buf.toString()];
  //   scanDir(temp);

  // });

  storage.has('path', function (error, hasKey) {
    if (error) throw error
    if (hasKey) {
      storage.get('path', function (error, data) {
        if (error) throw error

        scanDir([data.path.toString()])
      })
    }
  })

  // Open the DevTools.
  // win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    win = null
  })
}

app.on('ready', () => {
  createWindow()
  autoUpdater.checkForUpdatesAndNotify()
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})

function openFolderDialog() {
  dialog.showOpenDialog(
    win,
    {
      properties: ['openDirectory']
    },
    function (filePath) {
      if (filePath) {
        // fs.writeFile('path.txt', filePath, function (err, data) {
        //   if (err) console.log(err);
        // });
        // console.log(walkSync(filePath[0]));

        storage.set('path', { path: filePath }, function (error) {
          if (error) throw error
        })

        scanDir(filePath)
      }
    }
  )
}

var walkSync = function (dir, filelist) {
  files = fs.readdirSync(dir)
  filelist = filelist || []
  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist)
    } else {
      if (
        file.substr(-4) === '.mp3' ||
        file.substr(-4) === '.m4a' ||
        file.substr(-5) === '.webm' ||
        file.substr(-4) === '.wav' ||
        file.substr(-4) === '.aac' ||
        file.substr(-4) === '.ogg' ||
        file.substr(-5) === '.opus'
      ) {
        filelist.push(path.join(dir, file))
      }
    }
  })
  return filelist
}

function scanDir(filePath) {
  if (!filePath || filePath[0] == 'undefined') return

  var arr = walkSync(filePath[0])

  var objToSend = {}
  objToSend.files = arr
  objToSend.path = filePath

  win.webContents.send('selected-files', objToSend)
}

function createMenuOther(openFolder, info) {
  var menu = Menu.buildFromTemplate([openFolder, info])
  Menu.setApplicationMenu(menu)
}

function createMenuMac(openFolder, info) {
  var menu = Menu.buildFromTemplate([
    {
      label: require('electron').app.getName(),
      submenu: [
        {
          role: 'quit',
          accelerator: 'Cmd+Q'
        }
      ]
    },
    openFolder,
    info
  ])
  Menu.setApplicationMenu(menu)
}
