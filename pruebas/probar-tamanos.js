// Revisa el diseño en muchos tamaños de pantalla con datos de ejemplo y las divisiones más largas.
// Comprueba que nada se salga de la pantalla y guarda capturas. También crea un informe PDF de ejemplo.
// Uso: npx electron pruebas/probar-tamanos.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const Division = require('../juego/codigo/division.js');
const A = require('../juego/codigo/aprendizaje.js');

const carpeta = path.join(__dirname, 'capturas', 'tamanos');
fs.rmSync(carpeta, { recursive: true, force: true });
fs.mkdirSync(carpeta, { recursive: true });
let contador = 0;
const espera = ms => new Promise(r => setTimeout(r, ms));

const TAMANOS = [
  ['celular-pequeno', 320, 568], ['celular', 360, 740], ['celular-grande', 412, 915], ['iphone', 390, 844],
  ['celular-horizontal', 740, 360], ['tablet', 768, 1024], ['tablet-horizontal', 1024, 768], ['pc', 1366, 768], ['pc-grande', 1920, 1080],
  ['pc-2k', 2560, 1440], ['pc-ultraancha', 2560, 1080], ['pc-ventana-angosta', 900, 1000], ['pc-ventana-baja', 1600, 700]
];

// ---------- alumna de ejemplo con historia ----------
function fechaHace(dias) { const f = new Date(); f.setDate(f.getDate() - dias); return A.hoy(f); }
function perfilEjemplo() {
  const p = A.nuevoPerfil('Sofía', 0);
  p.stats = { cabe: { i: 300, e: 20 }, mult: { i: 250, e: 14 }, restar: { i: 260, e: 31 }, bajar: { i: 200, e: 6 } };
  [[2, 40, 1], [3, 38, 2], [4, 30, 2], [5, 35, 0], [6, 33, 4], [7, 28, 10], [8, 30, 6], [9, 26, 4]].forEach(([d, i, e]) => p.tablas[d] = { i, e });
  [9, 6, 3, 2].forEach((v, k) => { const f = new Date(); f.setDate(f.getDate() - (3 - k) * 7); p.semanas[A.claveSemana(f)] = { cabe: 1, mult: 1, restar: v, bajar: 0 }; });
  p.historial = [35, 33, 29, 31, 39, 37, 30, 28, 25, 22].map((e, i) => ({ fecha: fechaHace(i), nivel: i < 4 ? 'medio' : 'facil', bien: Math.round(e / 3), estrellas: e }));
  p.niveles.facil = { rondas: 6, mejor: 39, estrellas: 180 }; p.niveles.medio = { rondas: 4, mejor: 35, estrellas: 128 };
  p.dias = Array.from({ length: 18 }, (_, i) => fechaHace(i));
  p.medallas = { primera: fechaHace(20), diez_seguidas: fechaHace(12), maestro_resta: fechaHace(5), racha7: fechaHace(2) };
  p.contadores.divisiones = 143; p.recomendado = 'medio'; p.nivel = 'medio';
  p.reloj = { escalon: 7, record: 1315, escalonMax: 9, rondas: [7, 7, 6, 6, 5, 5, 4].map((e, i) => ({ fecha: fechaHace(i), puntos: 1300 - i * 60, escalonInicial: e - 1, escalonFinal: e, sinErrores: 8, aTiempo: 10 })) };
  p.velocidad = { seg: 8.5, muestras: 40 };
  return p;
}

const vacio = () => ({ siguiente: 1, errores: 0, ayuda: false, fallos: { cabe: 0, mult: 1, restar: 2, bajar: 0 }, ensenar: false, pista: true, terminada: false, estrellas: 0, usado: 0 });
function rondaNormal(nivel, prob, siguiente, extra) {
  const res = Array.from({ length: 12 }, () => ({ errores: 0, ayuda: false, ensenada: false, fallos: { cabe: 0, mult: 0, restar: 1, bajar: 0 }, estrellas: 3 }));
  return Object.assign({ modo: 'normal', nivel, indice: 3, problemas: [{ dividendo: 84, divisor: 4, decimales: 0 }, { dividendo: 96, divisor: 8, decimales: 0 }, { dividendo: 72, divisor: 6, decimales: 0 }, prob],
    resultados: res.slice(0, 3), actual: Object.assign(vacio(), { siguiente }), parecida: null }, extra || {});
}
function rondaReloj(prob, actual, extra) {
  const res = Array.from({ length: 13 }, (_, i) => ({ errores: i % 4 ? 0 : 1, ensenada: false, fallos: { cabe: 0, mult: 0, restar: 1, bajar: 0 }, estrellas: 3, puntos: 80 + i * 5, sobra: i % 5 ? 20 : 0, escalonFin: 9 + Math.min(3, Math.floor(i / 4)) }));
  return Object.assign({ modo: 'reloj', nivel: 'reloj', escalonInicial: 11, indice: 5, problemas: Array.from({ length: 5 }, () => ({ dividendo: 7701, divisor: 23, decimales: 0, escalon: 11 })).concat([prob]),
    resultados: res.slice(0, 5), actual, parecida: null }, extra || {});
}

