// Merit Badge Massacre: desktop shell for the Steam build.
'use strict';

const { app, BrowserWindow, Menu, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// Everything the game is allowed to serve lives under the app root, the parent of electron/.
const APP_ROOT = path.resolve(__dirname, '..');

// Chromium blocks fetch() on file://, so the asset loader would silently fail in the
// packaged game. The app is served over a privileged custom scheme instead.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'game',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function notFound() {
  return new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

function registerGameProtocol() {
  protocol.handle('game', (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'app') return notFound();
      let rel = decodeURIComponent(url.pathname).replace(/\\/g, '/');
      while (rel.charAt(0) === '/') rel = rel.slice(1);
      if (rel === '' || rel.charAt(rel.length - 1) === '/') rel += 'index.html';
      if (rel.indexOf('\0') >= 0) return new Response('Forbidden', { status: 403 });
      const abs = path.resolve(APP_ROOT, rel);
      if (abs !== APP_ROOT && !abs.startsWith(APP_ROOT + path.sep)) {
        return new Response('Forbidden', { status: 403 });
      }
      // net.fetch understands asar archives, so this works packaged and unpacked.
      // A file that is not there rejects rather than resolving, and an unhandled
      // rejection here reaches the page as net::ERR_UNEXPECTED and a red console
      // error. The optional asset pack is missing by design, so a miss answers
      // with an honest 404 the loader can read instead.
      return net.fetch(pathToFileURL(abs).toString()).catch(() => notFound());
    } catch (e) {
      return new Response('Bad request', { status: 400 });
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#07090c',
    autoHideMenuBar: true,
    fullscreenable: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadURL('game://app/index.html');
}

app.whenReady().then(() => {
  registerGameProtocol();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
