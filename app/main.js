const { app, BrowserWindow, shell, Menu, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (process.env.CBL_DEBUG_PORT) app.commandLine.appendSwitch('remote-debugging-port', process.env.CBL_DEBUG_PORT);

let mainWin = null, instWin = null, manualZoom = false;
const WEBPREFS = { contextIsolation: true, sandbox: true, spellcheck: false, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') };

function commonHandlers(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    else if (/#instructor$/.test(url)) openInst();
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (/^https?:/i.test(url)) { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.control && !input.alt && (input.key === '=' || input.key === '+')) { if (win === mainWin) manualZoom = true; win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5); e.preventDefault(); }
    if (input.control && !input.alt && input.key === '-') { if (win === mainWin) manualZoom = true; win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5); e.preventDefault(); }
    if (input.control && !input.alt && input.key === '0') { if (win === mainWin) { manualZoom = false; win.emit('resize'); } else win.webContents.setZoomLevel(0); e.preventDefault(); }
  });
}

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 640,
    title: '코드블루 리더', backgroundColor: '#0b0e11', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'), webPreferences: WEBPREFS
  });
  Menu.setApplicationMenu(null);
  mainWin.loadFile(path.join(__dirname, 'index.html'));
  commonHandlers(mainWin);
  mainWin.on('closed', () => { mainWin = null; if (instWin) instWin.close(); stopRemote(); });
  // 작은 화면(예: 1280×720 프로젝터)에서 한 화면에 들어오도록 자동 축소. Ctrl +/- 로 직접 바꾸면 자동 맞춤 해제
  const fit = () => { if (!mainWin || mainWin.isDestroyed() || manualZoom) return; const [w, h] = mainWin.getContentSize(); const f = (w >= 1180) ? Math.max(0.7, Math.min(1, h / 910, w / 1440)) : 1; mainWin.webContents.setZoomFactor(Math.round(f * 100) / 100); };
  mainWin.on('resize', fit); mainWin.webContents.on('did-finish-load', fit); mainWin.on('enter-full-screen', fit); mainWin.on('leave-full-screen', fit);
}

/* ---------- 강사 창: 보조 모니터가 있으면 그쪽에 ---------- */
function openInst() {
  if (instWin) { instWin.show(); instWin.focus(); return; }
  const displays = screen.getAllDisplays();
  const mainDisp = mainWin ? screen.getDisplayMatching(mainWin.getBounds()) : screen.getPrimaryDisplay();
  const other = displays.find(d => d.id !== mainDisp.id) || mainDisp;
  const wa = other.workArea;
  const w = Math.min(1180, wa.width - 40), h = Math.min(860, wa.height - 40);
  instWin = new BrowserWindow({
    x: wa.x + Math.round((wa.width - w) / 2), y: wa.y + Math.round((wa.height - h) / 2), width: w, height: h, minWidth: 380, minHeight: 520,
    title: '강사 콘솔 · 코드블루 리더', backgroundColor: '#0d1014', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'), webPreferences: Object.assign({}, WEBPREFS, { partition: 'cbl-inst' }) // 별도 세션: 학생 창 자동 축소가 강사 창에 번지지 않게
  });
  instWin.loadFile(path.join(__dirname, 'inst.html'));
  commonHandlers(instWin);
  instWin.on('closed', () => { instWin = null; unregisterKeys(); });
  registerKeys();
}

/* ---------- 학생 창이 선택돼 있어도 쓰는 전역 단축키 (강사 창이 열려 있을 때만) ---------- */
const HOTKEYS = [['R', 'rosc'], ['V', 'arr', { v: 'VF' }], ['P', 'arr', { v: 'PEA' }], ['A', 'arr', { v: 'ASY' }], ['F', 'fail'], ['C', 'cb'], ['H', 'fix'], ['Space', 'pause'], ['G', 'mark', { kind: 'good' }], ['B', 'mark', { kind: 'bad' }]];
function registerKeys() {
  HOTKEYS.forEach(([k, act, a]) => {
    try { globalShortcut.register('Control+Alt+' + k, () => sendToStudent({ t: 'cmd', act, a: a || {} })); } catch (e) {}
  });
}
function unregisterKeys() { try { globalShortcut.unregisterAll(); } catch (e) {} }