// Estado de la escalera del alumno (escalón y divisiones buenas o malas seguidas)
function conReloj(d, estado) {
  d.alumnos[0].reloj = Object.assign(d.alumnos[0].reloj || { record: 0, escalonMax: 0, rondas: [] }, { buenas: 0, malas: 0 }, estado);
}

const largo = { dividendo: 15438, divisor: 124, decimales: 1, motivo: 'Practicamos restas en las que hay que pedir prestado' };
const totalLargo = Division.crearDivision(15438, 124, 1).total;

// Cada escenario: datos guardados + clics para llegar a la pantalla
const ESCENARIOS = [
  { nombre: '01-alumno-nuevo', datos: () => ({ alumnos: [], ultimo: null, sonido: false }), pasos: [] },
  { nombre: '02-bienvenida', datos: d => d, pasos: [] },
  { nombre: '03-niveles-y-modos', datos: d => d, pasos: ['a-niveles'] },
  { nombre: '04-juego-medio', datos: d => { d.alumnos[0].ronda = rondaNormal('medio', { dividendo: 537, divisor: 6, decimales: 0, motivo: 'Practicamos la tabla del 6' }, 5); return d; }, pasos: ['continuar-ronda'] },
  { nombre: '05-juego-avanzado-largo', datos: d => { d.alumnos[0].ronda = rondaNormal('avanzado', largo, Math.floor(totalLargo * 0.6)); return d; }, pasos: ['continuar-ronda'] },
  { nombre: '06-ensenar-largo', datos: d => { const r = rondaNormal('avanzado', largo, 6); r.actual.errores = 4; r.actual.ensenar = true; d.alumnos[0].ronda = r; return d; }, pasos: ['continuar-ronda', 'ensenar', 'paso-sig', 'paso-sig', 'paso-sig', 'paso-sig', 'paso-sig'] },
  { nombre: '07-ensenar-final', datos: d => { const r = rondaNormal('avanzado', largo, 6); r.actual.errores = 4; r.actual.ensenar = true; d.alumnos[0].ronda = r; return d; }, pasos: ['continuar-ronda', 'ensenar', 'hasta-final'] },
  { nombre: '08-reloj-jugando', datos: d => { d.alumnos[0].ronda = rondaReloj(Object.assign({}, largo, { escalon: 12 }), Object.assign(vacio(), { siguiente: 9, tiempo: 250, seg: 143 })); return d; }, pasos: ['continuar-ronda'] },
  { nombre: '09-reloj-sin-tiempo', datos: d => { conReloj(d, { escalon: 10, malas: 1 }); d.alumnos[0].ronda = rondaReloj({ dividendo: 4715, divisor: 23, decimales: 0, escalon: 10 }, Object.assign(vacio(), { siguiente: 4, tiempo: 120, seg: 0, errores: 2 })); return d; }, pasos: ['continuar-ronda'] },
  { nombre: '10-reloj-terminada', datos: d => { d.alumnos[0].ronda = rondaReloj({ dividendo: 4715, divisor: 23, decimales: 0, escalon: 10 }, Object.assign(vacio(), { siguiente: 99, tiempo: 120, seg: 60, terminada: true, resultado: { base: 40, extra: 60, sobra: 60, cambio: 0, escalon: 10, mensaje: A.mensajeEscalon({ escalon: 10, buenas: 1 }, { antes: 10, despues: 10, errores: 0, sobra: 60, tiempo: 120, ensenada: false }) } })); return d; }, pasos: ['continuar-ronda'] },
  { nombre: '11-resumen', datos: d => { const r = rondaNormal('medio', { dividendo: 537, divisor: 6, decimales: 0 }, 99); r.indice = 12; r.problemas = Array.from({ length: 13 }, (_, i) => ({ dividendo: 500 + i * 7, divisor: 6, decimales: 0 })); r.resultados = Array.from({ length: 13 }, (_, i) => ({ errores: i % 3, ayuda: false, ensenada: i === 4, fallos: { cabe: 1, mult: 0, restar: i % 2, bajar: 0 }, estrellas: i === 4 ? 1 : 3 - (i % 3) })); r.actual.terminada = true; d.alumnos[0].ronda = r; return d; }, pasos: ['continuar-ronda', 'siguiente'] },
  { nombre: '12-resumen-reloj', datos: d => { const r = rondaReloj({ dividendo: 4715, divisor: 23, decimales: 0, escalon: 10 }, Object.assign(vacio(), { terminada: true, resultado: { base: 40, extra: 0, sobra: 0, cambio: 0, escalon: 11 } })); r.indice = 12; r.problemas = Array.from({ length: 13 }, () => ({ dividendo: 4715, divisor: 23, decimales: 0, escalon: 10 })); r.resultados = Array.from({ length: 13 }, (_, i) => ({ errores: i % 3, ensenada: false, fallos: { cabe: 1, mult: 0, restar: i % 2, bajar: 0 }, estrellas: 3, puntos: 90, sobra: i % 4 ? 10 : 0, escalonFin: 9 + (i % 3) })); d.alumnos[0].ronda = r; return d; }, pasos: ['continuar-ronda', 'siguiente'] },
  { nombre: '13-progreso', datos: d => d, pasos: ['a-progreso'] },
  { nombre: '15-pista-error-y-ayuda', datos: d => { d.alumnos[0].ronda = rondaNormal('dificil', { dividendo: 4715, divisor: 23, decimales: 0 }, 9); return d; }, pasos: ['continuar-ronda', 'tecla:1', 'ayuda'] },
  { nombre: '16-pista-cabe-ayuda', datos: d => { d.alumnos[0].ronda = rondaNormal('medio', { dividendo: 537, divisor: 6, decimales: 0 }, 1); return d; }, pasos: ['continuar-ronda', 'tecla:9', 'ayuda'] },
  // Ayuda todavía cerrada (espera) y alumno que ya casi no necesita pistas
  { nombre: '17-ayuda-esperando', datos: d => { d.alumnos[0].apoyo = { nivel: { cabe: 1, mult: 0, restar: 2, bajar: 0 }, racha: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, fallos: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, espera: 2, sinAyuda: 0, rondasSolo: 1 }; d.alumnos[0].ronda = rondaNormal('dificil', { dividendo: 4715, divisor: 23, decimales: 0 }, 1); return d; }, pasos: ['continuar-ronda'] },
  { nombre: '14-reloj-guia-subir', datos: d => { conReloj(d, { escalon: 1, buenas: 1 }); d.alumnos[0].ronda = rondaReloj({ dividendo: 84, divisor: 4, decimales: 0, escalon: 1 }, Object.assign(vacio(), { siguiente: 1, tiempo: 60, seg: 48 })); return d; }, pasos: ['continuar-ronda'] }
];

