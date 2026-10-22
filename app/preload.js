const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cblBridge', {
  electron: true,
  toInst: (m) => ipcRenderer.send('cbl:toInst', m),
  toStudent: (m) => ipcRenderer.send('cbl:toStudent', m),
  onMsg: (cb) => ipcRenderer.on('cbl:msg', (_e, m) => cb(m)),
  openInst: () => ipcRenderer.invoke('cbl:openInst'),
  remote: (on) => ipcRenderer.invoke('cbl:remote', on)
});
