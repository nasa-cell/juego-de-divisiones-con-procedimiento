// Prueba el editor de perfil: soltar una foto, moverla, acercarla, guardar y verla en el juego y en el PDF.
// Uso: npx electron pruebas/probar-perfil.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const espera = ms => new Promise(r => setTimeout(r, ms));
app.on('window-all-closed', () => {});
let fallos = 0;
const comprobar = (ok, t) => { console.log(`  ${ok ? 'OK    ' : 'FALLO '} ${t}`); if (!ok) fallos++; };

async function probar(ancho, alto, nombre) {
  const w = new BrowserWindow({ width: ancho, height: alto, show: false, useContentSize: true, webPreferences: { offscreen: true, partition: 'perfil' + ancho } });
  const errores = [];
  w.webContents.on('console-message', (e, n, m) => { if (n >= 3) errores.push(m); });
  await w.loadFile(path.join(__dirname, '..', 'juego', 'index.html'));
  await espera(600);
  const js = c => w.webContents.executeJavaScript(c);
  const foto = async archivo => { await espera(1200); fs.writeFileSync(path.join(__dirname, 'capturas', archivo), (await w.webContents.capturePage()).toPNG()); };
  await js(`document.getElementById('nombre').value = 'Lucía'; document.querySelector('form').requestSubmit(); 0`);
  await espera(300);
  await js(`document.querySelector('[data-accion="a-alumnos"]').click(); 0`);
  await espera(300);
  await js(`document.querySelector('[data-accion="editar-perfil"]').click(); 0`);
  await espera(400);
  await foto(`perfil-${nombre}-1-sin-foto.png`);
  // Suelta una foto de 800×600 sobre el recuadro, como si la arrastrara el usuario
  await js(`(async () => {
    const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d');
    g.fillStyle = '#9BD7F2'; g.fillRect(0,0,800,600); g.fillStyle = '#FF4FB8'; g.beginPath(); g.arc(560,260,150,0,7); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.arc(510,230,18,0,7); g.arc(610,230,18,0,7); g.fill();
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'foto.jpg', { type: 'image/jpeg' }));
    document.querySelector('.soltar').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    return 0; })()`);
  await espera(900);
  const hayRecorte = await js(`!!document.querySelector('.recorte img')`);
  comprobar(hayRecorte, `${nombre}: al soltar la foto aparece el recuadro para ajustarla`);
  // Alejar del todo: la foto sigue llenando todo el círculo (sin bordes oscuros)
  const llena = await js(`(() => { for (let i = 0; i < 12; i++) document.querySelectorAll('[data-accion="perfil-zoom"]')[0].click();
    const r = document.querySelector('.recorte').getBoundingClientRect(), i = document.querySelector('.recorte img').getBoundingClientRect();
    return i.left <= r.left + 1 && i.right >= r.right - 1 && i.top <= r.top + 1 && i.bottom >= r.bottom - 1; })()`);
  comprobar(llena, `${nombre}: al alejar del todo, la foto sigue llenando el círculo`);
  // La parte clara de la máscara llega hasta el aro amarillo
  const mascara = await js(`getComputedStyle(document.querySelector('.recorte .mascara')).backgroundImage`);
  comprobar(/closest-side/.test(mascara), `${nombre}: la parte clara llega hasta el aro amarillo`);
  await foto(`perfil-${nombre}-1b-alejada.png`);
  // La mueve hacia la izquierda (para centrar la cara rosa) y la acerca
  await js(`(() => { const r = document.querySelector('.recorte'), b = r.getBoundingClientRect();
    const ev = (t, x, y) => r.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, pointerId: 1, bubbles: true }));
    ev('pointerdown', b.left + 150, b.top + 150); ev('pointermove', b.left + 80, b.top + 150); ev('pointerup', b.left + 80, b.top + 150);
    document.querySelectorAll('[data-accion="perfil-zoom"]')[1].click(); document.querySelectorAll('[data-accion="perfil-zoom"]')[1].click(); return 0; })()`);
  await foto(`perfil-${nombre}-2-ajustando.png`);
  await js(`document.getElementById('nombre-perfil').value = 'Lucía María'; document.querySelector('[data-accion="perfil-guardar"]').click(); 0`);
  await espera(600);
  const d = await js(`JSON.parse(localStorage.getItem('juegoDivisiones.v1')).alumnos[0]`);
  comprobar(d.nombre === 'Lucía María', `${nombre}: el nombre cambió y se guardó`);
  comprobar(typeof d.foto === 'string' && d.foto.startsWith('data:image/jpeg') && d.foto.length < 60000, `${nombre}: la foto se guardó recortada (${Math.round((d.foto || '').length * 0.75 / 1024)} KB)`);
  comprobar(await js(`!!document.querySelector('.bienvenida .avatar.con-foto')`), `${nombre}: la portada muestra la foto`);
  await foto(`perfil-${nombre}-3-portada.png`);
  await js(`document.querySelector('[data-accion="a-progreso"]').click(); 0`);
  await espera(500);
  comprobar(await js(`!!document.querySelector('.progreso-cab .avatar.con-foto')`), `${nombre}: «Mi progreso» muestra la foto`);
  const pdf = await js(`Informe.crear(${JSON.stringify(d)}).output('datauristring').length`);
  comprobar(pdf > 1000, `${nombre}: el informe PDF se crea con la foto`);
  comprobar(errores.length === 0, `${nombre}: sin errores en la página${errores.length ? ': ' + errores.join(' | ') : ''}`);
  w.destroy();
}

app.whenReady().then(async () => {
  await probar(1366, 768, 'pc');
  await probar(360, 740, 'celular');
  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nEl editor de perfil funciona');
  app.quit();
});
