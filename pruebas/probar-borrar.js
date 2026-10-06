// Comprueba el botón «Borrar alumno» de la portada y que los botones se vean con los 6 colores de perfil.
// Guarda una captura por color en pruebas/capturas/borrar.
// Uso: npx electron pruebas/probar-borrar.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const A = require('../juego/codigo/aprendizaje.js');

const carpeta = path.join(__dirname, 'capturas', 'borrar');
fs.rmSync(carpeta, { recursive: true, force: true });
fs.mkdirSync(carpeta, { recursive: true });
const espera = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
function comprobar(ok, texto) { console.log((ok ? '  OK   ' : '  FALLO ') + texto); if (!ok) fallos++; }

function alumno(nombre, avatar) {
  const p = A.nuevoPerfil(nombre, avatar);
  p.id = 'a' + avatar + Math.random().toString(36).slice(2);
  return p;
}

async function abrir(datos, ancho, alto) {
  const w = new BrowserWindow({ width: ancho, height: alto, show: false, useContentSize: true, webPreferences: { offscreen: true, partition: 'borrar' + Math.random() } });
  const errores = [];
  w.webContents.on('console-message', (e, nivel, msj) => { if (nivel >= 2) errores.push(msj); });
  await w.loadFile(path.join(__dirname, '..', 'juego', 'index.html'));
  await w.webContents.executeJavaScript(`localStorage.setItem('juegoDivisiones.v1', ${JSON.stringify(JSON.stringify(datos))}); 0`);
  await new Promise(r => { w.webContents.once('did-finish-load', r); w.webContents.reload(); });
  await espera(600);
  return { w, errores, js: c => w.webContents.executeJavaScript(c) };
}

// Diferencia de color entre el fondo del perfil y cada botón (0 = igual, 441 = blanco contra negro)
const DISTANCIAS = `(() => {
  const rgb = c => c.match(/\\d+/g).slice(0, 3).map(Number);
  const fondo = rgb(getComputedStyle(document.querySelector('.bienvenida')).backgroundColor);
  return [...document.querySelectorAll('.bienvenida .acciones-b .boton')].map(b => {
    const c = rgb(getComputedStyle(b).backgroundColor);
    return { texto: b.textContent.trim(), dist: Math.round(Math.hypot(c[0] - fondo[0], c[1] - fondo[1], c[2] - fondo[2])), borde: getComputedStyle(b).borderTopWidth };
  });
})()`;

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  const nombres = ['Sofía', 'Mateo', 'Lucía', 'Tomás', 'Valeria', 'Emilia'];
  console.log('Botones visibles con cada color de perfil:');
  for (let i = 0; i < 6; i++) {
    const p = alumno(nombres[i], i);
    if (i % 2) p.ronda = { nivel: 'facil', indice: 3, problemas: [], resultados: [], actual: null, parecida: null };
    const v = await abrir({ alumnos: [p], ultimo: p.id, sonido: false }, 1100, 800);
    const botones = await v.js(DISTANCIAS);
    const peor = botones.reduce((a, b) => (b.dist < a.dist ? b : a));
    comprobar(botones.length >= 4 && peor.dist > 60 && botones.every(b => parseFloat(b.borde) >= 2),
      `perfil ${i + 1} (${nombres[i]}): ${botones.length} botones con borde negro; el más parecido al fondo es «${peor.texto}» (diferencia ${peor.dist})`);
    fs.writeFileSync(path.join(carpeta, `perfil-${i + 1}.png`), (await v.w.webContents.capturePage()).toPNG());
    v.w.destroy();
  }

  console.log('Borrar un alumno desde la portada:');
  const a = alumno('Sofía', 0), b = alumno('Mateo', 1);
  const v = await abrir({ alumnos: [a, b], ultimo: a.id, sonido: false }, 1100, 800);
  comprobar(!(await v.js(`!!document.querySelector('.perfil-t .x, .perfil-t [aria-label*="Borrar"]')`)), 'las tarjetas no tienen X');
  await v.js(`document.querySelector('[data-accion="portada-borrar"]').click(); 0`);
  await espera(400);
  comprobar((await v.js(`(document.querySelector('.confirmar-portada') || {}).textContent || ''`)).includes('¿Borrar a Sofía?'), 'pregunta antes de borrar, con el nombre');
  fs.writeFileSync(path.join(carpeta, 'confirmar.png'), (await v.w.webContents.capturePage()).toPNG());
  await v.js(`document.querySelector('[data-accion="portada-borrar-no"]').click(); 0`);
  await espera(300);
  comprobar((await v.js(`JSON.parse(localStorage.getItem('juegoDivisiones.v1')).alumnos.length`)) === 2, 'con «No, dejarlo» no se borra nada');
  await v.js(`document.querySelector('[data-accion="portada-borrar"]').click(); 0`);
  await espera(300);
  await v.js(`document.querySelector('[data-accion="portada-borrar-si"]').click(); 0`);
  await espera(500);
  const quedan = await v.js(`JSON.parse(localStorage.getItem('juegoDivisiones.v1')).alumnos.map(x => x.nombre)`);
  comprobar(quedan.length === 1 && quedan[0] === 'Mateo', 'con «Sí, borrar» se borra solo ese alumno (quedan: ' + quedan.join(', ') + ')');
  comprobar(v.errores.length === 0, 'sin errores en la consola' + (v.errores.length ? ': ' + v.errores[0] : ''));
  v.w.destroy();

  // En celular
  const c = alumno('Valeria', 4);
  const cel = await abrir({ alumnos: [c], ultimo: c.id, sonido: false }, 360, 740);
  const desborde = await cel.js(`document.documentElement.scrollWidth > document.documentElement.clientWidth + 1`);
  comprobar(!desborde, 'en celular los botones caben sin salirse');
  await cel.js(`document.querySelector('[data-accion="portada-borrar"]').click(); 0`);
  await espera(400);
  const alto = await cel.js('document.documentElement.scrollHeight');
  cel.w.setContentSize(360, Math.min(alto, 3000));
  await espera(300);
  fs.writeFileSync(path.join(carpeta, 'celular-confirmar.png'), (await cel.w.webContents.capturePage()).toPNG());
  cel.w.destroy();

  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nBorrar alumno y colores de botones funcionan');
  app.exit(fallos ? 1 : 0);
});
