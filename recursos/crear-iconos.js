// Crea todos los iconos (PC, ventana, Android y pantalla de carga) a partir del logo.
// Uso: npx electron recursos/crear-iconos.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const Logo = require('../juego/codigo/logo.js');

const raiz = path.join(__dirname, '..');
const res = path.join(raiz, 'celular', 'app', 'src', 'main', 'res');
const DENSIDADES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await w.loadURL('data:text/html,<html><body></body></html>');
  // Dibuja un SVG en un lienzo del tamaño pedido; opcionalmente con fondo y logo centrado
  await w.webContents.executeJavaScript(`
    window.dibujar = (svg, ancho, alto, fondo, fraccion) => new Promise(ok => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = ancho; c.height = alto;
        const g = c.getContext('2d');
        if (fondo) { g.fillStyle = fondo; g.fillRect(0, 0, ancho, alto); }
        const lado = Math.round(Math.min(ancho, alto) * (fraccion || 1));
        g.drawImage(img, (ancho - lado) / 2, (alto - lado) / 2, lado, lado);
        ok(c.toDataURL('image/png').split(',')[1]);
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }); 0`);
  const png = async (svg, ancho, alto, destino, fondo, fraccion) => {
    const datos = await w.webContents.executeJavaScript(`dibujar(${JSON.stringify(svg)}, ${ancho}, ${alto}, ${JSON.stringify(fondo || '')}, ${fraccion || 1})`);
    fs.writeFileSync(destino, Buffer.from(datos, 'base64'));
  };
  const cuadro = Logo.logoSVG('cuadro'), circulo = Logo.logoSVG('circulo'), solo = Logo.logoSVG('ninguno');

  await png(cuadro, 512, 512, path.join(raiz, 'recursos', 'icono.png'));
  await png(cuadro, 256, 256, path.join(raiz, 'juego', 'imagenes', 'icono.png'));
  let n = 2;
  if (fs.existsSync(res)) {
    for (const [d, t] of Object.entries(DENSIDADES)) {
      await png(cuadro, t, t, path.join(res, `mipmap-${d}`, 'ic_launcher.png'));
      await png(circulo, t, t, path.join(res, `mipmap-${d}`, 'ic_launcher_round.png'));
      const f = Math.round(t * 108 / 48);
      await png(solo, f, f, path.join(res, `mipmap-${d}`, 'ic_launcher_foreground.png'));
      n += 3;
    }
    fs.writeFileSync(path.join(res, 'values', 'ic_launcher_background.xml'),
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#043A4D</color>\n</resources>\n');
    // Pantallas de carga: fondo del juego con el logo en el centro
    for (const dir of fs.readdirSync(res).filter(x => x.startsWith('drawable'))) {
      const archivo = path.join(res, dir, 'splash.png');
      if (!fs.existsSync(archivo)) continue;
      const b = fs.readFileSync(archivo);
      const ancho = b.readUInt32BE(16), alto = b.readUInt32BE(20);
      await png(cuadro, ancho, alto, archivo, '#07627D', 0.35);
      n++;
    }
  }
  console.log(`Iconos creados: ${n}`);
  app.quit();
});