/* ---------- 메시지 중계 ---------- */
function sendToStudent(m) { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('cbl:msg', m); }
function sendToInst(m) {
  if (instWin && !instWin.isDestroyed()) instWin.webContents.send('cbl:msg', m);
  if (sseClients.size) { const line = 'data: ' + JSON.stringify(m) + '\n\n'; sseClients.forEach(res => { try { res.write(line); } catch (e) {} }); }
}
ipcMain.on('cbl:toInst', (_e, m) => sendToInst(m));
ipcMain.on('cbl:toStudent', (_e, m) => sendToStudent(m));
ipcMain.handle('cbl:openInst', () => { openInst(); return true; });

/* ---------- 휴대폰·태블릿 원격 조종 (같은 Wi-Fi, PIN 보호) ---------- */
let server = null, pin = null, port = 0;
const sseClients = new Set();
function lanUrls() {
  const out = [];
  Object.values(os.networkInterfaces()).forEach(list => (list || []).forEach(n => {
    if (n.family === 'IPv4' && !n.internal && !/^169\.254\./.test(n.address)) out.push('http://' + n.address + ':' + port + '/remote?pin=' + pin);
  }));
  return out;
}
async function remoteInfo() {
  if (!server) return { on: false };
  const urls = lanUrls();
  let qr = null;
  try { const QR = require('qrcode'); if (urls[0]) qr = await QR.toDataURL(urls[0], { margin: 1, width: 240 }); } catch (e) {}
  return { on: true, pin, urls: urls.length ? urls : ['네트워크(Wi-Fi)에 연결되어 있지 않습니다'], qr };
}
function startRemote() {
  return new Promise((resolve) => {
    if (server) return resolve();
    pin = String(Math.floor(1000 + Math.random() * 9000));
    const page = fs.readFileSync(path.join(__dirname, 'inst.html'));
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      const ok = u.searchParams.get('pin') === pin;
      if (u.pathname === '/remote') {
        if (!ok) { res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<meta name="viewport" content="width=device-width"><p style="font:18px sans-serif;padding:20px">PIN이 맞지 않습니다. 강사 창에 표시된 QR 코드나 주소를 다시 확인하세요.</p>'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(page);
      }
      if (u.pathname === '/events') {
        if (!ok) { res.writeHead(403); return res.end(); }
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.write('retry: 1500\n\n'); sseClients.add(res);
        req.on('close', () => sseClients.delete(res)); return;
      }
      if (u.pathname === '/cmd' && req.method === 'POST') {
        if (!ok) { res.writeHead(403); return res.end(); }
        let body = ''; req.on('data', c => { body += c; if (body.length > 4000) req.destroy(); });
        req.on('end', () => { try { const m = JSON.parse(body); if (m && (m.t === 'cmd' || m.t === 'hello')) sendToStudent(m); } catch (e) {} res.writeHead(204); res.end(); });
        return;
      }
      res.writeHead(404); res.end();
    });
    const tryListen = (p) => {
      srv.once('error', () => { if (p < 8795) tryListen(p + 1); else resolve('err'); });
      srv.listen(p, '0.0.0.0', () => { port = p; server = srv; resolve(); });
    };
    tryListen(8787);
  });
}
function stopRemote() { if (server) { sseClients.forEach(r => { try { r.end(); } catch (e) {} }); sseClients.clear(); server.close(); server = null; } }
ipcMain.handle('cbl:remote', async (_e, on) => {
  if (on === true) { const r = await startRemote(); if (r === 'err') return { on: false, err: '포트를 열 수 없습니다(8787~8795 사용 중).' }; }
  else if (on === false) stopRemote();
  return remoteInfo();
});

app.whenReady().then(createWindow);
app.on('will-quit', () => { unregisterKeys(); stopRemote(); });
app.on('window-all-closed', () => app.quit());
