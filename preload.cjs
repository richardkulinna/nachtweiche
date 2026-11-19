const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nachtHost', {
  load: () => ipcRenderer.sendSync('nacht:load'),
  save: (snapshot) => ipcRenderer.sendSync('nacht:save', snapshot)
});
