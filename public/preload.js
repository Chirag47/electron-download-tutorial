const log = require("electron-log");
const {ipcRenderer, contextBridge} = require('electron');
log.info("Pre load Ran")
window.ipcRan = true;
window.ipcRenderer = ipcRenderer;

// contextBridge.exposeInMainWorld("electron",{
//     ipcRenderer: JSON.parse(JSON.stringify(ipcRenderer))
// })

contextBridge.exposeInMainWorld("api",{
    send: (channel, data) => ipcRenderer.send(channel, data),
    recieve: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(args))
})