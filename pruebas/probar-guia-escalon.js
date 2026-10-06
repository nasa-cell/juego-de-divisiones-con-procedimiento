// Comprueba que la guía del escalón y las frases al terminar cada división dicen la verdad:
// si la frase promete "una más así y subes", la siguiente buena sube; si avisa de que puede
// bajar, la siguiente mala baja. Juega miles de divisiones con resultados al azar.
// Uso: node pruebas/probar-guia-escalon.js
const A = require('../juego/codigo/aprendizaje.js');

let semilla = 4242;
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };

// Tipos de división que puede hacer un alumno
const TIPOS = {
  buena: { errores: 0, sobra: 30, tiempo: 60, ensenada: false },
  justa: { errores: 0, sobra: 5, tiempo: 60, ensenada: false },
  unError: { errores: 1, sobra: 20, tiempo: 60, ensenada: false },
  mala: { errores: 2, sobra: 10, tiempo: 60, ensenada: false },
  sinTiempo: { errores: 0, sobra: 0, tiempo: 60, ensenada: false },
  ensenada: { errores: 4, sobra: 0, tiempo: 60, ensenada: true }
};
const NOMBRES = Object.keys(TIPOS);

let fallos = 0;
const fallo = t => { if (fallos < 15) console.log('  FALLO: ' + t); fallos++; };

function jugar(reloj, tipo) {
  const d = TIPOS[tipo];
  const antes = reloj.escalon;
  reloj.escalon = Math.max(1, Math.min(12, antes + A.cambioEscalon(reloj, d.errores, d.sobra, d.tiempo, d.ensenada)));
  return A.mensajeEscalon(reloj, Object.assign({ antes, despues: reloj.escalon }, d));
}

const vistos = new Set();
for (let partida = 0; partida < 400; partida++) {
  const reloj = { escalon: 1 + Math.floor(azar() * 12), record: 0, escalonMax: 0, rondas: [] };
  for (let i = 0; i < 40; i++) {
    const guia = A.guiaEscalon(reloj);
    const e = reloj.escalon;
    const tipo = NOMBRES[Math.floor(azar() * NOMBRES.length)];
    const m = jugar(reloj, tipo);
    vistos.add(`${m.tipo} · ${m.titulo} · ${m.texto}`.replace(/\d+/g, 'N'));
    const d = reloj.escalon;
    // La frase coincide con lo que pasó
    if (d > e && !/Subes al escalón/.test(m.titulo)) fallo(`subió ${e}→${d} pero dice «${m.titulo}»`);
    if (d < e && !/Bajas al escalón/.test(m.titulo)) fallo(`bajó ${e}→${d} pero dice «${m.titulo}»`);
    if (d === e && /Subes|Bajas/.test(m.titulo)) fallo(`sigue en ${e} pero dice «${m.titulo}»`);
    if (/\b0\b|NaN|undefined|13/.test(m.titulo + m.texto)) fallo(`texto raro: «${m.titulo} ${m.texto}»`);
    // La guía que vio antes de jugar era cierta
    if (guia.tipo === 'sube' && guia.llenos === 1 && tipo === 'buena' && d !== e + 1) fallo(`la guía decía que faltaba 1 y no subió (${e}→${d})`);
    if (guia.tipo === 'cuidado' && (tipo === 'mala' || tipo === 'sinTiempo') && d !== e - 1) fallo(`la guía avisaba de bajar y no bajó (${e}→${d})`);
    // Lo que promete la frase se cumple en la división siguiente
    if (/Una más así y subes/.test(m.texto)) {
      const s = reloj.escalon; jugar(reloj, 'buena');
      if (reloj.escalon !== s + 1) fallo(`prometió subir y no subió (${s}→${reloj.escalon})`);
    } else if (/Si la próxima también, bajas/.test(m.texto)) {
      const s = reloj.escalon; jugar(reloj, 'mala');
      if (reloj.escalon !== s - 1) fallo(`avisó de bajar y no bajó (${s}→${reloj.escalon})`);
    }
  }
}

// Ejemplos de lo que ve el alumno
const ej = { escalon: 1 };
console.log('Ejemplos:');
console.log('  Guía al empezar:', A.guiaEscalon(ej).titulo, '·', A.guiaEscalon(ej).texto);
let m = jugar(ej, 'buena'); console.log('  1.ª buena:', m.titulo, '·', m.texto);
console.log('  Guía:', A.guiaEscalon(ej).titulo, '·', A.guiaEscalon(ej).texto);
m = jugar(ej, 'buena'); console.log('  2.ª buena:', m.titulo, '·', m.texto);
m = jugar(ej, 'mala'); console.log('  1.ª mala:', m.titulo, '·', m.texto);
console.log('  Guía:', A.guiaEscalon(ej).titulo, '·', A.guiaEscalon(ej).texto);
m = jugar(ej, 'sinTiempo'); console.log('  2.ª mala:', m.titulo, '·', m.texto);
console.log(`\nFrases distintas que salieron (${vistos.size}):`);
[...vistos].sort().forEach(v => console.log('  ' + v));
console.log(fallos ? `\n${fallos} fallo(s)` : 'Todas las frases y la guía dicen la verdad');
process.exit(fallos ? 1 : 0);
