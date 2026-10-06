// Motor de la división larga (método de la galera): calcula todas las casillas,
// el orden en que el alumno las rellena y los pasos que usa el modo enseñar.
(function (global) {
  'use strict';

  function cifras(n) { return String(n).split('').map(Number); }
  function valor(lista) { return lista.reduce((a, c) => a * 10 + c, 0); }
  function formatear(n) { return String(n).replace('.', ','); }

  // Préstamos necesarios al restar a − b (columna a columna)
  function contarPrestamos(a, b) {
    let prestamos = 0, llevo = 0;
    const ca = cifras(a).reverse(), cb = cifras(b).reverse();
    for (let i = 0; i < ca.length; i++) {
      const arriba = ca[i] - llevo, abajo = cb[i] || 0;
      if (arriba < abajo) { prestamos++; llevo = 1; } else llevo = 0;
    }
    return prestamos;
  }

  // Llevadas al multiplicar el divisor por una cifra del cociente
  function contarLlevadas(divisor, q) {
    let llevadas = 0, llevo = 0;
    for (const c of cifras(divisor).reverse()) {
      const r = c * q + llevo;
      llevo = Math.floor(r / 10);
      if (llevo > 0) llevadas++;
    }
    return llevadas;
  }

  function crearDivision(dividendo, divisor, decimales) {
    decimales = decimales || 0;
    const dig = cifras(dividendo);
    const n = dig.length;
    const todas = dig.concat(new Array(decimales).fill(0));
    const celdas = [], menos = [], lineas = [], pasos = [];
    let orden = 0;
    const agregar = (c) => { celdas.push(c); return c; };

    // Datos del enunciado
    dig.forEach((v, i) => agregar({ id: 'd' + i, zona: 'div', fila: 1, col: i, valor: v, tipo: 'dato', orden: 0 }));
    cifras(divisor).forEach((v, i) => agregar({ id: 'v' + i, zona: 'coc', fila: 1, col: i, valor: v, tipo: 'dato', orden: 0 }));

    // Primer grupo de cifras en el que cabe el divisor
    let L = 1;
    while (valor(dig.slice(0, L)) < divisor) L++;
    let p = valor(dig.slice(0, L));
    const largoDivisor = String(divisor).length;
    const primeros = valor(dig.slice(0, Math.min(largoDivisor, n)));
    let textoInicio;
    // Los textos hablan de multiplicar (no de «cabe»): así lo pidió el usuario
    if (L === 1) textoInicio = `Empezamos por la primera cifra: el ${p}, porque ${divisor} × 1 = ${divisor} no se pasa del ${p}.`;
    else if (L > largoDivisor) textoInicio = `Con el ${primeros} no alcanza: ${divisor} × 1 = ${divisor} ya es más que ${primeros}. Tomamos ${L} cifras: el ${p}.`;
    else textoInicio = `Tomamos las primeras ${L} cifras: el ${p}, porque ${divisor} × 1 = ${divisor} no se pasa del ${p}.`;
    pasos.push({ tipo: 'empezar', texto: textoInicio, revela: [], resaltar: dig.slice(0, L).map((_, i) => 'd' + i), tabla: [], no: [] });

    const enteras = n - L + 1;
    let fin = L - 1, filaParcial = 1, inicioParcial = 0, fila = 1, resto = 0;
    const rasgos = { prestamos: 0, llevadas: 0, cabeDificil: 0, ceros: 0, bajadas: 0, casillas: 0 };
    const cociente = [];

    while (true) {
      const q = Math.floor(p / divisor);
      const qCol = fin - (L - 1);
      cociente.push(q);
      const ciclo = { p, q, prod: q * divisor, resto: p - q * divisor, divisor, dividendo };
      const cCoc = agregar({ id: 'q' + qCol, zona: 'coc', fila: 2, col: qCol, valor: q, tipo: 'cabe', orden: ++orden, coma: decimales > 0 && qCol === enteras, ciclo });
      if (q === 0) {
        rasgos.ceros++;
        pasos.push({ tipo: 'cabe', texto: `¿Qué número por ${divisor} se acerca a ${p} sin pasarse? ${divisor} × 1 = ${divisor} ya es más que ${p}, así que escribimos 0 en el cociente.`, revela: [cCoc.orden], tabla: [], no: [divisor] });
      } else {
        const sig = (q + 1) * divisor;
        const texto = `¿Qué número por ${divisor} se acerca a ${p} sin pasarse? ${divisor} × ${q} = ${q * divisor}` +
          (q < 9 ? ` y ${divisor} × ${q + 1} = ${sig} se pasa` : '') + `. Escribe ${q}.`;
        pasos.push({ tipo: 'cabe', texto, revela: [cCoc.orden], tabla: [q * divisor], no: q < 9 ? [sig] : [] });
        // Estimar con la primera cifra engaña: cuesta más saber cuántas veces cabe
        const estimado = Math.floor(Number(String(p).slice(0, String(p).length - largoDivisor + 1)) / Number(String(divisor)[0]));
        if (q >= 6 || (largoDivisor > 1 && Math.min(estimado, 9) !== q)) rasgos.cabeDificil++;
      }

      if (q > 0) {
        const prod = q * divisor;
        rasgos.llevadas += contarLlevadas(divisor, q);
        const filaProd = fila + 1;
        const cp = cifras(prod);
        const ordenesProd = [];
        for (let i = cp.length - 1; i >= 0; i--) {
          const c = agregar({ id: `m${filaProd}_${i}`, zona: 'div', fila: filaProd, col: fin - (cp.length - 1 - i), valor: cp[i], tipo: 'mult', orden: ++orden, ciclo });
          ordenesProd.push(c.orden);
        }
        const inicio = Math.min(inicioParcial, fin - cp.length + 1);
        menos.push({ fila: filaProd, col: inicio - 1 });
        lineas.push({ fila: filaProd, desde: inicio - 1, hasta: fin });
        pasos.push({ tipo: 'mult', texto: `Multiplica ${q} × ${divisor} = ${prod} y escríbelo debajo del ${p}.`, revela: ordenesProd, tabla: [prod], no: [] });

        resto = p - prod;
        rasgos.prestamos += contarPrestamos(p, prod);
        const filaResto = filaProd + 1;
        const cr = cifras(resto);
        const ordenesResto = [];
        for (let i = cr.length - 1; i >= 0; i--) {
          const c = agregar({ id: `r${filaResto}_${i}`, zona: 'div', fila: filaResto, col: fin - (cr.length - 1 - i), valor: cr[i], tipo: 'restar', orden: ++orden, ciclo });
          ordenesResto.push(c.orden);
        }
        pasos.push({ tipo: 'restar', texto: `Resta: ${p} − ${prod} = ${resto}.`, revela: ordenesResto, tabla: [], no: [] });
        fila = filaResto;
        filaParcial = filaResto;
        inicioParcial = fin - cr.length + 1;
      } else {
        resto = p;
      }

      if (fin + 1 >= todas.length) break;
      const col = fin + 1;
      const d = todas[col];
      const nuevo = resto * 10 + d;
      const decimal = col >= n;
      const cB = agregar({ id: `b${filaParcial}_${col}`, zona: 'div', fila: filaParcial, col, valor: d, tipo: 'bajar', orden: ++orden, decimal, ciclo: { ...ciclo, resto, bajada: d, nuevo, decimal } });
      rasgos.bajadas++;
      pasos.push({
        tipo: 'bajar',
        texto: decimal
          ? `Ya no quedan cifras por bajar. Ponemos la coma en el cociente y agregamos un 0 al ${resto}: ahora tenemos ${nuevo}.`
          : `Baja el ${d}. Ahora tenemos ${nuevo}.`,
        revela: [cB.orden], resaltar: decimal ? [] : ['d' + col], tabla: [], no: []
      });
      p = nuevo;
      fin = col;
    }

    const valorCociente = decimales > 0
      ? Number(cociente.slice(0, enteras).join('') + '.' + cociente.slice(enteras).join(''))
      : valor(cociente);
    const textoCociente = formatear(valorCociente.toFixed(decimales));
    const comprobacion = decimales > 0
      ? (resto === 0 ? `Comprobación: ${textoCociente} × ${divisor} = ${dividendo} ✓` : `Comprobación: ${textoCociente} × ${divisor} + resto ≈ ${dividendo}`)
      : (resto === 0 ? `Comprobación: ${valorCociente} × ${divisor} = ${dividendo} ✓` : `Comprobación: ${valorCociente} × ${divisor} + ${resto} = ${dividendo} ✓`);
    pasos.push({ tipo: 'fin', texto: resto === 0 ? `¡Terminamos! ${dividendo} ÷ ${divisor} = ${textoCociente} y no sobra nada.` : `Ya no quedan cifras: ${resto} es el resto. ${dividendo} ÷ ${divisor} = ${textoCociente} y sobran ${resto}.`, revela: [], tabla: [], no: [], final: true });

    const entradas = celdas.filter(c => c.orden > 0);
    rasgos.casillas = entradas.length;
    const filas = Math.max(...celdas.map(c => c.fila));
    const columnasCociente = Math.max(largoDivisor, cociente.length);

    return {
      dividendo, divisor, decimales, celdas, menos, lineas, pasos, filas,
      columnasDividendo: todas.length, columnasCociente,
      total: orden, cociente: valorCociente, textoCociente, resto, comprobacion, rasgos,
      clave: `${dividendo}/${divisor}`
    };
  }

  // Comprueba que el procedimiento reconstruye bien la división (lo usan las pruebas)
  function verificar(div) {
    const coc = div.celdas.filter(c => c.tipo === 'cabe').sort((a, b) => a.col - b.col).map(c => c.valor);
    const enteras = coc.length - div.decimales;
    const texto = div.decimales ? coc.slice(0, enteras).join('') + '.' + coc.slice(enteras).join('') : coc.join('');
    const escala = Math.pow(10, div.decimales);
    const esperadoQ = Math.floor(div.dividendo * escala / div.divisor) / escala;
    const esperadoR = (div.dividendo * escala) % div.divisor;
    return Math.abs(Number(texto) - esperadoQ) < 1e-9 && div.resto === esperadoR && enteras >= 1;
  }

  global.Division = { crearDivision, verificar, contarPrestamos, contarLlevadas, formatear };
  if (typeof module !== 'undefined') module.exports = global.Division;
})(typeof window !== 'undefined' ? window : globalThis);
