// Simula alumnos con distintas dificultades jugando rondas completas y mide
// si el juego aprende de cada uno y crea problemas nuevos. Uso: node pruebas/probar-aprendizaje.js
const Division = require('../juego/codigo/division.js');
const A = require('../juego/codigo/aprendizaje.js');

const ALUMNOS = {
  Ana: { nivel: 'medio', texto: 'se equivoca en las restas en las que hay que pedir prestado',
    falla: (c, div) => c.tipo === 'restar' && Division.contarPrestamos(c.ciclo.p, c.ciclo.prod) > 0 },
  Luis: { nivel: 'facil', texto: 'no se sabe la tabla del 7',
    falla: (c, div) => div.divisor === 7 && (c.tipo === 'cabe' || c.tipo === 'mult') },
  Eva: { nivel: 'medio', texto: 'no se equivoca nunca', falla: () => false }
};

function jugarRonda(perfil, alumno, nivel) {
  const ronda = { nivel, resultados: [], problemas: [] };
  let parecida = null;
  for (let i = 0; i < A.POR_RONDA; i++) {
    const g = A.elegirProblema(perfil, nivel, parecida ? { divisor: parecida } : {});
    parecida = null;
    const div = Division.crearDivision(g.dividendo, g.divisor, g.decimales);
    const r = { errores: 0, ayuda: false, ensenada: false, fallos: { cabe: 0, mult: 0, restar: 0, bajar: 0 } };
    for (const c of div.celdas.filter(x => x.orden > 0).sort((a, b) => a.orden - b.orden)) {
      if (alumno.falla(c, div) && Math.random() < 0.7) {
        A.registrarPaso(perfil, c.tipo, false, div.divisor);
        r.errores++; r.fallos[c.tipo]++;
        if (r.errores > A.ERRORES_PARA_ENSENAR) { r.ensenada = true; break; }
      }
      A.registrarPaso(perfil, c.tipo, true, div.divisor);
    }
    if (r.ensenada) parecida = div.divisor;
    r.estrellas = A.terminarDivision(perfil, nivel, r, div.clave);
    ronda.resultados.push(r);
    ronda.problemas.push({ div, motivo: g.motivo });
  }
  return { ronda, resumen: A.terminarRonda(perfil, ronda) };
}

const pct = (n, t) => Math.round(n / t * 100) + ' %';
for (const [nombre, alumno] of Object.entries(ALUMNOS)) {
  console.log(`\n${nombre} (${alumno.texto}), nivel ${A.NIVELES[alumno.nivel].nombre}`);
  const perfil = A.nuevoPerfil(nombre, 0);
  const todos = new Set();
  let repetidos = 0;
  for (let k = 1; k <= 3; k++) {
    const { ronda, resumen } = jugarRonda(perfil, alumno, alumno.nivel);
    const probs = ronda.problemas;
    probs.forEach(p => { if (todos.has(p.div.clave)) repetidos++; todos.add(p.div.clave); });
    const conPrestamo = probs.filter(p => p.div.rasgos.prestamos > 0).length;
    const entre7 = probs.filter(p => p.div.divisor === 7).length;
    const casillas = (probs.reduce((s, p) => s + p.div.rasgos.casillas, 0) / probs.length).toFixed(1);
    const motivo = probs.map(p => p.motivo).filter(Boolean)[0] || '(sin enfoque todavía)';
    console.log(`  Ronda ${k}: ${probs.slice(0, 5).map(p => `${p.div.dividendo}÷${p.div.divisor}`).join(', ')}…`);
    console.log(`     con préstamo ${pct(conPrestamo, probs.length)} · entre 7: ${pct(entre7, probs.length)} · casillas por división ${casillas} · estrellas ${resumen.estrellas}/39 · enseñadas ${resumen.ensenadas}`);
    console.log(`     enfoque: ${motivo} · recomienda: ${A.NIVELES[resumen.recomendado].nombre}`);
  }
  console.log(`  Problemas distintos: ${todos.size} de ${3 * A.POR_RONDA} (repetidos: ${repetidos})`);
}
