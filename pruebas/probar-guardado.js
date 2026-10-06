// Comprueba que todo lo que el juego aprende del alumno queda guardado en el equipo:
// al cerrar y volver a abrir, si se borra el almacenamiento de la página y si se daña.
// Usa el mismo puente y la misma copia de seguridad que la aplicación de Windows.
// Uso: npx electron pruebas/probar-guardado.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const datosPC = require('../pc/datos');

const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'juego-divisiones-'));
app.setPath('userData', carpeta);
datosPC.registrar(ipcMain, app);
app.on('window-all-closed', () => {});
const espera = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
const comprobar = (ok, texto) => { console.log(`  ${ok ? 'OK    ' : 'FALLO '} ${texto}`); if (!ok) fallos++; };

async function abrir() {
  const w = new BrowserWindow({ width: 1000, height: 800, show: false, webPreferences: { offscreen: true, partition: 'persist:guardado', preload: path.join(__dirname, '..', 'pc', 'puente.js'), contextIsolation: true } });
  await w.loadFile(path.join(__dirname, '..', 'juego', 'index.html'));
  await espera(800);
  return w;
}
const js = (w, c) => w.webContents.executeJavaScript(c);
const resumen = d => d && d.alumnos[0] ? { alumno: d.alumnos[0].nombre, divisiones: d.alumnos[0].contadores.divisiones, pasos: Object.values(d.alumnos[0].stats).reduce((t, s) => t + s.i, 0), velocidad: d.alumnos[0].velocidad.muestras, rondaAMedias: !!d.alumnos[0].ronda } : null;

app.whenReady().then(async () => {
  console.log(`Carpeta de datos de prueba: ${carpeta}\n`);
  // 1. Juega: crea alumna, empieza una ronda, resuelve 2 divisiones y sale
  let w = await abrir();
  await js(w, `document.getElementById('nombre').value = 'Valentina'; document.querySelector('form').requestSubmit(); 0`);
  await espera(300);
  await js(w, `document.querySelector('[data-accion="jugar"][data-nivel="medio"]').click(); 0`);
  for (let k = 0; k < 2; k++) {
    await espera(1200);
    await js(w, `(() => {
      const t = document.querySelector('.enunciado').textContent.split('÷').map(s => Number(s.trim()));
      const d = Division.crearDivision(t[0], t[1], 0);
      let n = 0;
      while (document.querySelector('.celda.activa')) {
        const c = d.celdas.find(x => x.orden === Number(document.querySelector('.celda.activa').dataset.orden));
        if (n++ === 1) document.querySelector('.tecla[data-n="' + ((c.valor + 1) % 10) + '"]').click();
        document.querySelector('.tecla[data-n="' + c.valor + '"]').click();
      }
      document.querySelector('[data-accion="siguiente"]').click(); return 0; })()`);
  }
  await espera(300);
  await js(w, `document.querySelector('[data-accion="salir"]').click(); 0`);
  await espera(900);
  const antes = await js(w, `JSON.parse(localStorage.getItem('juegoDivisiones.v1'))`);
  console.log('Después de jugar:', JSON.stringify(resumen(antes)));
  w.destroy();
  await espera(300);

  const archivo = path.join(carpeta, 'datos-juego.json');
  comprobar(fs.existsSync(archivo), 'se creó la copia de seguridad datos-juego.json en la carpeta del juego');
  const copia = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  comprobar(JSON.stringify(resumen(copia)) === JSON.stringify(resumen(antes)), 'la copia tiene lo mismo que el juego (alumna, divisiones, pasos, velocidad, ronda a medias)');

  // 2. Cerrar y volver a abrir
  w = await abrir();
  const saludo = await js(w, `(document.querySelector('.bienvenida') || {}).textContent || ''`);
  comprobar(/Valentina/.test(saludo) && /a medias/.test(saludo), 'al volver a abrir saluda a Valentina y ofrece seguir la ronda a medias');
  const reabierto = await js(w, `JSON.parse(localStorage.getItem('juegoDivisiones.v1'))`);
  comprobar(JSON.stringify(resumen(reabierto)) === JSON.stringify(resumen(antes)), 'no se perdió nada al cerrar y abrir');

  // 3. Se borra el almacenamiento de la página (como si Android lo limpiara)
  await js(w, `localStorage.clear(); 0`);
  w.destroy(); await espera(300);
  w = await abrir();
  const recuperado = await js(w, `JSON.parse(localStorage.getItem('juegoDivisiones.v1'))`);
  comprobar(JSON.stringify(resumen(recuperado)) === JSON.stringify(resumen(antes)), 'con el almacenamiento borrado, recupera todo desde la copia de seguridad');

  // 4. Se daña el almacenamiento de la página
  await js(w, `localStorage.setItem('juegoDivisiones.v1', '{esto no es json'); 0`);
  w.destroy(); await espera(300);
  w = await abrir();
  const tras = await js(w, `JSON.parse(localStorage.getItem('juegoDivisiones.v1'))`);
  comprobar(JSON.stringify(resumen(tras)) === JSON.stringify(resumen(antes)), 'con el almacenamiento dañado, también lo recupera');

  // 5. Se daña la copia de seguridad: usa la versión anterior
  fs.writeFileSync(archivo, '{dañado');
  await js(w, `localStorage.clear(); 0`);
  w.destroy(); await espera(300);
  w = await abrir();
  const desdeAnterior = await js(w, `JSON.parse(localStorage.getItem('juegoDivisiones.v1'))`);
  comprobar(!!(desdeAnterior && desdeAnterior.alumnos[0] && desdeAnterior.alumnos[0].nombre === 'Valentina'), 'si la copia se daña, usa la copia anterior (datos-juego.anterior.json)');
  w.destroy();

  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nTodo lo que el juego aprende queda guardado en el equipo');
  app.quit();
});
// La carpeta temporal se borra al final; si Windows aún la usa, se deja para el sistema
app.on('quit', () => { try { fs.rmSync(carpeta, { recursive: true, force: true }); } catch (e) { /* carpeta temporal en uso */ }
});
