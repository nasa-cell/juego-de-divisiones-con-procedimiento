// Crea el informe de progreso de un alumno en PDF (4 páginas A4): carátula, gráficas,
// rondas con lo que ya hace bien, y consejos para casa pensados para ese alumno.
// Las gráficas se dibujan como imágenes; el texto va como texto normal del PDF.
(function (global) {
  'use strict';
  const A = global.Aprendizaje;
  const TINTA = '#0E2A33', MARCA = '#07627D', SUAVE = '#4D6C75';

  const fecha = f => { const [y, m, d] = f.split('-'); return `${d}/${m}/${y}`; };
  const corta = f => { const [, m, d] = f.split('-'); return `${d}/${m}`; };
  // Helvetica del PDF no tiene el signo menos tipográfico
  const limpio = t => String(t).replace(/−/g, '-').replace(/[«»]/g, '"');

  // ---------- gráficas como imagen ----------
  function lienzo(ancho, alto) {
    const escala = 2.5;
    const c = document.createElement('canvas');
    c.width = ancho * escala; c.height = alto * escala;
    const g = c.getContext('2d');
    g.scale(escala, escala);
    g.font = '700 11px Nunito, sans-serif';
    return { c, g };
  }

  function tituloEje(g, texto, alto) {
    if (!texto) return;
    g.save(); g.translate(10, alto / 2 - 10); g.rotate(-Math.PI / 2);
    g.fillStyle = SUAVE; g.textAlign = 'center'; g.font = '800 10px Nunito, sans-serif';
    g.fillText(texto, 0, 0); g.restore();
  }

  function ejes(g, ancho, alto, max, x0, y0, h) {
    g.strokeStyle = '#BFDDE5'; g.lineWidth = 1; g.fillStyle = SUAVE; g.textAlign = 'right'; g.font = '700 10px Nunito, sans-serif';
    [0, 0.5, 1].forEach(f => {
      const y = y0 + h * (1 - f);
      g.beginPath(); g.moveTo(x0, y); g.lineTo(ancho - 6, y); g.stroke();
      g.fillText(String(Math.round(max * f)), x0 - 5, y + 3);
    });
  }

  function grafBarras(datos, ancho, alto, max, tituloY) {
    const { c, g } = lienzo(ancho, alto);
    max = Math.max(1, max || Math.max(...datos.map(d => d[1])));
    tituloEje(g, tituloY, alto);
    // Si alguna etiqueta va en dos líneas, las barras dejan sitio debajo
    const dosLineas = datos.some(d => String(d[0]).includes('\n'));
    const x0 = 40, y0 = 14, h = alto - 40 - (dosLineas ? 11 : 0), n = datos.length, hueco = 10;
    const bw = (ancho - x0 - 10 - hueco * (n - 1)) / n;
    ejes(g, ancho, alto, max, x0, y0, h);
    datos.forEach((d, i) => {
      const x = x0 + 4 + i * (bw + hueco), bh = h * d[1] / max;
      g.fillStyle = d[2];
      g.beginPath(); g.roundRect ? g.roundRect(x, y0 + h - bh, bw, bh, 3) : g.rect(x, y0 + h - bh, bw, bh); g.fill();
      g.fillStyle = TINTA; g.textAlign = 'center'; g.font = '800 10px Nunito, sans-serif';
      g.fillText(String(d[1]), x + bw / 2, y0 + h - bh - 4);
      // Las etiquetas largas van en dos líneas
      g.font = '700 10px Nunito, sans-serif';
      const lineas = String(d[0]).split('\n');
      lineas.forEach((l, k) => g.fillText(l, x + bw / 2, alto - 10 - (lineas.length - 1 - k) * 11));
    });
    return c.toDataURL('image/png');
  }

  function grafLinea(vals, etiquetas, ancho, alto, max, tituloY) {
    const { c, g } = lienzo(ancho, alto);
    tituloEje(g, tituloY, alto);
    const x0 = 40, y0 = 14, h = alto - 40, n = vals.length;
    ejes(g, ancho, alto, max, x0, y0, h);
    const paso = n > 1 ? (ancho - x0 - 24) / (n - 1) : 0;
    const pts = vals.map((v, i) => [x0 + 10 + i * paso, y0 + h * (1 - v / max)]);
    g.strokeStyle = MARCA; g.lineWidth = 2.5; g.lineJoin = 'round';
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    pts.forEach((p, i) => {
      g.fillStyle = i === n - 1 ? '#FF4FB8' : MARCA;
      g.beginPath(); g.arc(p[0], p[1], i === n - 1 ? 5 : 3.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = TINTA; g.textAlign = 'center'; g.font = '800 10px Nunito, sans-serif';
      g.fillText(String(vals[i]), p[0], p[1] - 8);
      g.font = '700 9.5px Nunito, sans-serif';
      g.fillText(etiquetas[i], p[0], alto - 10);
    });
    return c.toDataURL('image/png');
  }

  // ---------- datos del alumno ----------
  // Nombres de los pasos tal como se explican en la carátula
  const PASO = {
    cabe: { nombre: '¿Por cuánto multiplico?', verbo: 'buscar por cuánto multiplicar', cuesta: 'buscar por cuánto multiplicar el divisor para acercarse al número sin pasarse' },
    mult: { nombre: 'Multiplicar', verbo: 'multiplicar', cuesta: 'multiplicar cuando hay que llevar' },
    restar: { nombre: 'Restar', verbo: 'restar', cuesta: 'las restas en las que hay que pedir prestado' },
    bajar: { nombre: 'Bajar la cifra', verbo: 'bajar la cifra', cuesta: 'bajar la cifra y poner ceros en el cociente' }
  };
  const AVATARES = [['÷', '#FFD23F'], ['×', '#FF4FB8'], ['+', '#B8FF3B'], ['-', '#22D3EE'], ['=', '#FF8A3D'], ['%', '#E0C8FF']];

  // Todo lo que el informe necesita saber del alumno, calculado una sola vez
  function analizar(p) {
    const tasa = t => p.stats[t].e / Math.max(1, p.stats[t].i);
    let peor = null, mejor = null;
    A.TIPOS.forEach(t => {
      if (p.stats[t].e > 0 && (!peor || tasa(t) > tasa(peor))) peor = t;
      if (p.stats[t].i >= 10 && (!mejor || tasa(t) < tasa(mejor))) mejor = t;
    });
    if (mejor === peor) mejor = null;
    const tablas = [];
    for (let d = 2; d <= 9; d++) {
      const s = p.tablas[d];
      if (s && s.i >= 5) tablas.push({ d, pct: Math.round((1 - s.e / s.i) * 100) });
    }
    const ordenTablas = tablas.slice().sort((a, b) => a.pct - b.pct);
    const debil = ordenTablas.length && ordenTablas[0].pct < 85 ? ordenTablas[0] : null;
    const fuertes = tablas.filter(t => t.pct >= 90).map(t => t.d);
    const rondas = p.historial.length;
    const pctSin = rondas ? Math.round(p.historial.reduce((t, h) => t + h.bien, 0) / (rondas * A.POR_RONDA) * 100) : null;
    const ev = A.evolucionSemanal(p);
    const hace3 = ev.semanas[0].valor, esta = ev.semanas[3].valor;
    const dias = p.dias.filter(d => (Date.now() - new Date(d + 'T12:00:00')) / 86400000 <= 30).length;
    const ult = p.historial.slice(0, 10).reverse();
    const reloj = A.asegurarReloj(p);
    const medallas = A.MEDALLAS.filter(m => p.medallas[m.id]).length;
    return { tasa, peor, mejor, tablas, debil, fuertes, rondas, pctSin, ev, hace3, esta, dias, racha: A.racha(p), ult, reloj, medallas, divisiones: p.contadores.divisiones };
  }

  // Elige una de varias formas de decir lo mismo: cambia de un informe a otro
  function variador(p) {
    const semilla = [...(p.nombre + A.hoy())].reduce((a, ch) => a + ch.charCodeAt(0), 0);
    return (formas, k) => formas[(semilla + (k || 0) * 5) % formas.length];
  }

  function resumen(p, x, v) {
    const lista = [];
    if (x.pctSin === null) lista.push(['Está empezando', `todavía no terminó ninguna ronda sin reloj. Con unas pocas rondas este informe tendrá más datos.`]);
    else {
      const estado = x.pctSin >= 80 ? 'Va muy bien' : x.pctSin >= 60 ? 'Va bien' : 'Está aprendiendo';
      lista.push([estado, v([`hizo ${x.divisiones} divisiones y el ${x.pctSin} % le salió sin ningún error.`,
        `lleva ${x.divisiones} divisiones; ${x.pctSin} de cada 100 las resolvió sin equivocarse.`], 1)]);
    }
    if (x.peor) lista.push(['Lo que más le cuesta', `${PASO[x.peor].cuesta}${x.debil ? `, y la tabla del ${x.debil.d}` : ''}.`]);
    else if (x.debil) lista.push(['Lo que más le cuesta', `la tabla del ${x.debil.d}.`]);
    else lista.push(['Sin puntos débiles', 'por ahora no hay ningún paso que le cueste especialmente.']);
    if (x.hace3 > 0 && x.esta < x.hace3) lista.push(['Está mejorando', `esta semana tuvo ${x.esta} errores al ${PASO[x.ev.tipo].verbo}; hace 3 semanas tuvo ${x.hace3}.`]);
    else if (x.ult.length >= 2 && x.ult[x.ult.length - 1].estrellas > x.ult[0].estrellas) lista.push(['Está mejorando', `pasó de ${x.ult[0].estrellas} a ${x.ult[x.ult.length - 1].estrellas} estrellas por ronda.`]);
    else lista.push(['Próximo paso', `el juego le recomienda el nivel ${A.NIVELES[p.recomendado].nombre}.`]);
    return lista;
  }

  function fortalezas(p, x) {
    const lista = [];
    if (x.fuertes.length) lista.push(`Domina ${x.fuertes.length === 1 ? 'la tabla del ' + x.fuertes[0] : 'las tablas del ' + x.fuertes.slice(0, -1).join(', ') + ' y ' + x.fuertes[x.fuertes.length - 1]} (90 % de aciertos o más).`);
    if (x.mejor && x.tasa(x.mejor) < 0.08) lista.push(`Casi nunca se equivoca al ${PASO[x.mejor].verbo}.`);
    if (x.pctSin !== null && x.pctSin >= 70) lista.push(`El ${x.pctSin} % de sus divisiones le salen sin ningún error.`);
    if (x.racha >= 3) lista.push(`Constancia: lleva ${x.racha} días seguidos jugando.`);
    if (x.medallas) lista.push(`Ya ganó ${x.medallas} ${x.medallas === 1 ? 'medalla' : 'medallas'}.`);
    if (x.reloj.escalonMax >= 4) lista.push(`En el modo con reloj llegó al escalón ${x.reloj.escalonMax} de 12.`);
    if (!lista.length) lista.push('Ya empezó a practicar: cada ronda que termina le ayuda a aprender un poco más.');
    return lista.slice(0, 5);
  }

  // Consejos para casa: qué vimos, qué hacer y cómo saber que mejora
  function consejos(p, x, v) {
    x = x || analizar(p); v = v || variador(p);
    const lista = [];
    if (!x.rondas && !(x.reloj.rondas.length)) {
      lista.push({ titulo: 'Primeras rondas', vimos: 'Todavía no terminó ninguna ronda.', casa: 'Que juegue una ronda en Fácil, sin prisas. Si se atasca, puede pulsar Ayuda.', mejora: 'Tras 3 o 4 rondas este informe mostrará en qué paso necesita más práctica.' });
    }
    if (x.peor) {
      const t = x.peor, e = p.stats[t].e, pct = Math.round(x.tasa(t) * 100);
      const vimos = {
        cabe: `${e} errores al buscar por cuánto multiplicar (${pct} % de las veces): le cuesta encontrar qué número por el divisor se acerca más sin pasarse.`,
        mult: `${e} errores al multiplicar (${pct} % de las veces), sobre todo cuando hay que llevar.`,
        restar: `${e} errores al restar (${pct} % de las veces), casi siempre cuando la cifra de arriba es más pequeña y hay que pedir prestado.`,
        bajar: `${e} errores al bajar la cifra o poner 0 en el cociente (${pct} % de las veces).`
      }[t];
      const casa = {
        cabe: ['Antes de escribir, que diga en voz alta la tabla del divisor hasta pasarse. Para 29 ÷ 6: "6, 12, 18, 24, 30... me paso, es el 4: 6 × 4 = 24".',
          'Jueguen a "¿por cuánto multiplico?": digan un número y un divisor (como 38 y 7) y que diga qué número por 7 se acerca a 38 sin pasarse. 5 preguntas al día bastan.',
          'Con objetos: repartan 23 fideos en grupos de 5. ¿Cuántos grupos completos salen? Luego hagan lo mismo solo con números.'],
        mult: ['En papel, multiplicaciones como 34 × 6: 6 × 4 = 24, escribe 4 y lleva 2; 6 × 3 = 18, más 2, 20.',
          'Que diga en voz alta "escribo... y llevo..." en cada multiplicación. Decirlo evita que se olvide de sumar lo que lleva.',
          'Repasen salteada la tabla que más usa en las divisiones: 7 × 6, 7 × 9, 7 × 4...'],
        restar: ['5 minutos al día: 3 restas en papel como 52 - 28. Que diga en voz alta "el 2 no puede quitar 8, pido 1 al 5".',
          'Con monedas o palitos: con 5 decenas y 2 unidades, para quitar 8 unidades cambia 1 decena por 10 unidades. Así entiende qué es pedir prestado.',
          'Hagan restas de ida y vuelta: 52 - 28 = 24 y luego comprueben que 24 + 28 = 52.'],
        bajar: ['Recuérdenle la regla: después de restar se baja la siguiente cifra; si el divisor por 1 ya se pasa, se escribe 0 en el cociente y se baja otra.',
          'Que marque con un punto cada cifra del dividendo cuando la baja: así ve cuáles le quedan.',
          'Practiquen divisiones con ceros en el cociente, como 612 ÷ 6 o 815 ÷ 4, despacio y en voz alta.']
      }[t];
      const mejora = x.ev.tipo === t && (x.hace3 || x.esta)
        ? (x.esta < x.hace3 ? `Ya va bajando: ${x.hace3} errores hace 3 semanas y ${x.esta} esta semana. En "Mi progreso" la barra verde sigue bajando.` : `En "Mi progreso", la barra de esta semana (ahora ${x.esta}) queda más baja que las anteriores.`)
        : `En "Mi progreso", la barra de "${PASO[t].nombre}" baja de una semana a otra.`;
      lista.push({ titulo: PASO[t].nombre, vimos, casa: v(casa, 2), mejora });
    }
    if (x.debil) {
      const d = x.debil.d, otras = x.tablas.filter(t => t.d !== d);
      const minOtras = otras.length ? Math.min(...otras.map(t => t.pct)) : null;
      lista.push({
        titulo: `Tabla del ${d}`,
        vimos: `Acierta el ${x.debil.pct} % con la tabla del ${d}${minOtras !== null && minOtras > x.debil.pct ? `; con las demás, el ${minOtras} % o más` : ''}.`,
        casa: v([`Díganla salteada en ratos sueltos (en el coche, al cenar): "¿${d} × 7? ¿${d} × 4?". Mejor 2 minutos cada día que 20 un solo día.`,
          `Escriban la tabla del ${d} en un papel en la nevera y que la lea en voz alta una vez al día durante una semana.`,
          `Con cartas del 1 al 9: saquen una y que diga el resultado de multiplicarla por ${d}. Gana un punto por cada acierto.`], 3),
        mejora: x.debil.pct < 80 ? `La casilla del ${d} en este informe pasa de rosa a amarilla (80 %) y luego a verde (90 %).` : `La casilla del ${d} en este informe pasa de amarilla a verde (90 %).`
      });
    }
    const reco = A.NIVELES[p.recomendado];
    const nivelActual = p.historial.length ? A.NIVELES[p.historial[0].nivel] : null;
    if (x.rondas || x.reloj.rondas.length) {
      const mejorRonda = nivelActual ? p.niveles[p.historial[0].nivel].mejor : 0;
      lista.push({
        titulo: 'Siguiente reto',
        vimos: (nivelActual ? `Su mejor ronda en ${nivelActual.nombre} tiene ${mejorRonda} de 39 estrellas.` : '') + (x.reloj.rondas.length ? ` Con reloj está en el escalón ${x.reloj.escalon} de 12.` : ''),
        casa: nivelActual && reco.nombre !== nivelActual.nombre
          ? `El juego le recomienda pasar a ${reco.nombre} (${reco.texto.toLowerCase()}). Al principio le costará un poco más: es normal.`
          : v([`Una ronda en ${reco.nombre} y otra con reloj al día. Cuando saque 10 divisiones sin errores en una ronda, el juego le propondrá el siguiente nivel.`,
            `Que siga en ${reco.nombre} hasta que le salga fácil; luego el juego le propondrá el siguiente nivel. Una ronda con reloj ayuda a ganar soltura.`], 4),
        mejora: x.reloj.escalon < 12 ? `El escalón con reloj sube del ${x.reloj.escalon} al ${x.reloj.escalon + 1}: ${A.ESCALONES[x.reloj.escalon].texto}.` : 'Ya está en lo más alto de la escalera: el reto es batir su récord de puntos.'
      });
    }
    if (x.dias < 10) {
      lista.push({
        titulo: 'Constancia',
        vimos: `Jugó ${x.dias} ${x.dias === 1 ? 'día' : 'días'} en el último mes.`,
        casa: v(['Mejor 10 minutos 4 o 5 días por semana que una hora de golpe. Pongan una hora fija, por ejemplo después de merendar.',
          'Que juegue una ronda corta cada día a la misma hora: la rutina ayuda más que las sesiones largas.'], 5),
        mejora: 'Suben los días seguidos y consigue la medalla de 7 días seguidos.'
      });
    }
    return lista.slice(0, 4);
  }

  function planSemana(p, x) {
    const reco = A.NIVELES[p.recomendado].nombre;
    const foco = {
      cabe: '5 preguntas de "¿por cuánto multiplico?" sin papel',
      mult: '3 multiplicaciones en papel en las que haya que llevar',
      restar: '3 restas en papel con "pedir prestado"',
      bajar: '2 divisiones con ceros en el cociente, en papel'
    }[x.peor];
    const tabla = x.debil ? `la tabla del ${x.debil.d} salteada (2 minutos)` : null;
    const extra1 = foco || tabla || 'una división del juego explicada en voz alta';
    const extra2 = tabla || foco || 'una división del juego explicada en voz alta';
    return [
      ['Lunes', `Una ronda en ${reco} y ${extra1}.`],
      ['Martes', `Una ronda con reloj y ${extra2}.`],
      ['Miércoles', `Una ronda en ${reco} y ${extra1}.`],
      ['Jueves', `Una ronda con reloj y ${extra2}.`],
      ['Viernes', 'Ronda libre: que elija el modo que más le guste. Después miren juntos "Mi progreso".'],
      ['Fin de semana', 'Descanso, o una ronda si le apetece.']
    ];
  }

  function mensaje(p, x, v) {
    const n = p.nombre;
    if (!x.rondas) return v([`¡Hola, ${n}! Este es tu primer informe. Juega unas rondas y verás cuánto aprendes.`, `${n}, acabas de empezar. Cada división que haces te hace más fuerte en matemáticas.`], 6);
    return v([`¡${n}, vas muy bien! Ya hiciste ${x.divisiones} divisiones. Si sigues practicando un poco cada día, lo que hoy te cuesta pronto te saldrá solo.`,
      `${n}, ya llevas ${x.divisiones} divisiones. Equivocarse es parte de aprender: cada error que corriges es un paso más.`,
      `¡Buen trabajo, ${n}! Con ${x.divisiones} divisiones hechas ya sabes mucho. El próximo reto te está esperando.`], 7);
  }

  // Logo en PNG para la cabecera del PDF (se prepara al abrir el juego)
  let logoPNG = null;
  if (global.Logo) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 240;
      c.getContext('2d').drawImage(img, 0, 0, 240, 240);
      logoPNG = c.toDataURL('image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(global.Logo.logoSVG('cuadro'));
  }

  // ---------- el documento ----------
  const PAGINAS = 4;
  function crear(p) {
    const { jsPDF } = global.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 14, ancho = W - 2 * M, mitad = (ancho - 4) / 2;
    const hoy = A.hoy();
    const primera = [p.creado, ...p.dias].sort()[0] || hoy;
    const x = analizar(p), v = variador(p), reloj = x.reloj;

    const fondo = () => { doc.setFillColor('#F1FAFC'); doc.rect(0, 0, 210, 297, 'F'); };
    const caja = (cx, cy, w, h, relleno, borde) => { doc.setFillColor(relleno); doc.setDrawColor(borde); doc.setLineWidth(0.5); doc.roundedRect(cx, cy, w, h, 2.5, 2.5, 'FD'); };
    const titulo = (t, tx, ty, color) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(color || MARCA); doc.text(limpio(t), tx, ty); };
    const texto = (t, tx, ty, w, tam, color, negrita) => {
      doc.setFont('helvetica', negrita ? 'bold' : 'normal'); doc.setFontSize(tam || 10); doc.setTextColor(color || TINTA);
      const lineas = doc.splitTextToSize(limpio(t), w);
      doc.text(lineas, tx, ty);
      return lineas.length * (tam || 10) * 0.42;
    };
    // "Qué significa": explicación con los números de este alumno bajo cada gráfica
    const significa = (t, tx, ty, w) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(MARCA); doc.text('Qué significa:', tx, ty);
      const ini = doc.getTextWidth('Qué significa: ');
      doc.setFont('helvetica', 'normal'); doc.setTextColor(SUAVE);
      const lineas = doc.splitTextToSize(limpio(t), w - ini);
      doc.text(lineas[0], tx + ini, ty);
      if (lineas.length > 1) doc.text(doc.splitTextToSize(limpio(lineas.slice(1).join(' ')), w), tx, ty + 3.4);
    };
    const muestras = (lista, mx, my) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TINTA);
      lista.forEach(([color, t]) => {
        doc.setFillColor(color); doc.setDrawColor('#000000'); doc.setLineWidth(0.2); doc.rect(mx, my - 2.6, 3, 3, 'FD');
        doc.text(t, mx + 4.2, my); mx += 4.2 + doc.getTextWidth(t) + 5;
      });
    };
    const pie = (n) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(SUAVE);
      doc.text(limpio(`Juego de Divisiones · informe de ${p.nombre} · creado el ${fecha(hoy)}`), M, 290);
      doc.text(`Página ${n} de ${PAGINAS}`, W - M, 290, { align: 'right' });
    };

    // ----- página 1: carátula -----
    fondo();
    doc.setFillColor(MARCA); doc.roundedRect(M, 12, ancho, 128, 4, 4, 'F');
    if (logoPNG) doc.addImage(logoPNG, 'PNG', W / 2 - 11, 20, 22, 22);
    else { doc.setFillColor('#FFD23F'); doc.circle(W / 2, 31, 11, 'F'); doc.setTextColor('#03384B'); doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.text('÷', W / 2, 35, { align: 'center' }); }
    doc.setTextColor('#FFFFFF'); doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.text('Juego de Divisiones', W / 2, 54, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11.5); doc.text('Informe de progreso para la familia', W / 2, 61, { align: 'center' });
    // Foto o dibujo del alumno
    let conFoto = false;
    if (p.foto) {
      try { doc.addImage(p.foto, 'JPEG', W / 2 - 17, 68, 34, 34, undefined, 'FAST'); doc.setDrawColor('#000000'); doc.setLineWidth(1); doc.roundedRect(W / 2 - 17, 68, 34, 34, 4, 4, 'S'); conFoto = true; } catch (e) { /* foto dañada: se usa el dibujo */ }
    }
    if (!conFoto) {
      const av = AVATARES[p.avatar] || AVATARES[0];
      doc.setFillColor(av[1]); doc.setDrawColor('#000000'); doc.setLineWidth(1); doc.circle(W / 2, 85, 17, 'FD');
      doc.setTextColor('#03384B'); doc.setFont('helvetica', 'bold'); doc.setFontSize(34); doc.text(av[0], W / 2, 89, { align: 'center' });
    }
    doc.setTextColor('#FFFFFF'); doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text(limpio(p.nombre), W / 2, 116, { align: 'center' });
    const periodo = `Del ${fecha(primera)} al ${fecha(hoy)} · ${p.dias.length} ${p.dias.length === 1 ? 'día' : 'días'} de juego`;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const pw = doc.getTextWidth(limpio(periodo)) + 12;
    doc.setFillColor('#2B7D95'); doc.roundedRect(W / 2 - pw / 2, 122, pw, 8, 4, 4, 'F');
    doc.setTextColor('#FFFFFF'); doc.text(limpio(periodo), W / 2, 127.3, { align: 'center' });

    const res = resumen(p, x, v);
    caja(M, 146, ancho, 44, '#FFFFFF', '#9FD3E0');
    titulo('En pocas palabras', M + 5, 154);
    let y = 161;
    res.forEach(([t, frase]) => {
      doc.setFillColor(MARCA); doc.circle(M + 7, y - 1.2, 1.1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(MARCA);
      const ini = doc.getTextWidth(limpio(t + ': '));
      doc.text(limpio(t + ':'), M + 10, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(TINTA);
      const lineas = doc.splitTextToSize(limpio(frase), ancho - 16 - ini);
      doc.text(lineas[0], M + 10 + ini, y);
      if (lineas.length > 1) { y += 4.6; doc.text(doc.splitTextToSize(limpio(lineas.slice(1).join(' ')), ancho - 16), M + 10, y); }
      y += 7.5;
    });

    titulo('Los 4 pasos de cada división', M, 199);
    const pasos = [
      ['1', '¿Por cuánto multiplico?', 'Buscar qué número por el divisor se acerca más sin pasarse.', '84 ÷ 4: ¿qué número por 4 se acerca a 8? 4 × 2 = 8, es el 2.', '#DDF6FB', '#22A6C2', '#159AB6'],
      ['2', 'Multiplicar', 'Multiplicar esa cifra por el divisor.', '2 × 4 = 8, se escribe debajo del 8.', '#EDE6FF', '#7B5BD6', '#6A45CF'],
      ['3', 'Restar', 'Restar para ver cuánto sobra.', '8 − 8 = 0.', '#FFE4E9', '#E0566F', '#D93A57'],
      ['4', 'Bajar la cifra', 'Bajar la siguiente cifra y volver a empezar.', 'Se baja el 4 y se sigue con 4 ÷ 4.', '#FFEBDD', '#E07A2F', '#D9651A']
    ];
    pasos.forEach((q, i) => {
      const px = M + (i % 2) * (mitad + 4), py = 204 + Math.floor(i / 2) * 36;
      caja(px, py, mitad, 32, q[4], q[5]);
      doc.setFillColor(q[6]); doc.circle(px + 7, py + 7.2, 3.4, 'F');
      doc.setTextColor('#FFFFFF'); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(q[0], px + 7, py + 8.7, { align: 'center' });
      doc.setTextColor(TINTA); doc.setFontSize(11); doc.text(q[1], px + 13, py + 8.8);
      const h = texto(q[2], px + 5, py + 16, mitad - 10, 9.5);
      texto(q[3], px + 5, py + 16 + h + 1, mitad - 10, 9, SUAVE, true);
    });
    texto('En los informes anteriores el paso 1 se llamaba "Cabe" o "Elegir la cifra". Ahora se llama "¿Por cuánto multiplico?" en todo el informe.', M, 280, ancho, 8.5, SUAVE);
    pie(1);

    // ----- página 2: gráficas con explicación -----
    doc.addPage(); fondo();
    titulo(`Cómo le va a ${p.nombre}, en números`, M, 17);
    const estrellasTot = A.ORDEN_NIVELES.reduce((t, id) => t + p.niveles[id].estrellas, 0);
    const cajas = [[String(estrellasTot), 'estrellas', '#FFF3C4', '#C98A00'], [String(x.divisiones), 'divisiones hechas', '#D6F7FB', '#0E8FA8'],
      [x.pctSin === null ? '-' : x.pctSin + ' %', 'sin errores', '#E9F9D0', '#4E8A0A'], [`${reloj.escalon} / 12`, 'escalón con reloj', '#FFE0F1', '#C2187F']];
    const cw = (ancho - 3 * 4) / 4;
    cajas.forEach((c, i) => {
      const cx = M + i * (cw + 4);
      caja(cx, 22, cw, 20, c[2], c[3]);
      doc.setTextColor(c[3]); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(c[0], cx + cw / 2, 32, { align: 'center' });
      doc.setTextColor(TINTA); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(c[1], cx + cw / 2, 38, { align: 'center' });
    });

    const ult = x.ult;
    caja(M, 47, ancho, 64, '#E2F4F8', '#9FD3E0');
    titulo(`Estrellas en las últimas ${ult.length || 0} rondas (de ${A.POR_RONDA * 3})`, M + 4, 54);
    if (ult.length >= 2) doc.addImage(grafLinea(ult.map(h => h.estrellas), ult.map(h => corta(h.fecha)), 520, 128, A.POR_RONDA * 3, 'estrellas'), 'PNG', M + 3, 57, ancho - 6, 42, undefined, 'FAST');
    else texto('Hace falta jugar al menos 2 rondas para ver la gráfica.', M + 4, 75, ancho - 8, 10, SUAVE);
    const maxE = ult.length ? Math.max(...ult.map(h => h.estrellas)) : 0;
    significa(ult.length >= 2
      ? `cada punto es una ronda sin reloj (abajo, la fecha); la altura son las estrellas, con un máximo de 39. Su mejor ronda tuvo ${maxE} estrellas y la última (punto rosa), ${ult[ult.length - 1].estrellas}.`
      : 'cada punto será una ronda sin reloj; la altura, las estrellas que consiguió (máximo 39).', M + 4, 104, ancho - 8);

    caja(M, 116, mitad, 72, '#FFE9EE', '#F3A7B6');
    titulo('Errores en cada paso', M + 4, 123);
    const colores = { cabe: '#22A6C4', mult: '#6A45CF', restar: '#FF4D6D', bajar: '#E0691F' };
    const etiquetas = { cabe: '¿Por cuánto\nmultiplico?', mult: 'Multipli-\ncar', restar: 'Restar', bajar: 'Bajar\nla cifra' };
    doc.addImage(grafBarras(A.TIPOS.map(t => [etiquetas[t], p.stats[t].e, colores[t]]), 250, 130, 0, 'errores'), 'PNG', M + 3, 126, mitad - 6, 40, undefined, 'FAST');
    significa(x.peor
      ? `cada barra cuenta sus errores en ese paso desde que empezó. La más alta, ${PASO[x.peor].nombre} (${p.stats[x.peor].e}), es lo que más le cuesta.${x.mejor ? ` ${PASO[x.mejor].nombre} es lo que mejor le sale.` : ''}`
      : 'cada barra cuenta sus errores en ese paso. Todavía no se equivocó en ninguno.', M + 4, 171, mitad - 8);
    caja(M + mitad + 4, 116, mitad, 72, '#F0E9FF', '#C9B3F5');
    titulo(`Errores en "${PASO[x.ev.tipo].nombre}" por semana`, M + mitad + 8, 123);
    doc.addImage(grafBarras(x.ev.semanas.map((s, i) => [s.etiqueta, s.valor, i === 3 ? '#6FA80F' : '#FF4FB8']), 250, 130, 0, 'errores'), 'PNG', M + mitad + 7, 126, mitad - 6, 40, undefined, 'FAST');
    const tendencia = x.esta < x.hace3 ? 'Va mejorando.' : x.esta > x.hace3 ? 'Esta semana le costó un poco más: es normal cuando las divisiones se hacen más difíciles.' : 'Se mantiene igual.';
    significa(`errores por semana en el paso que más le cuesta. "Esta" es la semana actual (en verde): ${x.esta}; hace 3 semanas: ${x.hace3}. ${tendencia}`, M + mitad + 8, 171, mitad - 8);

    caja(M, 193, ancho, 40, '#FFF6D8', '#F2D27A');
    titulo('Aciertos por tabla', M + 4, 200);
    muestras([['#C9F28A', '90 % o más'], ['#FFE38A', '80 a 89 %'], ['#FFB3C1', 'menos de 80 %'], ['#E4ECEE', 'sin datos']], M + 52, 199.5);
    const tw = (ancho - 8 - 7 * 3) / 8;
    for (let d = 2; d <= 9; d++) {
      const s = p.tablas[d], tx = M + 4 + (d - 2) * (tw + 3);
      const pct = s && s.i ? Math.round((1 - s.e / s.i) * 100) : null;
      doc.setFillColor(pct === null ? '#E4ECEE' : pct >= 90 ? '#C9F28A' : pct >= 80 ? '#FFE38A' : '#FFB3C1');
      doc.roundedRect(tx, 204, tw, 17, 2, 2, 'F');
      doc.setTextColor(TINTA); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(String(d), tx + tw / 2, 211, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(pct === null ? 'sin datos' : pct + ' %', tx + tw / 2, 218, { align: 'center' });
    }
    significa(`de cada 100 veces que usó esa tabla (al buscar por cuánto multiplicar o al multiplicar), cuántas acertó.${x.debil ? ` La del ${x.debil.d} es la que más le cuesta: falla ${100 - x.debil.pct} de cada 100.` : ' Ninguna tabla le cuesta especialmente.'}`, M + 4, 226, ancho - 8);

    caja(M, 238, ancho, 34, '#E2F4F8', '#9FD3E0');
    titulo('Medallas ganadas', M + 4, 245);
    const ganadas = A.MEDALLAS.filter(m => p.medallas[m.id]);
    texto(ganadas.length ? ganadas.map(m => `${m.texto} (${fecha(p.medallas[m.id])})`).join('   ·   ') : 'Todavía no ganó ninguna medalla.', M + 4, 252, ancho - 8, 10);
    pie(2);

    // ----- página 3: rondas, reloj y lo que ya hace bien -----
    doc.addPage(); fondo();
    caja(M, 12, mitad, 64, '#E9F9D0', '#A8DB6A');
    titulo('Mejor ronda por nivel', M + 4, 19);
    const colNivel = { facil: '#6FA80F', medio: '#0E8FA8', dificil: '#E0691F', avanzado: '#C2187F' };
    doc.addImage(grafBarras(A.ORDEN_NIVELES.map(id => [A.NIVELES[id].nombre, p.niveles[id].mejor, colNivel[id]]), 250, 140, A.POR_RONDA * 3, 'estrellas'), 'PNG', M + 3, 22, mitad - 6, 42, undefined, 'FAST');
    significa('estrellas de su mejor ronda sin reloj en cada nivel. El máximo es 39.', M + 4, 69, mitad - 8);
    caja(M + mitad + 4, 12, mitad, 64, '#FFE0F1', '#F5A6D2');
    titulo('Escalón con reloj por ronda', M + mitad + 8, 19);
    const rr = reloj.rondas.slice(0, 8).reverse();
    if (rr.length >= 2) doc.addImage(grafLinea(rr.map(h => h.escalonFinal), rr.map(h => corta(h.fecha)), 250, 140, 12, 'escalón'), 'PNG', M + mitad + 7, 22, mitad - 6, 42, undefined, 'FAST');
    else texto(rr.length ? `Jugó 1 ronda con reloj: escalón ${reloj.escalon}.` : 'Todavía no jugó con reloj.', M + mitad + 8, 36, mitad - 8, 10, SUAVE);
    significa('escalón al terminar cada ronda con reloj. 1 es el más fácil y 12 el más difícil.', M + mitad + 8, 69, mitad - 8);

    caja(M, 81, ancho, 70, '#E2F4F8', '#9FD3E0');
    titulo('Últimas rondas sin reloj', M + 4, 88);
    const cols = [M + 5, M + 38, M + 80, M + 125];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(MARCA);
    ['Fecha', 'Nivel', 'Sin errores', 'Estrellas'].forEach((t, i) => doc.text(t, cols[i], 95));
    doc.setDrawColor('#9FD3E0'); doc.line(M + 4, 97, W - M - 4, 97);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(TINTA);
    const filas = p.historial.slice(0, 8);
    if (!filas.length) doc.text('Todavía no terminó ninguna ronda sin reloj.', M + 5, 104);
    filas.forEach((h, i) => {
      const fy = 103 + i * 6;
      [fecha(h.fecha), A.NIVELES[h.nivel].nombre, `${h.bien} de ${A.POR_RONDA}`, `${h.estrellas} de ${A.POR_RONDA * 3}`].forEach((t, k) => doc.text(t, cols[k], fy));
      doc.setDrawColor('#CFE8EF'); doc.line(M + 4, fy + 2, W - M - 4, fy + 2);
    });

    caja(M, 156, ancho, 24, '#FFE0F1', '#F5A6D2');
    titulo('Modo con reloj', M + 4, 163);
    const escTexto = A.ESCALONES[reloj.escalon - 1].texto;
    texto(reloj.rondas.length
      ? `Escalón actual: ${reloj.escalon} de 12 (${escTexto}). Más alto: ${reloj.escalonMax}. Récord: ${reloj.record} puntos. Rondas jugadas: ${reloj.rondas.length}.`
      : 'Todavía no jugó con reloj. En este modo el juego elige la dificultad y el tiempo según su ritmo.', M + 4, 170, ancho - 8, 10);

    caja(M, 185, ancho, 58, '#E9F9D0', '#8CC63F');
    titulo('Lo que ya hace bien', M + 4, 193, '#3E7D12');
    y = 201;
    fortalezas(p, x).forEach(f => {
      doc.setFillColor('#4E8A0A'); doc.circle(M + 6.5, y - 1.2, 1.1, 'F');
      y += texto(f, M + 10, y, ancho - 16, 10) + 3;
    });

    caja(M, 248, ancho, 34, '#FFF3C4', '#E0B000');
    titulo(`Un mensaje para leer con ${p.nombre}`, M + 4, 256, '#8A5A00');
    texto(mensaje(p, x, v), M + 4, 264, ancho - 8, 11);
    pie(3);

    // ----- página 4: consejos -----
    doc.addPage(); fondo();
    titulo('Consejos para practicar en casa', M, 18);
    texto(`Pensados para ${p.nombre} a partir de ${x.divisiones} ${x.divisiones === 1 ? 'división' : 'divisiones'}. Van ordenados por importancia.`, M, 24, ancho, 9.5, SUAVE);
    const prioridad = [['Lo más importante', '#D93A57'], ['Importante', '#D9651A'], ['Para seguir avanzando', '#3E9B2F'], ['Para seguir avanzando', '#3E9B2F']];
    y = 30;
    const col = (ancho - 8 - 2 * 3) / 3;
    consejos(p, x, v).forEach((c, i) => {
      // Alto de la tarjeta según el texto más largo de sus 3 columnas
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      const partes = [['Qué vimos', c.vimos], ['Qué hacer en casa', c.casa], ['Cómo saber que mejora', c.mejora]].map(([e, t]) => [e, doc.splitTextToSize(limpio(t), col - 6)]);
      const alto = 22 + Math.max(...partes.map(q => q[1].length)) * 4.1;
      if (y + alto > 282) return;
      caja(M, y, ancho, alto, '#F4EFFF', '#B9A6F0');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(MARCA);
      const t = `${i + 1}. ${c.titulo}`;
      doc.text(limpio(t), M + 4, y + 7.5);
      const [pr, prColor] = prioridad[i];
      doc.setFontSize(7.5);
      const ex = M + 4 + (doc.setFontSize(12), doc.getTextWidth(limpio(t))) + 4;
      doc.setFontSize(7.5);
      const prw = doc.getTextWidth(pr.toUpperCase()) + 6;
      doc.setFillColor(prColor); doc.roundedRect(ex, y + 3.6, prw, 5, 2.5, 2.5, 'F');
      doc.setTextColor('#FFFFFF'); doc.text(pr.toUpperCase(), ex + 3, y + 7.1);
      partes.forEach(([e, lineas], k) => {
        const px = M + 4 + k * (col + 3);
        doc.setFillColor('#FFFFFF'); doc.roundedRect(px, y + 11, col, alto - 14, 2, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor('#6A45CF'); doc.text(e.toUpperCase(), px + 3, y + 16);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(TINTA); doc.text(lineas, px + 3, y + 21);
      });
      y += alto + 5;
    });
    // Plan de la semana hecho con sus puntos débiles
    const plan = planSemana(p, x);
    const altoPlan = 14 + plan.length * 7;
    if (y + altoPlan <= 282) {
      caja(M, y, ancho, altoPlan, '#FFFFFF', '#9FD3E0');
      titulo('Plan para esta semana (unos 10 minutos al día)', M + 4, y + 7.5);
      plan.forEach(([dia, que], i) => {
        const fy = y + 15 + i * 7;
        if (i % 2 === 0) { doc.setFillColor('#EEF8FB'); doc.rect(M + 2, fy - 4.6, ancho - 4, 7, 'F'); }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(MARCA); doc.text(dia, M + 5, fy);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(TINTA); doc.text(doc.splitTextToSize(limpio(que), ancho - 40)[0], M + 36, fy);
      });
      y += altoPlan + 5;
    }
    if (y < 262) {
      caja(M, y, ancho, 20, '#E2F4F8', '#9FD3E0');
      texto(v(['Un truco: pregúntenle cómo resolvió una división del juego. Explicarlo en voz alta es una de las mejores formas de aprender.',
        'Celebren los avances, aunque sean pequeños: una división sin errores o una tabla que pasa a verde. Las ganas de seguir importan tanto como la práctica.'], 8), M + 4, y + 8, ancho - 8, 10);
    }
    pie(4);
    return doc;
  }


  // ---------- guardar según dónde corre el juego ----------
  async function guardar(p) {
    const doc = crear(p);
    const nombre = `Informe de ${p.nombre.replace(/[\\/:*?"<>|]/g, '')} ${A.hoy()}.pdf`;
    // Aplicación de Windows
    if (global.escritorio && global.escritorio.guardarPDF) {
      const ruta = await global.escritorio.guardarPDF(nombre, doc.output('arraybuffer'));
      return ruta ? { ok: true, texto: 'Informe guardado y abierto.' } : { ok: false, texto: 'No se guardó el informe.' };
    }
    // Aplicación de Android
    const cap = global.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
      const { Filesystem, Share } = cap.Plugins;
      const datos = doc.output('datauristring').split(',')[1];
      let archivo;
      try { archivo = await Filesystem.writeFile({ path: nombre, data: datos, directory: 'DOCUMENTS', recursive: true }); }
      catch (e) { archivo = await Filesystem.writeFile({ path: nombre, data: datos, directory: 'CACHE' }); }
      try { await Share.share({ title: nombre, text: `Informe de progreso de ${p.nombre}`, url: archivo.uri, dialogTitle: 'Compartir informe' }); } catch (e) { /* el alumno cerró la ventana de compartir */ }
      return { ok: true, texto: 'Informe guardado en Documentos.' };
    }
    // Navegador (pruebas)
    doc.save(nombre);
    return { ok: true, texto: 'Informe descargado.' };
  }

  global.Informe = { crear, guardar, consejos };
})(window);
