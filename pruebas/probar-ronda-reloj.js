// Juega una ronda completa del modo con reloj en la aplicación real, pulsando los botones.
// Uso: npx electron pruebas/probar-ronda-reloj.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const espera = ms => new Promise(r => setTimeout(r, ms));
app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
  const errores = [];
  const w = new BrowserWindow({ width: 390, height: 844, show: false, webPreferences: { offscreen: true, partition: 'rondareloj' } });
  w.webContents.on('console-message', (e, nivel, m) => { if (nivel >= 3) errores.push(m); });
  await w.loadFile(path.join(__dirname, '..', 'juego', 'index.html'));
  const js = c => w.webContents.executeJavaScript(c);
  await js(`window.__r = {
    division() { const t = document.querySelector('.enunciado').textContent.split('÷').map(s => Number(s.trim())); return Division.crearDivision(t[0], t[1], t[0] >= 10000 && t[1] >= 100 && document.querySelector('.celda.coma') ? 1 : 0); },
    resolver(fallos) {
      const div = this.division(); let n = 0;
      while (document.querySelector('.celda.activa')) {
        const o = Number(document.querySelector('.celda.activa').dataset.orden);
        const c = div.celdas.find(x => x.orden === o);
        if (n < fallos) { document.querySelector('.tecla[data-n="' + ((c.valor + 1) % 10) + '"]').click(); n++; }
        document.querySelector('.tecla[data-n="' + c.valor + '"]').click();
      }
    },
    pulsar(a) { const b = document.querySelector('[data-accion="' + a + '"]'); if (!b) throw new Error('falta ' + a); b.click(); }
  }; 0`);
  await js(`document.getElementById('nombre').value = 'Tomás'; document.querySelector('form').requestSubmit(); 0`);
  await espera(300);
  await js(`__r.pulsar('jugar-reloj'); 0`);
  const escalones = [];
  for (let i = 0; i < 13; i++) {
    escalones.push(await js(`document.querySelector('.info-escalon b').textContent`));
    await espera(1100 + (i === 2 ? 2000 : 0));      // pasa algo de tiempo para que el reloj cuente
    if (i === 4) {                                  // en la 5.ª: 4 errores → el reloj se para y enseña
      await js(`(() => { const d = __r.division(); const o = Number(document.querySelector('.celda.activa').dataset.orden); const v = d.celdas.find(x => x.orden === o).valor; for (let k = 0; k < 4; k++) document.querySelector('.tecla[data-n="' + ((v + 1) % 10) + '"]').click(); return 0; })()`);
      const seg1 = await js(`document.querySelector('.reloj span').textContent`);
      await espera(2200);
      const seg2 = await js(`document.querySelector('.reloj span').textContent`);
      if (seg1 !== seg2) errores.push(`el reloj no se paró al enseñar (${seg1} → ${seg2})`);
      await js(`__r.pulsar('ensenar'); 0`);
      await js(`while (document.querySelector('[data-accion="paso-sig"]:not([disabled])')) __r.pulsar('paso-sig'); __r.pulsar('hazlo-tu'); 0`);
      continue;
    }
    await js(`__r.resolver(${i % 3 === 0 ? 1 : 0}); 0`);
    await espera(200);
    await js(`__r.pulsar('siguiente'); 0`);
    await espera(200);
  }
  await espera(1500);
  const enResumen = await js(`!!document.querySelector('.puntos-grandes')`);
  fs.writeFileSync(path.join(__dirname, 'capturas', 'ronda-reloj-resumen.png'), (await w.webContents.capturePage()).toPNG());
  const datos = await js(`JSON.parse(localStorage.getItem('juegoDivisiones.v1'))`);
  const p = datos.alumnos[0];
  console.log(JSON.stringify({ enResumen, escalonesDuranteLaRonda: escalones, rondasConReloj: p.reloj.rondas, velocidadAprendida: p.velocidad, rondaPendiente: p.ronda, errores }, null, 1));
  app.quit();
});
