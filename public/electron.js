const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const {download} = require('electron-dl');
const path = require('path');

const log = require("electron-log");
const { join } = require('path');
// const url = require('url');
// const fs = require('fs');
let mainWindow;
function createWindow () {
  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '../index.html'),
    protocol: 'file:',
    slashes: true,
  });
  log.info(path.join(__dirname,'preload.js'))
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,nodeIntegrationInWorker: true, webSecurity: false,
      devTools: true
    }
   });
  mainWindow.loadURL(startUrl);
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}
ipcMain.on("download", async(event, {payload}) => {
  let properties = payload.properties ? {...payload.properties} : {};

  const defaultPath = app.getPath("downloads");
  const defaultFileName = properties.filename ? properties.filename : payload.url.split('?')[0].split('/').pop();

  let customURL = dialog.showSaveDialogSync({
    defaultPath: `${defaultPath}/${defaultFileName}`
  });
  if(customURL){
    let filePath = customURL.split('/');
    let filename = `${filePath.pop()}`;
    let directory = filePath.join('/');
    properties = {...properties, directory, filename, fileName: filename};
    await download(BrowserWindow.getFocusedWindow(), payload.url, {
      ...properties,
      onProgress: (progress) => {
        mainWindow.webContents.send("download-progress", progress)
      },
      onCompleted: (item) => {
        mainWindow.webContents.send("download-complete", item)
      }
    });
    
  } else { /*save cancelled*/ }
  // mainWindow.webContents.downloadURL(payload.url)
})
app.on('ready', createWindow);
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});