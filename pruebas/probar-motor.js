// Pruebas del motor de división y del aprendizaje. Uso: npm run pruebas
const Division = require('../juego/codigo/division.js');
const A = require('../juego/codigo/aprendizaje.js');

let fallos = 0;
function comprobar(cond, texto) {
  console.log((cond ? '  OK   ' : '  FALLO ') + texto);
  if (!cond) fallos++;
}

console.log('\n1. Procedimiento correcto en 2000 divisiones por nivel');
const rangos = {
  facil: d => d.dividendo >= 10 && d.dividendo <= 99 && d.divisor <= 9 && d.resto === 0,
  medio: d => d.dividendo >= 100 && d.dividendo <= 999 && d.divisor <= 9,
  dificil: d => d.dividendo <= 9999 && d.divisor >= 11 && d.divisor <= 99,
  avanzado: d => d.dividendo >= 10000 && d.dividendo <= 99999 && d.divisor >= 101 && d.resto === 0 && d.decimales === 1
};
for (const nivel of A.ORDEN_NIVELES) {
  let malas = 0, fueraRango = 0, choques = 0, ordenMal = 0;
  for (let i = 0; i < 2000; i++) {
    const g = A.GENERAR[nivel]();
    const d = Division.crearDivision(g.dividendo, g.divisor, g.decimales);
    if (!Division.verificar(d)) malas++;
    if (!rangos[nivel](d)) fueraRango++;
    const pos = new Set(d.celdas.map(c => `${c.zona}${c.fila}_${c.col}`));
    if (pos.size !== d.celdas.length) choques++;
    const ordenes = d.celdas.filter(c => c.orden > 0).map(c => c.orden).sort((a, b) => a - b);
    if (ordenes.some((o, k) => o !== k + 1)) ordenMal++;
  }
  comprobar(malas === 0 && fueraRango === 0 && choques === 0 && ordenMal === 0,
    `${nivel}: resultado erróneo ${malas}, fuera de rango ${fueraRango}, casillas encimadas ${choques}, orden roto ${ordenMal}`);
}

console.log('\n2. Casos conocidos');
const d1 = Division.crearDivision(537, 6);
const seq = d1.celdas.filter(c => c.orden > 0).sort((a, b) => a.orden - b.orden).map(c => `${c.tipo[0]}${c.valor}`).join(' ');
comprobar(d1.textoCociente === '89' && d1.resto === 3, `537 ÷ 6 = ${d1.textoCociente} resto ${d1.resto}`);
comprobar(seq === 'c8 m8 m4 r5 b7 c9 m4 m5 r3', `orden de casillas: ${seq}`);
const d2 = Division.crearDivision(612, 6);
comprobar(d2.textoCociente === '102' && d2.resto === 0 && d2.rasgos.ceros === 1, `612 ÷ 6 = ${d2.textoCociente}, ceros en el cociente: ${d2.rasgos.ceros}`);
const d3 = Division.crearDivision(15438, 124, 1);
comprobar(d3.textoCociente === '124,5' && d3.resto === 0, `15438 ÷ 124 = ${d3.textoCociente}`);
comprobar(d3.celdas.some(c => c.coma) && d3.celdas.some(c => c.decimal), 'la división con decimales marca la coma y el 0 agregado');
const d4 = Division.crearDivision(2784, 23);
comprobar(Division.verificar(d4), `2784 ÷ 23 = ${d4.textoCociente} resto ${d4.resto}`);
comprobar(d1.pasos.length >= 8 && d1.pasos[d1.pasos.length - 1].final, `modo enseñar: ${d1.pasos.length} pasos para 537 ÷ 6`);

console.log('\n3. El juego aprende: problemas nuevos según los errores');
function perfilCon(errores) {
  const p = A.nuevoPerfil('Prueba', 0);
  A.TIPOS.forEach(t => p.stats[t] = { i: 60, e: errores[t] || 3 });
  return p;
}
function media(perfil, nivel, n, f) {
  let s = 0;
  for (let i = 0; i < n; i++) {
    const g = A.elegirProblema(perfil, nivel);
    s += f(Division.crearDivision(g.dividendo, g.divisor, g.decimales), g);
  }
  return s / n;
}
const normal = perfilCon({});
const debilResta = perfilCon({ restar: 30 });
const pBase = media(normal, 'medio', 400, d => d.rasgos.prestamos);
const pDebil = media(debilResta, 'medio', 400, d => d.rasgos.prestamos);
comprobar(pDebil > pBase * 1.3, `préstamos por división (medio): alumno normal ${pBase.toFixed(2)}, alumno que falla al restar ${pDebil.toFixed(2)}`);

