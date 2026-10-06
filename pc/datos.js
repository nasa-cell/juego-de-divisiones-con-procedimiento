// Copia de seguridad de los alumnos en un archivo de la PC:
// %APPDATA%\Juego de Divisiones\datos-juego.json (y la versión anterior en datos-juego.anterior.json).
const fs = require('fs');
const path = require('path');

function registrar(ipcMain, app) {
  const archivo = () => path.join(app.getPath('userData'), 'datos-juego.json');
  const anterior = () => path.join(app.getPath('userData'), 'datos-juego.anterior.json');

  // Solo la ventana del juego puede leer o guardar, y solo un archivo de alumnos válido y de tamaño razonable
  const propio = evento => evento.senderFrame && evento.senderFrame.url.startsWith('file:');
  const MAXIMO = 30 * 1024 * 1024;
  const valido = texto => {
    if (typeof texto !== 'string' || texto.length > MAXIMO) return false;
    const d = JSON.parse(texto);
    return !!d && Array.isArray(d.alumnos);
  };

  ipcMain.handle('leer-datos', evento => {
    if (!propio(evento)) return null;
    for (const f of [archivo(), anterior()]) {
      try {
        const texto = fs.readFileSync(f, 'utf8');
        if (valido(texto)) return texto;
      } catch (e) { /* no existe o está dañado: se prueba el siguiente */ }
    }
    return null;
  });

  ipcMain.on('guardar-datos', (evento, texto) => {
    try {
      if (!propio(evento) || !valido(texto)) return;
      fs.mkdirSync(app.getPath('userData'), { recursive: true });
      // Se escribe primero en un archivo temporal para no dejar el archivo a medias si se apaga la PC
      const temporal = archivo() + '.tmp';
      fs.writeFileSync(temporal, texto, 'utf8');
      if (fs.existsSync(archivo())) fs.copyFileSync(archivo(), anterior());
      fs.renameSync(temporal, archivo());
    } catch (e) { /* si falla, queda la copia de la página */ }
  });
}

module.exports = { registrar };
