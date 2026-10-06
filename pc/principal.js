// Ventana de la aplicación de Windows. El juego en sí está en la carpeta «juego».
const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const datos = require('./datos');
const path = require('path');

if (!app.requestSingleInstanceLock()) app.quit();

let ventana = null;

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#07627D',
    title: 'Juego de Divisiones',
    icon: path.join(__dirname, '..', 'juego', 'imagenes', 'icono.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, preload: path.join(__dirname, 'puente.js') }
  });
  Menu.setApplicationMenu(null);
  ventana.loadFile(path.join(__dirname, '..', 'juego', 'index.html'));
  // La ventana solo muestra el juego: no abre ventanas nuevas ni navega a otras páginas
  ventana.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  ventana.webContents.on('will-navigate', (evento, url) => { if (url !== ventana.webContents.getURL()) evento.preventDefault(); });
  ventana.webContents.session.setPermissionRequestHandler((contenido, permiso, responder) => responder(false));
}

// Solo se atienden pedidos que vienen de la ventana del juego
const deLaVentana = evento => ventana && evento.sender === ventana.webContents;

app.on('second-instance', () => {
  if (ventana) { if (ventana.isMinimized()) ventana.restore(); ventana.focus(); }
});
// Guarda el informe PDF donde elija el usuario y lo abre
ipcMain.handle('guardar-pdf', async (evento, nombre, datos) => {
  if (!deLaVentana(evento)) return null;
  // El contenido tiene que ser un PDF de verdad y de tamaño razonable
  if (!(datos instanceof ArrayBuffer || ArrayBuffer.isView(datos))) return null;
  const contenido = datos instanceof ArrayBuffer ? Buffer.from(datos) : Buffer.from(datos.buffer, datos.byteOffset, datos.byteLength);
  if (contenido.length > 50 * 1024 * 1024 || contenido.subarray(0, 5).toString('latin1') !== '%PDF-') return null;
  // Del nombre sugerido se quitan las carpetas y los caracteres que Windows no admite
  const sugerido = (path.basename(String(nombre || 'informe')).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').slice(0, 80).replace(/\.pdf$/i, '') || 'informe') + '.pdf';
  const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
    title: 'Guardar informe',
    defaultPath: path.join(app.getPath('documents'), sugerido),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return null;
  if (path.extname(filePath).toLowerCase() !== '.pdf') return null;
  fs.writeFileSync(filePath, contenido);
  shell.openPath(filePath);
  return filePath;
});

datos.registrar(ipcMain, app);
app.whenReady().then(crearVentana);
app.on('window-all-closed', () => app.quit());
