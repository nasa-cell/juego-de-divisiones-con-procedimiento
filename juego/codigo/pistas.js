// Pistas de cada casilla: qué hacer (sin dar la respuesta), por qué no vale un número
// equivocado y la ayuda paso a paso. Todo se calcula con los números de la división en juego,
// y cada pista tiene varias formas de decirse para que no salga siempre la misma frase.
(function (global) {
  'use strict';

  const cifras = n => String(n).split('').map(Number);

  // Cambia en cada división nueva: así la misma casilla no se explica siempre igual,
  // pero dentro de una división la pista no cambia cada vez que se redibuja la pantalla
  let semilla = 0;
  function nuevaDivision(valor) { semilla = valor !== undefined ? valor : Math.floor(Math.random() * 1000); }
  const elegir = (formas, c, extra) => formas[(semilla + c.orden * 7 + (extra || 0)) % formas.length];

  // Posición de la casilla contando desde la derecha dentro de su fila (0 = la de más a la derecha)
  function posicion(div, c) {
    return div.celdas.filter(x => x.fila === c.fila && x.tipo === c.tipo && x.orden > 0 && x.orden < c.orden).length;
  }

  // Cuentas de la multiplicación cifra a cifra, de derecha a izquierda, con lo que se lleva
  function cuentasMult(q, divisor) {
    const dd = cifras(divisor).reverse();
    const pasos = [];
    let llevo = 0;
    dd.forEach(d => {
      const r = d * q + llevo;
      pasos.push({ cifra: d, llevaba: llevo, parcial: d * q, total: r, escribe: r % 10, lleva: Math.floor(r / 10) });
      llevo = Math.floor(r / 10);
    });
    return { pasos, final: llevo };
  }

  // Cuentas de la resta columna a columna, de derecha a izquierda, con los préstamos.
  // Un 0 que tiene que prestar pide antes a su izquierda y se queda en 9.
  function cuentasResta(a, b) {
    const pa = cifras(a).reverse(), pb = cifras(b).reverse();
    const pasos = [];
    let presto = 0;
    pa.forEach((arriba, i) => {
      const abajo = pb[i] || 0;
      const vale = arriba - presto;
      const pide = vale < abajo;
      const usa = pide ? vale + 10 : vale;
      pasos.push({ arriba, abajo, presto, vale, pide, usa, resultado: usa - abajo, ceroPresto: presto === 1 && arriba === 0 });
      presto = pide ? 1 : 0;
    });
    return pasos;
  }

  // Casillas del número en el que hay que ver cuántas veces cabe el divisor
  function casillasDe(div, c) {
    const p = c.ciclo.p, largo = String(p).length;
    const bajada = div.celdas.find(x => x.orden === c.orden - 1 && x.tipo === 'bajar');
    const fila = bajada ? bajada.fila : 1, fin = bajada ? bajada.col : largo - 1;
    return div.celdas.filter(x => x.zona === 'div' && x.fila === fila && x.col > fin - largo && x.col <= fin).map(x => x.id);
  }

  const idsDivisor = div => div.celdas.filter(x => x.zona === 'coc' && x.fila === 1).map(x => x.id);
  const llevabas = n => n === 1 ? 'el 1 que llevabas' : `los ${n} que llevabas`;

  function pista(div, c) {
    const z = c.ciclo, d = div.divisor;

    if (c.tipo === 'cabe') {
      const luz = casillasDe(div, c), luz2 = idsDivisor(div);
      if (z.q === 0) {
        return {
          pista: elegir([
            `¿Qué número por ${d} se acerca a ${z.p} sin pasarse? Si ${d} × 1 ya es más que ${z.p}, el número es 0.`,
            `Compara el ${z.p} con el ${d}. Si el ${d} es más grande, ${d} × 1 ya se pasa.`,
            `Mira bien: ¿${d} × 1 se pasa del ${z.p}?`
          ], c),
          ayuda: `${d} × 1 = ${d}, que ya es más que ${z.p}. Escribe 0.`, fichas: [{ texto: `${d} × 1 = ${d}`, ok: false }], luz, luz2
        };
      }
      let texto;
      const largo = String(d).length;
      if (largo > 1) {
        // Truco para divisores de varias cifras: comparar solo las primeras cifras
        const primera = Number(String(d)[0]), delante = Math.floor(z.p / Math.pow(10, largo - 1));
        const prueba = Math.max(1, Math.min(9, Math.floor(delante / primera)));
        texto = elegir([
          `¿Qué número por ${d} se acerca a ${z.p} sin pasarse? Truco: tapa las últimas cifras. ¿Qué número por ${primera} se acerca a ${delante}? Empieza probando con ${d} × ${prueba}.`,
          `Para no probar a ciegas, mira solo el principio: el ${primera} del ${d} y el ${delante} del ${z.p}. Prueba con ${d} × ${prueba} y ajusta si te pasas.`,
          `Busca por cuánto multiplicar el ${d} para acercarte al ${z.p}. Una buena primera prueba es ${d} × ${prueba}: si se pasa, baja uno.`
        ], c);
      } else {
        texto = elegir([
          `¿Qué número por ${d} se acerca a ${z.p} sin pasarse? Busca el más grande que, multiplicado por ${d}, no se pase de ${z.p}.`,
          `Recorre la tabla del ${d}: ¿hasta dónde puedes llegar sin pasarte del ${z.p}?`,
          `Piensa: ${d} por… ¿cuánto se acerca más al ${z.p} sin pasarse?`,
          `¿Por cuánto multiplicas el ${d} para acercarte al ${z.p}? Cuenta de ${d} en ${d} hasta que te pases.`
        ], c);
      }
      const fichas = [];
      for (let i = 1; i <= Math.min(9, z.q + 1); i++) fichas.push({ texto: `${d} × ${i} = ${d * i}`, ok: d * i <= z.p });
      return { pista: texto, ayuda: z.q < 9 ? `Vamos probando. El último que no se pasa del ${z.p} es la respuesta.` : `Vamos probando: ninguno se pasa del ${z.p}, así que es el 9.`, fichas, luz, luz2 };
    }

    if (c.tipo === 'mult') {
      const k = posicion(div, c), m = cuentasMult(z.q, d);
      const coc = div.celdas.find(x => x.tipo === 'cabe' && x.ciclo === z);
      const luz = coc ? [coc.id] : [];
      const cifrasDivisor = String(d).length;
      if (k >= m.pasos.length) {
        return {
          pista: elegir([
            `Ya multiplicaste todas las cifras del ${d}. En esta casilla va lo que te llevabas de la última cuenta.`,
            `No queda ninguna cifra del ${d} por multiplicar. ¿Te llevabas algo? Escríbelo aquí.`,
            `Última casilla: aquí se escribe lo que te sobró de la cuenta anterior.`
          ], c),
          ayuda: `Te llevabas ${m.final}: escribe ${m.final}.`, luz, luz2: []
        };
      }
      const s = m.pasos[k];
      const luz2 = ['v' + (cifrasDivisor - 1 - k)];
      const cuenta = `${z.q} × ${s.cifra}`;
      let texto;
      if (cifrasDivisor === 1) {
        texto = elegir([`Multiplica ${cuenta}.`, `¿Cuánto es ${cuenta}?`, `Ahora toca multiplicar: ${cuenta}.`], c) +
          (s.total >= 10 ? elegir([' Da un número de 2 cifras: escribe primero la de la derecha.', ' Sale de 2 cifras: aquí va la de las unidades.'], c) : '');
      } else if (k === 0) {
        texto = elegir([
          `Multiplica el ${z.q} por cada cifra del ${d}, empezando por la derecha. Ahora: ${cuenta}.`,
          `Toca ${z.q} × ${d}, pero cifra a cifra y de derecha a izquierda. Empieza con ${cuenta}.`,
          `Empieza por la cifra de la derecha del ${d}: ${cuenta}.`
        ], c);
      } else if (s.llevaba) {
        texto = elegir([
          `Ahora ${cuenta}, y súmale ${llevabas(s.llevaba)}.`,
          `Sigue con ${cuenta}. ¡No te olvides de sumar ${llevabas(s.llevaba)}!`,
          `Siguiente cifra: ${cuenta}, más ${llevabas(s.llevaba)}.`
        ], c);
      } else {
        texto = elegir([`Ahora ${cuenta}. Esta vez no llevabas nada.`, `Sigue con ${cuenta}; de antes no te llevabas nada.`, `Siguiente cifra: ${cuenta}.`], c);
      }
      let ayuda = `${cuenta} = ${s.parcial}` + (s.llevaba ? `, + ${s.llevaba} = ${s.total}` : '') + ` → escribe ${s.escribe}`;
      if (s.lleva && k < m.pasos.length - 1) ayuda += `, llevas ${s.lleva}.`;
      else if (s.lleva) ayuda += `. El ${s.lleva} que sobra va en la casilla de la izquierda.`;
      else ayuda += '.';
      return { pista: texto, ayuda, luz, luz2 };
    }

    if (c.tipo === 'restar') {
      const k = posicion(div, c), s = cuentasResta(z.p, z.prod)[k];
      const arriba = div.celdas.find(x => x.col === c.col && x.fila === c.fila - 2);
      const abajo = div.celdas.find(x => x.col === c.col && x.fila === c.fila - 1);
      const luz = arriba ? [arriba.id] : [], luz2 = abajo ? [abajo.id] : [];
      let antes = '';
      if (s.ceroPresto) antes = 'El 0 no tenía nada que prestar: pidió 1 a la cifra de su izquierda y, después de prestar, se quedó en 9. ';
      else if (s.presto) antes = `El ${s.arriba} prestó 1: ahora vale ${s.vale}. `;
      let texto;
      if (k === 0) {
        texto = elegir([
          `Resta columna por columna, empezando por la derecha. Ahora: ${s.vale} − ${s.abajo}.`,
          `Toca restar ${z.p} − ${z.prod}, cifra a cifra desde la derecha. Primera columna: ${s.vale} − ${s.abajo}.`,
          `Empieza por la columna de la derecha: ${s.vale} − ${s.abajo}.`
        ], c);
      } else {
        const vale = s.ceroPresto ? 9 : s.vale;
        texto = antes + elegir([`Ahora: ${vale} − ${s.abajo}.`, `Siguiente columna: ${vale} − ${s.abajo}.`, `Sigue a la izquierda: ${vale} − ${s.abajo}.`], c);
      }
      if (s.pide && !s.ceroPresto) {
        texto += elegir([` ¡Ojo! El ${s.vale} es más pequeño que el ${s.abajo}.`, ` Cuidado: al ${s.vale} no le alcanza para quitar ${s.abajo}.`, ` Fíjate: arriba hay menos que abajo.`], c);
      }
      const ayuda = s.pide && !s.ceroPresto
        ? `${s.vale} no alcanza para quitar ${s.abajo}: pide 1 prestado a la cifra de la izquierda y el ${s.vale} se convierte en ${s.usa}. ${s.usa} − ${s.abajo} = ${s.resultado}.`
        : `${s.usa} − ${s.abajo} = ${s.resultado}.`;
      return { pista: texto, ayuda, luz, luz2 };
    }

    if (z.decimal) {
      return {
        pista: elegir([
          `Se acabaron las cifras del ${div.dividendo}, pero sobra ${z.resto}. Pon la coma en el cociente y baja un 0.`,
          `Ya no quedan cifras por bajar y todavía sobra ${z.resto}. Para seguir con decimales, ¿qué se baja?`,
          `Sobra ${z.resto} y no quedan cifras: toca empezar los decimales.`
        ], c),
        ayuda: `Baja un 0: ahora tienes ${z.nuevo}.`, luz: [], luz2: []
      };
    }
    const dig = cifras(div.dividendo), usadas = dig.slice(0, c.col);
    const lista = usadas.length === 1 ? `el ${usadas[0]}` : usadas.slice(0, -1).map(v => `el ${v}`).join(', ') + ` y el ${usadas[usadas.length - 1]}`;
    const sobro = z.resto === 0 ? 'al lado del 0 (esta vez no sobró nada)' : `al lado del ${z.resto} que te sobró`;
    return {
      pista: elegir([
        `Ya usaste ${lista}. Baja la siguiente cifra del ${div.dividendo} y ponla ${sobro}.`,
        `Mira el ${div.dividendo}: ¿qué cifra viene después del ${usadas[usadas.length - 1]}? Bájala ${sobro}.`,
        `Toca bajar. Busca en el ${div.dividendo} la cifra que todavía no usaste, justo a la derecha, y ponla ${sobro}.`
      ], c),
      ayuda: `Baja el ${z.bajada}. Junto al ${z.resto} que sobró, ahora tienes ${z.nuevo}.`, luz: ['d' + c.col], luz2: []
    };
  }

  // Explica por qué el número n no vale en la casilla c (sin dar la respuesta)
  function porQue(div, c, n) {
    const z = c.ciclo, d = div.divisor;
    if (c.tipo === 'cabe') {
      if (n > z.q) return elegir([`${d} × ${n} = ${d * n}, y ${d * n} es más que ${z.p}: te pasaste. Prueba con uno más pequeño.`, `Con ${n} te pasas: ${d} × ${n} = ${d * n}, más que ${z.p}. Baja un poco.`], c, n);
      if (n === 0) return `No es 0: ${d} × 1 = ${d} no se pasa del ${z.p}.`;
      return elegir([`${d} × ${n} = ${d * n}, pero ${d} × ${n + 1} = ${d * (n + 1)} tampoco se pasa del ${z.p}. Prueba uno más.`, `Te quedaste corto: con ${n} solo llegas a ${d * n}, y ${d} × ${n + 1} todavía no se pasa del ${z.p}.`], c, n);
    }
    if (c.tipo === 'mult') {
      const k = posicion(div, c), m = cuentasMult(z.q, d);
      if (k >= m.pasos.length) return 'Aquí va lo que te llevabas de la última cuenta, no otra multiplicación.';
      const s = m.pasos[k];
      if (s.total >= 10 && n === s.lleva && n !== s.escribe) return `El ${n} es lo que te llevas. En esta casilla va la cifra de la derecha de ${s.total}.`;
      if (s.llevaba && n === s.parcial % 10) return `Te faltó sumar ${llevabas(s.llevaba)}.`;
      return elegir([`${z.q} × ${s.cifra}${s.llevaba ? ` + ${s.llevaba}` : ''} no termina en ${n}. Repasa la cuenta o pulsa Ayuda.`, `Revisa ${z.q} × ${s.cifra}${s.llevaba ? ` y súmale ${s.llevaba}` : ''}: no da un número que acabe en ${n}.`], c, n);
    }
    if (c.tipo === 'restar') {
      const k = posicion(div, c), s = cuentasResta(z.p, z.prod)[k];
      if (s.pide && !s.ceroPresto && n === s.abajo - s.vale) return `Restaste al revés (${s.abajo} − ${s.vale}). Arriba está el ${s.vale}, que es más pequeño: tiene que pedir prestado.`;
      const sinPrestamo = (s.arriba < s.abajo ? s.arriba + 10 : s.arriba) - s.abajo;
      if (s.presto && n === sinPrestamo && n !== s.resultado) {
        return s.ceroPresto ? 'Te olvidaste del préstamo: ese 0 tuvo que pedir prestado y ahora vale 9.' : `Te olvidaste del préstamo: el ${s.arriba} le prestó 1 a la columna de la derecha, así que ahora vale ${s.vale}.`;
      }
      if (s.resultado === 0) return `Si a ${s.usa} le quitas ${s.abajo}, no queda nada.`;
      return elegir([`${s.usa} − ${s.abajo} no es ${n}. Cuenta desde el ${s.abajo} hasta el ${s.usa}.`, `Revisa: ¿cuánto le falta al ${s.abajo} para llegar al ${s.usa}? No es ${n}.`], c, n);
    }
    if (z.decimal) return 'Cuando se acaban las cifras, se baja siempre un 0.';
    const dig = cifras(div.dividendo);
    if (dig.slice(c.col + 1).includes(n)) return `El ${n} va después. Hay que bajar las cifras en orden: primero la que está justo a la derecha del ${dig[c.col - 1]}.`;
    return `Esa no es la siguiente cifra del ${div.dividendo}. Busca la que está justo a la derecha del ${dig[c.col - 1]}.`;
  }

  global.Pistas = { pista, porQue, nuevaDivision, cuentasMult, cuentasResta };
  if (typeof module !== 'undefined') module.exports = global.Pistas;
})(typeof window !== 'undefined' ? window : globalThis);
