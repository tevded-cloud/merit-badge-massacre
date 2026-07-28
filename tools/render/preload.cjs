// Merit Badge Massacre: the only bridge between the render page and the disk.
//
// The page has no node integration and no filesystem of its own. It can ask for
// the job, hand back finished bytes, and say how it is going. That is all: main
// decides where anything lands, and refuses any name that is not a plain file
// directly inside tools/render/out/.
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mbmRender', {
  // { sampleRate, force, only, helpers, compositions, cache }
  job: () => ipcRenderer.invoke('render:job'),

  // write('act1_base.wav', uint8) -> { path, bytes }
  write: (name, uint8) => ipcRenderer.invoke('render:write', name, uint8),

  log: (line) => ipcRenderer.send('render:log', String(line)),

  done: (summary) => ipcRenderer.invoke('render:done', summary),

  fail: (message) => ipcRenderer.invoke('render:fail', String(message)),
});