// Revisa que nada se salga: la página no debe tener desplazamiento lateral y
// ningún elemento visible debe pasarse del borde derecho (salvo dentro de zonas con scroll propio).
const REVISAR = `(() => {
  const w = document.documentElement.clientWidth;
  const problemas = [];
  if (document.documentElement.scrollWidth > w + 1) problemas.push('la página se desplaza de lado (' + document.documentElement.scrollWidth + ' > ' + w + ')');
  document.querySelectorAll('#app *').forEach(el => {
    if (el.closest('.tablero-caja') && !el.classList.contains('tablero-caja')) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (r.right > w + 1 || r.left < -1) problemas.push('se sale: ' + el.tagName.toLowerCase() + '.' + [...el.classList].join('.') + ' (' + Math.round(r.left) + '…' + Math.round(r.right) + ')');
  });
  const caja = document.querySelector('.tablero-caja');
  if (caja && caja.scrollWidth > caja.clientWidth + 1) problemas.push('el tablero no cabe (' + caja.scrollWidth + ' > ' + caja.clientWidth + ')');
  document.querySelectorAll('.boton, .tecla').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && r.height < 34) problemas.push('botón muy pequeño: ' + b.textContent.trim()); });
  return [...new Set(problemas)].slice(0, 8);
})()`;

