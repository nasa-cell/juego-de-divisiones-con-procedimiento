// Comprueba la ayuda que se retira: niveles de pista por alumno y paso, espera del botón Ayuda
// que crece si se pide seguido, bombillas según la dificultad, estrellas extra y medallas por hacerlo solo.
// Uso: npx electron pruebas/probar-ayuda.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const A = require('../juego/codigo/aprendizaje.js');
const D = require('../juego/codigo/division.js');

const espera = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
function comprobar(ok, texto) { console.log((ok ? '  OK   ' : '  FALLO ') + texto); if (!ok) fallos++; }

async function abrir(datos) {
  const w = new BrowserWindow({ width: 1100, height: 800, show: false, webPreferences: { offscreen: true, partition: 'ayuda' + Math.random() } });
  const errores = [];
  w.webContents.on('console-message', (e, nivel, msj) => { if (nivel >= 3) errores.push(msj); });
  await w.loadFile(path.join(__dirname, '..', 'juego', 'index.html'));
  await w.webContents.executeJavaScript(`localStorage.setItem('juegoDivisiones.v1', ${JSON.stringify(JSON.stringify(datos))}); 0`);
  await new Promise(r => { w.webContents.once('did-finish-load', r); w.webContents.reload(); });
  await espera(600);
  return { w, errores, js: c => w.webContents.executeJavaScript(c) };
}
const clic = (v, accion, extra) => v.js(`(() => { const b = document.querySelector('[data-accion="${accion}"]${extra || ''}'); if (!b) return 'falta'; b.click(); return 0; })()`);
const textoAyuda = v => v.js(`(() => { const b = document.querySelector('.teclado .tecla:last-child'); return b ? (b.disabled ? 'cerrado: ' : 'abierto: ') + b.textContent.trim() : ''; })()`);
const guardado = v => v.js(`JSON.parse(localStorage.getItem('juegoDivisiones.v1')).alumnos[0]`);