const debilMult = perfilCon({ mult: 30 });
const lBase = media(normal, 'dificil', 300, d => d.rasgos.llevadas);
const lDebil = media(debilMult, 'dificil', 300, d => d.rasgos.llevadas);
comprobar(lDebil > lBase * 1.15, `llevadas por división (difícil): normal ${lBase.toFixed(2)}, falla al multiplicar ${lDebil.toFixed(2)}`);

const debilBajar = perfilCon({ bajar: 30 });
const cBase = media(normal, 'medio', 400, d => d.rasgos.ceros);
const cDebil = media(debilBajar, 'medio', 400, d => d.rasgos.ceros);
comprobar(cDebil > cBase * 1.5, `ceros en el cociente (medio): normal ${cBase.toFixed(2)}, falla al bajar ${cDebil.toFixed(2)}`);

const debilTabla = perfilCon({});
debilTabla.tablas[7] = { i: 20, e: 9 };
const t7Base = media(normal, 'facil', 400, d => d.divisor === 7 ? 1 : 0);
const t7 = media(debilTabla, 'facil', 400, d => d.divisor === 7 ? 1 : 0);
comprobar(t7 > t7Base * 2, `divisiones entre 7 (fácil): normal ${(t7Base * 100).toFixed(0)} %, falla la tabla del 7 ${(t7 * 100).toFixed(0)} %`);

const facilito = perfilCon({}); facilito.ajuste.medio = 0;
const dificilito = perfilCon({}); dificilito.ajuste.medio = 1;
const cas0 = media(facilito, 'medio', 300, d => d.rasgos.casillas);
const cas1 = media(dificilito, 'medio', 300, d => d.rasgos.casillas);
comprobar(cas1 > cas0 + 1, `casillas por división: si le cuesta ${cas0.toFixed(1)}, si le va bien ${cas1.toFixed(1)}`);

const parecida = A.elegirProblema(normal, 'dificil', { divisor: 23 });
comprobar(parecida.divisor === 23, `problema parecido tras enseñar: ${parecida.dividendo} ÷ ${parecida.divisor}`);

const repetidas = (() => {
  const p = perfilCon({}); const vistas = new Set(); let rep = 0;
  for (let i = 0; i < 13; i++) {
    const g = A.elegirProblema(p, 'medio'); const k = `${g.dividendo}/${g.divisor}`;
    if (vistas.has(k)) rep++; vistas.add(k); p.recientes.push(k);
  }
  return rep;
})();
comprobar(repetidas === 0, `ronda de ${A.POR_RONDA}: divisiones repetidas ${repetidas}`);

console.log('\n4. Estrellas, ronda y medallas');
comprobar(A.calcularEstrellas({ errores: 0 }) === 3 && A.calcularEstrellas({ errores: 2 }) === 2 &&
  A.calcularEstrellas({ errores: 0, ayuda: true }) === 2 && A.calcularEstrellas({ errores: 5, ensenada: true }) === 1, 'estrellas 3 / 2 / 2 con ayuda / 1 enseñada');
const p = A.nuevoPerfil('Sofía', 0);
const ronda = { nivel: 'medio', resultados: [] };
for (let i = 0; i < 13; i++) {
  const r = { errores: i < 11 ? 0 : 2, fallos: { cabe: 0, mult: 0, restar: i < 11 ? 0 : 2, bajar: 0 } };
  r.estrellas = A.terminarDivision(p, 'medio', r, 'x' + i);
  ronda.resultados.push(r);
}
const res = A.terminarRonda(p, ronda);
comprobar(res.estrellas === 37 && res.sinErrores === 11 && res.recomendado === 'dificil', `ronda: ${res.estrellas} estrellas, ${res.sinErrores} sin errores, recomienda ${res.recomendado}`);
comprobar(res.peor === 'restar' && /restar/.test(res.aprendi), `aprendió: ${res.aprendi}`);
comprobar(!!p.medallas.primera && !!p.medallas.diez_seguidas, 'medallas: primera división y 10 seguidas sin error');
comprobar(!A.nivelDisponible(p, 'avanzado'), 'Avanzado sigue bloqueado sin estrellas en Difícil');
const f = new Date(2026, 8, 20);
for (let i = 0; i < 7; i++) { A.registrarDia(p, new Date(2026, 8, 20 + i)); }
comprobar(A.racha(p, new Date(2026, 8, 26)) === 7 && !!p.medallas.racha7, 'racha de 7 días y su medalla');

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(fallos ? 1 : 0);
