// Comprueba las pistas en miles de divisiones de todos los niveles y escalones:
// la ayuda lleva siempre al número correcto, las casillas iluminadas existen,
// ninguna pista da la respuesta de la casilla y ningún texto sale roto.
// Uso: node pruebas/probar-pistas.js
const Division = require('../juego/codigo/division.js');
const A = require('../juego/codigo/aprendizaje.js');
const P = require('../juego/codigo/pistas.js');

let semilla = 99;
A.azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };

let fallos = 0, casillas = 0;
const fallo = t => { if (fallos < 20) console.log('  FALLO: ' + t); fallos++; };
const roto = t => /undefined|NaN|null|\[object/.test(t);

const generadores = A.ORDEN_NIVELES.map(n => () => A.GENERAR[n]())
  .concat(A.ESCALONES.map(e => () => { const g = e.generar(); return { dividendo: g[0], divisor: g[1], decimales: g[2] }; }));
const extras = [{ dividendo: 84, divisor: 4, decimales: 0 }, { dividendo: 303, divisor: 124, decimales: 0 }, { dividendo: 4715, divisor: 23, decimales: 0 },
  { dividendo: 612, divisor: 6, decimales: 0 }, { dividendo: 1000, divisor: 7, decimales: 0 }, { dividendo: 15438, divisor: 124, decimales: 1 }];

const ejemplos = {};
const formas = {};
let seguidasIguales = 0, pares = 0, divisiones = 0;
const probar = g => {
  P.nuevaDivision(divisiones++ * 37);
  const div = Division.crearDivision(g.dividendo, g.divisor, g.decimales);
  let anterior = null;
  const ids = new Set(div.celdas.map(c => c.id));
  for (const c of div.celdas.filter(x => x.orden > 0)) {
    casillas++;
    const p = P.pista(div, c);
    // Variedad: cuántas formas distintas de decir cada pista y si se repite la misma seguida
    const molde = p.pista.replace(/\d+/g, 'N');
    (formas[c.tipo] = formas[c.tipo] || new Set()).add(molde);
    if (anterior !== null) { pares++; if (anterior === molde) seguidasIguales++; }
    anterior = molde;
    const que = `${div.dividendo} ÷ ${div.divisor}, casilla ${c.orden} (${c.tipo})`;
    if (roto(p.pista) || roto(p.ayuda)) fallo(`${que}: texto roto «${p.pista}» / «${p.ayuda}»`);
    [...p.luz, ...p.luz2].forEach(id => { if (!ids.has(id)) fallo(`${que}: ilumina una casilla que no existe (${id})`); });
    // Las casillas iluminadas ya deben estar a la vista (datos o casillas ya rellenadas)
    [...p.luz, ...p.luz2].forEach(id => { const x = div.celdas.find(y => y.id === id); if (x.orden >= c.orden) fallo(`${que}: ilumina una casilla que aún no está rellena`); });
    // La ayuda lleva a la respuesta correcta
    if (c.tipo === 'cabe') {
      const buenas = p.fichas.filter(f => f.ok).length;
      if (buenas !== c.valor) fallo(`${que}: las fichas marcan ${buenas} y la respuesta es ${c.valor}`);
    } else if (c.tipo === 'mult') {
      const m = p.ayuda.match(/escribe (\d+)/);
      if (!m || Number(m[1]) !== c.valor) fallo(`${que}: la ayuda dice «${p.ayuda}» y la respuesta es ${c.valor}`);
    } else if (c.tipo === 'restar') {
      const m = p.ayuda.match(/= (\d+)\.$/);
      if (!m || Number(m[1]) !== c.valor) fallo(`${que}: la ayuda dice «${p.ayuda}» y la respuesta es ${c.valor}`);
    } else {
      const m = p.ayuda.match(/Baja (?:el|un) (\d)/);
      if (!m || Number(m[1]) !== c.valor) fallo(`${que}: la ayuda dice «${p.ayuda}» y la respuesta es ${c.valor}`);
    }
    // La pista no puede decir la respuesta de la casilla con palabras como "escribe 5"
    if (/escribe \d|= \d+\.?$/.test(p.pista)) fallo(`${que}: la pista da la respuesta «${p.pista}»`);
    // Cada número equivocado tiene su explicación
    for (let n = 0; n <= 9; n++) {
      if (n === c.valor) continue;
      const t = P.porQue(div, c, n);
      if (!t || roto(t)) fallo(`${que}: sin explicación para el ${n}`);
      const clave = c.tipo + ':' + t.replace(/\d+/g, 'N');
      if (!ejemplos[clave]) ejemplos[clave] = `${div.dividendo} ÷ ${div.divisor}, escribió ${n} → ${t}`;
    }
    const clave = c.tipo + ':pista';
    if (!ejemplos[clave + c.orden] && c.orden < 6) ejemplos[clave + c.orden] = `${div.dividendo} ÷ ${div.divisor} · ${p.pista} | Ayuda: ${p.ayuda}${p.fichas ? ' ' + p.fichas.map(f => f.texto + (f.ok ? ' ✓' : ' ✗')).join(' · ') : ''}`;
  }
};
extras.forEach(probar);
for (let i = 0; i < 3000; i++) probar(generadores[i % generadores.length]());

console.log('Ejemplos de lo que ve el alumno:');
Object.values(ejemplos).slice(0, 26).forEach(t => console.log('  ' + t));
console.log(`\nCasillas revisadas: ${casillas}`);
Object.keys(formas).forEach(t => console.log(`  Formas distintas de la pista «${t}»: ${formas[t].size}`));
const pctIguales = Math.round(seguidasIguales / pares * 100);
console.log(`  Misma frase en dos casillas seguidas: ${pctIguales} %`);
if (Object.values(formas).some(f => f.size < 3)) fallo('algún paso tiene menos de 3 formas de decir la pista');
if (pctIguales > 10) fallo('la misma frase se repite demasiado seguida');
console.log(fallos ? `${fallos} fallo(s)` : 'Todas las pistas llevan a la respuesta correcta y ningún texto sale roto');
process.exit(fallos ? 1 : 0);
