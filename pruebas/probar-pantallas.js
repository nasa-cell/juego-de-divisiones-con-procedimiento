// Juega una ronda completa en la aplicación real y guarda capturas.
// Uso: npx electron pruebas/probar-pantallas.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const carpeta = path.join(__dirname, 'capturas');
fs.mkdirSync(carpeta, { recursive: true });
const errores = [];
const espera = ms => new Promise(r => setTimeout(r, ms));

const AYUDANTES = `
window.__p = {
  division() {
    const t = document.querySelector('.enunciado').textContent.split('÷').map(s => Number(s.trim()));
    const dec = t[0] >= 10000 ? 1 : 0;
    return Division.crearDivision(t[0], t[1], dec);
  },
  valorActivo() {
    const a = document.querySelector('.celda.activa');
    if (!a) return null;
    const c = this.division().celdas.find(x => x.orden === Number(a.dataset.orden));
    return c ? { valor: c.valor, tipo: c.tipo } : null;
  },
  tecla(n) { document.querySelector('.tecla[data-n="' + n + '"]').click(); },
  pulsar(accion) { const b = document.querySelector('[data-accion="' + accion + '"]'); if (!b) throw new Error('No existe el botón ' + accion); b.click(); },
  acertar(veces) { for (let i = 0; i < veces; i++) { const v = this.valorActivo(); if (!v) return i; this.tecla(v.valor); } return veces; },
  fallar() { const v = this.valorActivo(); this.tecla((v.valor + 1) % 10); return v.tipo; },
  resolver(fallarRestas) {
    let n = 0;
    while (true) {
      const v = this.valorActivo();
      if (!v) break;
      if (fallarRestas && v.tipo === 'restar' && n < fallarRestas) { this.tecla((v.valor + 1) % 10); n++; }
      this.tecla(v.valor);
    }
    return n;
  }
};0;`;

async function ventana(ancho, alto) {
  const w = new BrowserWindow({ width: ancho, height: alto, show: false, useContentSize: true, webPreferences: { partition: 'prueba' + ancho, offscreen: true } });
  w.webContents.on('console-message', (e, nivel, mensaje) => { if (nivel >= 3) errores.push(mensaje); });
  w.webContents.on('render-process-gone', () => errores.push('la página se cerró'));
  await w.loadFile(path.join(__dirname, '..', 'juego', 'index.html'));
  await w.webContents.executeJavaScript(AYUDANTES);
  return w;
}

async function captura(w, nombre, ms) {
  await espera(ms || 900);
  const alto = await w.webContents.executeJavaScript('document.documentElement.scrollHeight');
  const [ancho] = w.getContentSize();
  w.setContentSize(ancho, Math.min(Math.max(alto, 600), 3000));
  await espera(250);
  const img = await w.webContents.capturePage();
  fs.writeFileSync(path.join(carpeta, nombre + '.png'), img.toPNG());
}

const js = (w, codigo) => w.webContents.executeJavaScript(codigo);

async function recorrido(w, prefijo, completo) {
  const [ancho, altoInicial] = w.getContentSize();
  const volver = () => w.setContentSize(ancho, altoInicial);
  await captura(w, prefijo + '01-alumno-nuevo'); volver();
  await js(w, `document.getElementById('nombre').value = 'Sofía'; __p.pulsar('dibujo'); document.querySelector('[data-accion="dibujo"][data-i="0"]').click(); document.querySelector('form').requestSubmit();`);
  await captura(w, prefijo + '02-niveles'); volver();
  await js(w, `document.querySelector('[data-accion="jugar"][data-nivel="medio"]').click()`);
  await js(w, `__p.acertar(3)`);
  await captura(w, prefijo + '03-jugando', 700); volver();
  const tipo = await js(w, `__p.fallar()`);
  await captura(w, prefijo + '04-error', 150); volver();
  await espera(1000);
  await js(w, `__p.fallar(); __p.fallar(); __p.fallar();`);
  await espera(1000);
  const hayAviso = await js(w, `!!document.querySelector('.aviso')`);
  await captura(w, prefijo + '05-aviso-ensenar'); volver();
  const divisorEnsenado = await js(w, `__p.division().divisor`);
  await js(w, `__p.pulsar('ensenar'); __p.pulsar('paso-sig'); __p.pulsar('paso-sig'); __p.pulsar('paso-sig');`);
  await captura(w, prefijo + '06-modo-ensenar'); volver();
  await js(w, `while (!document.querySelector('[data-accion="hazlo-tu"]')) __p.pulsar('paso-sig');`);
  await captura(w, prefijo + '07-ensenar-final'); volver();
  await js(w, `__p.pulsar('hazlo-tu')`);
  const divisorParecida = await js(w, `__p.division().divisor`);
  await js(w, `__p.resolver(1)`);
  await captura(w, prefijo + '08-acierto', 1200); volver();
  if (!completo) return { hayAviso, parecida: divisorEnsenado === divisorParecida };
  // resto de la ronda: falla restas a propósito para que el juego lo aprenda
  const motivos = [];
  for (let i = 2; i < 13; i++) {
    await js(w, `__p.pulsar('siguiente')`);
    motivos.push(await js(w, `(document.querySelector('.motivo') || {}).textContent || ''`));
    await js(w, `__p.resolver(${i % 2 ? 1 : 0})`);
    if (i === 5) { await js(w, `__p.pulsar('salir')`); await captura(w, prefijo + '09-ronda-a-medias'); volver(); await js(w, `__p.pulsar('continuar-ronda')`); }
  }
  await js(w, `__p.pulsar('siguiente')`);
  await captura(w, prefijo + '10-resumen', 1500); volver();
  await js(w, `__p.pulsar('a-progreso')`);
  await captura(w, prefijo + '11-progreso', 1400); volver();
  await w.reload();
  await espera(600);
  await captura(w, prefijo + '12-al-volver-a-abrir'); volver();
  const guardado = await js(w, `JSON.parse(localStorage.getItem('juegoDivisiones.v1'))`);
  return { hayAviso, parecida: divisorEnsenado === divisorParecida, motivos, guardado };
}

app.whenReady().then(async () => {
  try {
    const pc = await ventana(1200, 800);
    const r = await recorrido(pc, 'pc-', true);
    const cel = await ventana(390, 844);
    const r2 = await recorrido(cel, 'celular-', false);
    const p = r.guardado.alumnos[0];
    const informe = {
      avisoEnsenarAlCuartoError: r.hayAviso,
      parecidaMismoDivisor: r.parecida,
      motivosDeLosProblemas: r.motivos,
      alumnosGuardados: r.guardado.alumnos.map(a => a.nombre),
      historial: p.historial,
      erroresRestar: p.stats.restar,
      rondaPendiente: p.ronda,
      medallas: Object.keys(p.medallas),
      celularAviso: r2.hayAviso, celularParecida: r2.parecida,
      erroresDeConsola: errores
    };
    console.log(JSON.stringify(informe, null, 1));
  } catch (e) {
    console.log('FALLO: ' + e.message);
    console.log(errores.join('\n'));
  }
  app.quit();
});