function alumno(nivel, problemas, extra) {
  const p = A.nuevoPerfil('Sofía', 0);
  p.id = 'sofia';
  p.ronda = Object.assign({ nivel, indice: 0, problemas, resultados: [], actual: null, parecida: null }, extra || {});
  return p;
}

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  console.log('Niveles de ayuda (aprendizaje):');
  const p = A.nuevoPerfil('Ana', 0);
  comprobar(A.asegurarApoyo(p).nivel.cabe === 3, 'un alumno nuevo empieza con la ayuda completa');
  [1, 2, 3].forEach(() => A.registrarApoyo(p, 'cabe', false));
  comprobar(p.apoyo.nivel.cabe === 2, 'con 3 aciertos seguidos sin ayuda baja a «solo la pregunta»');
  A.registrarApoyo(p, 'cabe', false); A.registrarApoyo(p, 'cabe', true); A.registrarApoyo(p, 'cabe', false);
  comprobar(p.apoyo.nivel.cabe === 2, 'si en medio pide ayuda, la cuenta vuelve a empezar');
  A.registrarErrorApoyo(p, 'cabe'); A.registrarErrorApoyo(p, 'cabe');
  comprobar(p.apoyo.nivel.cabe === 3, 'con 2 errores en ese paso la ayuda sube otra vez');
  comprobar(p.apoyo.nivel.restar === 3, 'cada paso lleva su propio nivel');
  const viejo = A.nuevoPerfil('Luis', 1);
  viejo.stats = { cabe: { i: 200, e: 4 }, mult: { i: 200, e: 16 }, restar: { i: 200, e: 60 }, bajar: { i: 5, e: 0 } };
  const n = A.asegurarApoyo(viejo).nivel;
  comprobar(n.cabe === 1 && n.mult === 2 && n.restar === 3 && n.bajar === 3, 'un alumno que ya jugaba empieza según sus errores de siempre');

  console.log('Espera del botón Ayuda:');
  const q = A.nuevoPerfil('Eva', 2);
  const esperas = [A.esperaAyuda(q)];
  for (let i = 0; i < 4; i++) { A.registrarPedidoAyuda(q); esperas.push(A.esperaAyuda(q)); }
  comprobar(esperas.join(',') === '8,15,25,40,40', 'si pide ayuda seguido la espera crece: ' + esperas.join(' → ') + ' s');
  ['mult', 'restar', 'bajar'].forEach(t => A.registrarApoyo(q, t, false));
  comprobar(A.esperaAyuda(q) === 25, 'con 3 casillas bien sin ayuda la espera vuelve a bajar');

  console.log('En el juego:');
  const prob = { dividendo: 84, divisor: 4, decimales: 0 };
  let v = await abrir({ alumnos: [alumno('facil', [prob, prob, prob])], ultimo: 'sofia', sonido: false });
  await clic(v, 'continuar-ronda');
  await espera(400);
  let t = await textoAyuda(v);
  comprobar(/^cerrado: Ayuda en [78] s/.test(t), 'al empezar, el botón espera: «' + t + '»');
  comprobar((await v.js(`(document.querySelector('.bombillas span') || {}).textContent`)) === '2 de 2', 'en Fácil hay 2 focos');
  comprobar(!!(await v.js(`!!document.querySelector('.pista')`)), 'un alumno nuevo ve la pista completa');
  await clic(v, 'tecla', '[data-n="9"]');
  await espera(300);
  t = await textoAyuda(v);
  comprobar(t === 'abierto: Ayuda', 'después de un error la ayuda se abre');
  await clic(v, 'ayuda');
  await espera(300);
  comprobar(!!(await v.js(`!!document.querySelector('.ayuda-caja')`)), 'al pulsar Ayuda aparece la explicación');
  const div = D.crearDivision(84, 4, 0);
  await clic(v, 'tecla', `[data-n="${div.celdas.find(c => c.orden === 1).valor}"]`);
  await espera(300);
  t = await textoAyuda(v);
  comprobar(/^cerrado: Ayuda en/.test(t) && (await v.js(`(document.querySelector('.bombillas span') || {}).textContent`)) === '1 de 2', 'tras usar un foco queda 1 de 2 y hay que esperar otra vez: «' + t + '»');
  comprobar(/Nuevo foco: 0 de 3 sin ayuda/.test(await v.js(`(document.querySelector('.recarga') || {}).textContent || ''`)), 'aparece la barra de recarga del foco');
  let a = await guardado(v);
  comprobar(a.apoyo.espera === 1, 'la próxima ayuda tendrá que esperar más (15 s)');
  v.w.destroy();

  console.log('La espera no vuelve a empezar en cada casilla:');
  v = await abrir({ alumnos: [alumno('medio', [prob, prob], { pensadoAyuda: 20 })], ultimo: 'sofia', sonido: false });
  await clic(v, 'continuar-ronda');
  await espera(400);
  comprobar((await textoAyuda(v)) === 'abierto: Ayuda', 'con la espera cumplida, la ayuda está abierta');
  await clic(v, 'tecla', `[data-n="${div.celdas.find(c => c.orden === 1).valor}"]`);
  await espera(300);
  comprobar((await textoAyuda(v)) === 'abierto: Ayuda', 'al resolver una casilla sigue abierta (no se reinicia)');
  await clic(v, 'ayuda');
  await espera(300);
  await clic(v, 'tecla', `[data-n="${div.celdas.find(c => c.orden === 2).valor}"]`);
  await espera(300);
  t = await textoAyuda(v);
  comprobar(/^cerrado: Ayuda en 1[45] s/.test(t), 'solo después de usarla vuelve a esperar (y más tiempo): «' + t + '»');
  v.w.destroy();

  console.log('Pista según el nivel del alumno:');
  const nivelado = alumno('dificil', [{ dividendo: 4715, divisor: 23, decimales: 0 }]);
  nivelado.apoyo = { nivel: { cabe: 2, mult: 0, restar: 1, bajar: 0 }, racha: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, fallos: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, espera: 0, sinAyuda: 0, rondasSolo: 0 };
  v = await abrir({ alumnos: [nivelado], ultimo: 'sofia', sonido: false });
  await clic(v, 'continuar-ronda');
  await espera(400);
  const pista = await v.js(`(document.querySelector('.pista') || {}).textContent || ''`);
  comprobar(/\?$/.test(pista.trim()) && pista.length < 90, 'nivel 2: solo la pregunta «' + pista.replace('Pista', '').trim() + '»');
  comprobar((await v.js(`document.querySelectorAll('.celda.luz').length`)) > 0, 'nivel 2: se iluminan los números');
  const d2 = D.crearDivision(4715, 23, 0);
  await clic(v, 'tecla', `[data-n="${d2.celdas.find(c => c.orden === 1).valor}"]`);
  await espera(300);
  comprobar(!(await v.js(`!!document.querySelector('.pista')`)) && !(await v.js(`!!document.querySelector('.celda.luz')`)), 'nivel 0 (multiplicar): sin pista ni números iluminados');
  comprobar(v.errores.length === 0, 'sin errores en la consola' + (v.errores.length ? ': ' + v.errores[0] : ''));
  v.w.destroy();

  console.log('Premio al terminar la ronda:');
  const r = alumno('medio', Array.from({ length: 13 }, () => prob));
  r.ronda.indice = 12; r.ronda.sumadas = 36; r.niveles.medio.estrellas = 36;
  r.ronda.resultados = Array.from({ length: 12 }, () => ({ errores: 0, ayuda: false, ensenada: false, fallos: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, estrellas: 3 }));
  v = await abrir({ alumnos: [r], ultimo: 'sofia', sonido: false });
  await clic(v, 'continuar-ronda');
  await espera(400);
  for (const c of [...div.celdas].filter(c => c.orden > 0).sort((x, y) => x.orden - y.orden)) { await clic(v, 'tecla', `[data-n="${c.valor}"]`); await espera(40); }
  await espera(300);
  await clic(v, 'siguiente');
  await espera(600);
  a = await guardado(v);
  comprobar(a.niveles.medio.estrellas === 41, `39 estrellas + 2 por las bombillas sin usar de Medio (tiene ${a.niveles.medio.estrellas})`);
  comprobar(!!a.medallas.solo, 'gana la medalla «Lo hice solo»');
  comprobar((await v.js(`(document.querySelector('.premio-solo') || {}).textContent || ''`)).includes('¡Lo hiciste solo!'), 'el resumen dice «¡Lo hiciste solo!»');
  const barra = await v.js(`(document.querySelector('.barra-focos') || {}).textContent || ''`);
  comprobar(barra.includes('Guardaste 2 de 2 focos') && barra.includes('+2 estrellas'), 'la barra de focos dice cuántos guardó y que se cambiaron por estrellas');
  v.w.destroy();

  console.log('Salir a mitad de ronda:');
  const mitad = alumno('medio', Array.from({ length: 13 }, () => prob), { indice: 3, sumadas: 9, resultados: Array.from({ length: 3 }, () => ({ errores: 0, ayuda: false, ensenada: false, fallos: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, estrellas: 3 })) });
  mitad.niveles.medio.estrellas = 9;
  v = await abrir({ alumnos: [mitad], ultimo: 'sofia', sonido: false });
  await clic(v, 'a-niveles');
  await espera(300);
  await clic(v, 'jugar', '[data-nivel="medio"]');
  await espera(500);
  a = await guardado(v);
  comprobar(a.niveles.medio.estrellas === 9 && !a.medallas.solo, `si deja la ronda a medias y empieza otra, los focos no se cambian por estrellas (tiene ${a.niveles.medio.estrellas})`);
  comprobar((await v.js(`(document.querySelector('.bombillas small') || {}).textContent || ''`)).includes('si terminas la ronda'), 'el juego avisa que los focos solo valen si termina la ronda');
  v.w.destroy();
  const cinco = A.nuevoPerfil('Tomás', 3);
  for (let i = 0; i < 5; i++) A.rondaSinAyuda(cinco, [{ ayuda: false, ensenada: false }]);
  comprobar(!!cinco.medallas.sin_ruedas, 'con 5 rondas sin ayuda gana «Sin ruedas»');

  console.log('Los focos se recargan:');
  const rec = alumno('facil', Array.from({ length: 13 }, () => prob), { ayudasUsadas: 2, recarga: 2 });
  v = await abrir({ alumnos: [rec], ultimo: 'sofia', sonido: false });
  await clic(v, 'continuar-ronda');
  await espera(400);
  comprobar((await textoAyuda(v)) === 'cerrado: Sin focos', 'sin focos, el botón dice «Sin focos»');
  for (const c of [...div.celdas].filter(c => c.orden > 0).sort((x, y) => x.orden - y.orden)) { await clic(v, 'tecla', `[data-n="${c.valor}"]`); await espera(40); }
  // Las ventanas ocultas de la prueba retrasan los temporizadores: se espera un poco más al aviso
  await espera(2200);
  let r2 = (await guardado(v)).ronda;
  comprobar(r2.ayudasUsadas === 1 && r2.recarga === 0, 'con 3 divisiones seguidas sin ayuda recupera 1 foco (quedan ' + (2 - r2.ayudasUsadas) + ' de 2)');
  comprobar((await v.js(`[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' ')`)).includes('Recuperaste un foco'), 'sale el aviso «¡Recuperaste un foco!»');
  v.w.destroy();
  const avz = alumno('avanzado', [prob], { ayudasUsadas: 1, recarga: 1 });
  v = await abrir({ alumnos: [avz], ultimo: 'sofia', sonido: false });
  await clic(v, 'continuar-ronda');
  await espera(400);
  for (const c of [...div.celdas].filter(c => c.orden > 0).sort((x, y) => x.orden - y.orden)) { await clic(v, 'tecla', `[data-n="${c.valor}"]`); await espera(40); }
  await espera(500);
  r2 = (await guardado(v)).ronda;
  comprobar(r2.ayudasUsadas === 0, 'en Avanzado se recupera cada 2 divisiones');
  v.w.destroy();
  const lleno = alumno('medio', [prob], { ayudasUsadas: 0, recarga: 0 });
  v = await abrir({ alumnos: [lleno], ultimo: 'sofia', sonido: false });
  await clic(v, 'continuar-ronda');
  await espera(400);
  for (const c of [...div.celdas].filter(c => c.orden > 0).sort((x, y) => x.orden - y.orden)) { await clic(v, 'tecla', `[data-n="${c.valor}"]`); await espera(40); }
  await espera(500);
  r2 = (await guardado(v)).ronda;
  comprobar((r2.ayudasUsadas || 0) === 0 && !(await v.js(`!!document.querySelector('.recarga')`)), 'con todos los focos nunca pasa del máximo ni muestra la recarga');
  v.w.destroy();
  comprobar(!A.rondaSinAyuda(A.nuevoPerfil('X', 0), [{ ayuda: true, ensenada: false }]), 'una ronda con ayuda no cuenta');

  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nLa ayuda se retira como se pidió');
  app.exit(fallos ? 1 : 0);
});
