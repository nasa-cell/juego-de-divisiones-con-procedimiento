// Comprueba las protecciones de los datos que escribe el usuario:
// nombres con símbolos o demasiado largos, fotos falsas en el archivo guardado y el límite de alumnos.
// Uso: npx electron pruebas/probar-seguridad.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

const espera = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
function comprobar(ok, texto) { console.log((ok ? '  OK   ' : '  FALLO ') + texto); if (!ok) fallos++; }

async function abrir(datos) {
  const w = new BrowserWindow({ width: 1200, height: 800, show: false, webPreferences: { offscreen: true, partition: 'seguridad' + Math.random() } });
  const errores = [];
  w.webContents.on('console-message', (e, nivel, msj) => { if (nivel >= 2) errores.push(msj); });
  await w.loadFile(path.join(__dirname, '..', 'juego', 'index.html'));
  await w.webContents.executeJavaScript(`localStorage.setItem('juegoDivisiones.v1', ${JSON.stringify(JSON.stringify(datos))}); 0`);
  await new Promise(r => { w.webContents.once('did-finish-load', r); w.webContents.reload(); });
  await espera(500);
  return { w, errores, js: codigo => w.webContents.executeJavaScript(codigo) };
}

const A = require('../juego/codigo/aprendizaje.js');
function alumno(nombre, extra) {
  const p = A.nuevoPerfil('x', 0);
  p.id = 'a' + Math.random().toString(36).slice(2);
  p.nombre = nombre;
  return Object.assign(p, extra || {});
}

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  console.log('Datos guardados con trampas (archivo cambiado a mano):');
  let v = await abrir({ alumnos: [
    alumno('<img src=x onerror="document.title=\'hackeado\'">'),
    alumno('Nombre larguísimo de más de dieciséis letras'),
    alumno('Ana', { foto: 'x" onmouseover="document.title=\'hackeado\'', avatar: 99 })
  ], ultimo: null, sonido: false });
  const nombres = await v.js(`[...document.querySelectorAll('.perfil-t b')].map(b => b.textContent)`);
  comprobar(!(await v.js(`!!document.querySelector('#app img')`)), 'el nombre con código no crea elementos en la página');
  comprobar(nombres.every(n => !/[<>="]/.test(n)), 'los nombres guardados quedan sin símbolos peligrosos: ' + nombres.join(' | '));
  comprobar(nombres.every(n => Array.from(n).length <= 16), 'ningún nombre pasa de 16 caracteres');
  comprobar(!(await v.js(`[...document.querySelectorAll('.avatar')].some(a => a.getAttribute('style').includes('onmouseover'))`)), 'la foto falsa se descarta');
  comprobar((await v.js('document.title')) === 'Juego de Divisiones', 'no se ejecutó código metido en los datos');
  comprobar(v.errores.length === 0, 'sin errores en la consola' + (v.errores.length ? ': ' + v.errores[0] : ''));
  v.w.destroy();

  console.log('Escribir el nombre de un alumno nuevo:');
  v = await abrir({ alumnos: [], ultimo: null, sonido: false });
  const escribir = texto => v.js(`(() => { const i = document.getElementById('nombre'); i.value = ${JSON.stringify(texto)}; i.dispatchEvent(new Event('input', { bubbles: true })); return i.value; })()`);
  comprobar((await escribir('Sofía<script>')) === 'Sofíascript', 'se quitan < y > mientras se escribe');
  comprobar((await escribir('José 😀 María')) === 'José María', 'se quitan los emojis y los espacios dobles');
  comprobar(Array.from(await escribir('Maximiliano Alejandro')).length <= 16, 'no deja pasar de 16 caracteres');
  comprobar((await escribir('Ana3 7')) === 'Ana ', 'no deja escribir números en el nombre');
  await escribir('A');
  await v.js(`document.querySelector('form.formulario button[type=submit]').click(); 0`);
  await espera(300);
  comprobar((await v.js(`(document.querySelector('.aviso-texto') || {}).textContent || ''`)).includes('al menos 2 letras'), 'un nombre de 1 letra no se acepta');
  await escribir('1234');
  await v.js(`document.querySelector('form.formulario button[type=submit]').click(); 0`);
  await espera(300);
  comprobar((await v.js(`(document.querySelector('.aviso-texto') || {}).textContent || ''`)).length > 0 && (await v.js(`JSON.parse(localStorage.getItem('juegoDivisiones.v1')).alumnos.length`)) === 0, 'un nombre solo de números no se acepta');
  await escribir("María-José O'Neil");
  await v.js(`document.querySelector('form.formulario button[type=submit]').click(); 0`);
  await espera(400);
  const guardado = await v.js(`JSON.parse(localStorage.getItem('juegoDivisiones.v1')).alumnos.map(a => a.nombre)`);
  comprobar(guardado.length === 1 && Array.from(guardado[0]).length <= 16 && guardado[0].startsWith('María-José'), 'un nombre normal se guarda bien: ' + guardado.join(''));
  v.w.destroy();

  console.log('Límite de alumnos:');
  v = await abrir({ alumnos: Array.from({ length: 60 }, (_, i) => alumno('Alumno ' + i)), ultimo: null, sonido: false });
  await v.js(`document.querySelector('[data-accion="abrir-form"]').click(); 0`);
  await espera(200);
  await v.js(`(() => { const i = document.getElementById('nombre'); i.value = 'Otro'; document.querySelector('form.formulario button[type=submit]').click(); })(); 0`);
  await espera(300);
  comprobar((await v.js(`JSON.parse(localStorage.getItem('juegoDivisiones.v1')).alumnos.length`)) === 60, 'no se pasa de 60 alumnos y avisa');
  v.w.destroy();

  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nTodas las comprobaciones de seguridad pasaron');
  app.exit(fallos ? 1 : 0);
});
