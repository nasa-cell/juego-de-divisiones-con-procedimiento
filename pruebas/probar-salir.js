// Comprueba que salir a mitad de ronda no hace perder nada:
// las estrellas ganadas se suman enseguida, siguen ahí al cerrar y abrir el juego,
// no se cuentan dos veces al terminar la ronda y el juego aprende también de la ronda dejada a medias.
// Uso: npx electron pruebas/probar-salir.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const A = require('../juego/codigo/aprendizaje.js');
const D = require('../juego/codigo/division.js');

const espera = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
function comprobar(ok, texto) { console.log((ok ? '  OK   ' : '  FALLO ') + texto); if (!ok) fallos++; }

async function abrir(datos) {
  const w = new BrowserWindow({ width: 1100, height: 800, show: false, webPreferences: { offscreen: true, partition: 'persist:salir' } });
  const errores = [];
  w.webContents.on('console-message', (e, nivel, msj) => { if (nivel >= 3) errores.push(msj); });
  await w.loadFile(path.join(__dirname, '..', 'juego', 'index.html'));
  if (datos) {
    await w.webContents.executeJavaScript(`localStorage.setItem('juegoDivisiones.v1', ${JSON.stringify(JSON.stringify(datos))}); 0`);
    await new Promise(r => { w.webContents.once('did-finish-load', r); w.webContents.reload(); });
  }
  await espera(600);
  return { w, errores, js: c => w.webContents.executeJavaScript(c) };
}
const guardado = v => v.js(`JSON.parse(localStorage.getItem('juegoDivisiones.v1')).alumnos[0]`);
const clic = (v, accion, extra) => v.js(`(() => { const b = document.querySelector('[data-accion="${accion}"]${extra || ''}'); if (!b) return 'falta ${accion}'; b.click(); return 0; })()`);

// Resuelve la división que está en pantalla tecleando las casillas en orden y sin errores
async function resolver(v, prob) {
  const div = D.crearDivision(prob.dividendo, prob.divisor, prob.decimales);
  for (const c of [...div.celdas].filter(c => c.orden > 0).sort((a, b) => a.orden - b.orden)) {
    await clic(v, 'tecla', `[data-n="${c.valor}"]`);
    await espera(40);
  }
  await espera(300);
}

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  const p = A.nuevoPerfil('Sofía', 0);
  p.id = 'sofia';
  const problemas = [{ dividendo: 84, divisor: 4, decimales: 0 }, { dividendo: 96, divisor: 8, decimales: 0 }, { dividendo: 72, divisor: 6, decimales: 0 }];
  p.ronda = { nivel: 'facil', indice: 0, problemas, resultados: [], actual: null, parecida: null };
  p.nivel = 'facil';

  console.log('Jugar 2 divisiones y salir a mitad de ronda:');
  let v = await abrir({ alumnos: [p], ultimo: p.id, sonido: false });
  await clic(v, 'continuar-ronda');
  await espera(400);
  await resolver(v, problemas[0]);
  await clic(v, 'siguiente');
  await espera(400);
  await resolver(v, problemas[1]);
  await clic(v, 'salir');
  await espera(500);
  let a = await guardado(v);
  comprobar(a.niveles.facil.estrellas === 6, `las 6 estrellas de las 2 divisiones ya cuentan (tiene ${a.niveles.facil.estrellas})`);
  comprobar(a.ronda && a.ronda.resultados.length === 2, 'la ronda queda guardada a medias para continuarla');
  comprobar(a.stats.cabe.i > 0 && a.contadores.divisiones === 2, 'el juego aprendió de los pasos y cuenta las 2 divisiones');
  v.w.destroy();

  console.log('Cerrar y abrir el juego:');
  v = await abrir(null);
  a = await guardado(v);
  comprobar(a.niveles.facil.estrellas === 6, `al volver a abrir siguen las 6 estrellas (tiene ${a.niveles.facil.estrellas})`);
  const portada = await v.js(`(document.querySelector('.perfil-t small') || {}).textContent || ''`);
  comprobar(portada.includes('6'), 'la portada muestra las estrellas: ' + portada.trim());

  console.log('Terminar la ronda no cuenta dos veces:');
  const r = a.ronda;
  r.problemas = Array.from({ length: 13 }, (_, i) => problemas[i % 3]);
  r.resultados = Array.from({ length: 12 }, () => ({ errores: 0, ayuda: false, ensenada: false, fallos: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, estrellas: 3 }));
  r.sumadas = 36; r.indice = 12; r.actual = null;
  a.niveles.facil.estrellas = 36;
  v.w.destroy();
  v = await abrir({ alumnos: [a], ultimo: a.id, sonido: false });
  await clic(v, 'continuar-ronda');
  await espera(400);
  await resolver(v, r.problemas[12]);
  await clic(v, 'siguiente');
  await espera(500);
  a = await guardado(v);
  comprobar(a.niveles.facil.estrellas === 41 && a.niveles.facil.mejor === 39, `al terminar tiene 39 estrellas de la ronda + 2 por los focos guardados, no 75 (tiene ${a.niveles.facil.estrellas})`);
  comprobar(!a.ronda && a.historial.length === 1, 'la ronda terminada pasa al historial');
  comprobar(v.errores.length === 0, 'sin errores en la consola' + (v.errores.length ? ': ' + v.errores[0] : ''));
  v.w.destroy();

  console.log('Ronda de una versión anterior (sin estrellas sumadas):');
  const viejo = A.nuevoPerfil('Mateo', 1);
  const ronda = { nivel: 'medio', resultados: Array.from({ length: 13 }, () => ({ errores: 0, ensenada: false, fallos: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, estrellas: 3 })) };
  A.terminarRonda(viejo, ronda);
  comprobar(viejo.niveles.medio.estrellas === 39, 'al terminarla suma sus 39 estrellas completas');

  console.log('Aprender de una ronda dejada a medias:');
  const bien = A.nuevoPerfil('Lucía', 2); bien.recomendado = 'facil';
  A.cerrarRondaIncompleta(bien, { nivel: 'facil', resultados: Array.from({ length: 6 }, () => ({ errores: 0, ensenada: false, estrellas: 3 })) });
  comprobar(bien.recomendado === 'medio', 'si iba sin errores, le recomienda subir a Medio');
  const mal = A.nuevoPerfil('Tomás', 3); mal.recomendado = 'medio';
  A.cerrarRondaIncompleta(mal, { nivel: 'medio', resultados: Array.from({ length: 5 }, (_, i) => ({ errores: 4, ensenada: i < 3, estrellas: 1 })) });
  comprobar(mal.recomendado === 'facil', 'si le costaba mucho, le recomienda bajar a Fácil');
  const poco = A.nuevoPerfil('Ana', 4); poco.recomendado = 'medio';
  A.cerrarRondaIncompleta(poco, { nivel: 'medio', resultados: [{ errores: 5, ensenada: true, estrellas: 1 }] });
  comprobar(poco.recomendado === 'medio', 'con muy pocas divisiones no cambia la recomendación');

  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nSalir a mitad de ronda ya no hace perder nada');
  app.exit(fallos ? 1 : 0);
});