async function escenario(tam, esc, base) {
  const [nombre, ancho, alto] = tam;
  const w = new BrowserWindow({ width: ancho, height: alto, show: false, useContentSize: true, webPreferences: { offscreen: true, partition: 'prueba' + (++contador) } });
  const errores = [];
  w.webContents.on('console-message', (e, nivel, msj) => { if (nivel >= 3) errores.push(msj); });
  const archivo = path.join(__dirname, '..', 'juego', 'index.html');
  try { await w.loadFile(archivo); } catch (e) { console.log('carga fallida', nombre, esc.nombre, e.message); }
  const datos = esc.datos(JSON.parse(JSON.stringify(base)));
  await w.webContents.executeJavaScript(`localStorage.setItem('juegoDivisiones.v1', ${JSON.stringify(JSON.stringify(datos))}); 0`);
  await new Promise(r => { w.webContents.once('did-finish-load', r); w.webContents.reload(); });
  await espera(400);
  for (const p of esc.pasos) {
    const codigo = p.startsWith('tecla:')
      ? `(() => { const b = document.querySelector('[data-accion="tecla"][data-n="${p.slice(6)}"]'); if (!b) return 'falta ${p}'; b.click(); return 0; })()`
      : p === 'hasta-final'
      ? `(() => { let n = 0; while (document.querySelector('[data-accion="paso-sig"]:not([disabled])') && n++ < 60) document.querySelector('[data-accion="paso-sig"]').click(); return 0; })()`
      : `(() => { const b = document.querySelector('[data-accion="${p}"]'); if (!b) return 'falta ${p}'; b.click(); return 0; })()`;
    const r = await w.webContents.executeJavaScript(codigo);
    if (r) errores.push(r);
    await espera(250);
  }
  await espera(1300);
  const problemas = await w.webContents.executeJavaScript(REVISAR);
  const altoPagina = await w.webContents.executeJavaScript('document.documentElement.scrollHeight');
  w.setContentSize(ancho, Math.min(Math.max(altoPagina, alto), 4000));
  await espera(300);
  fs.writeFileSync(path.join(carpeta, `${nombre}-${esc.nombre}.png`), (await w.webContents.capturePage()).toPNG());
  w.destroy();
  return problemas.concat(errores);
}

// Se abren y cierran muchas ventanas: la aplicación no debe cerrarse entre una y otra
app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
  const base = { alumnos: [perfilEjemplo()], ultimo: null, sonido: false };
  base.ultimo = base.alumnos[0].id;
  let total = 0;
  // SOLO=pc,celular… para revisar solo algunos tamaños
  const solo = process.env.SOLO ? process.env.SOLO.split(',') : null;
  for (const tam of TAMANOS.filter(t => !solo || solo.includes(t[0]))) {
    for (const esc of ESCENARIOS) {
      const problemas = await escenario(tam, esc, base);
      if (problemas.length) { total += problemas.length; console.log(`${tam[0]} (${tam[1]}×${tam[2]}) · ${esc.nombre}:\n   - ${problemas.join('\n   - ')}`); }
    }
  }
  // Informe PDF de ejemplo
  const w = new BrowserWindow({ width: 800, height: 600, show: false, webPreferences: { offscreen: true, partition: 'pdf' } });
  await w.loadFile(path.join(__dirname, '..', 'juego', 'index.html'));
  await espera(500);
  const b64 = await w.webContents.executeJavaScript(`Informe.crear(${JSON.stringify(base.alumnos[0])}).output('datauristring').split(',')[1]`);
  fs.writeFileSync(path.join(__dirname, 'capturas', 'informe-ejemplo.pdf'), Buffer.from(b64, 'base64'));
  const vacioPdf = await w.webContents.executeJavaScript(`Informe.crear(Aprendizaje.nuevoPerfil('Nuevo', 1)).output('datauristring').length`);
  console.log(`\nInforme PDF de ejemplo creado (${Math.round(b64.length * 0.75 / 1024)} KB). Informe de alumno sin datos: ${vacioPdf > 1000 ? 'OK' : 'FALLO'}`);
  console.log(total ? `\n${total} problema(s) de diseño encontrados` : `\nSin problemas de diseño en ${TAMANOS.length} tamaños × ${ESCENARIOS.length} pantallas`);
  app.quit();
});
