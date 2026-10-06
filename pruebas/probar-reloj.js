// Simula alumnos "humanos" en el modo con reloj: cada uno con su velocidad, tiempos
// que varían, distracciones, más errores si la división es muy difícil y mejora con la práctica.
// Comprueba que el juego calcula un tiempo justo para cada uno y que la escalera se ajusta.
// Uso: node pruebas/probar-reloj.js
const Division = require('../juego/codigo/division.js');
const A = require('../juego/codigo/aprendizaje.js');

// Números aleatorios repetibles para que la prueba dé siempre lo mismo
let semilla = 12345;
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
A.azar = azar;
const normal = () => Math.sqrt(-2 * Math.log(azar() + 1e-9)) * Math.cos(2 * Math.PI * azar());

const ALUMNOS = [
  { nombre: 'Mateo', texto: 'empieza, es lento', recomendado: 'facil', habilidad: 3, seg: 18 },
  { nombre: 'Sofía', texto: 'nivel medio', recomendado: 'medio', habilidad: 6, seg: 9 },
  { nombre: 'Eva', texto: 'rápida y segura', recomendado: 'dificil', habilidad: 10, seg: 5 }
];

function jugarDivision(perfil, al) {
  const reloj = A.asegurarReloj(perfil);
  const escalon = reloj.escalon;
  const g = A.elegirProblema(perfil, null, { escalon });
  const div = Division.crearDivision(g.dividendo, g.divisor, g.decimales);
  const tiempo = A.tiempoPara(perfil, div.total);
  let usado = 0, errores = 0;
  const fallos = { cabe: 0, mult: 0, restar: 0, bajar: 0 };
  const dificultad = Math.max(0, escalon - al.habilidad);
  for (const c of div.celdas.filter(x => x.orden > 0)) {
    let t = al.seg * Math.exp(0.35 * normal());           // cada casilla tarda distinto
    if (azar() < 0.08) t *= 2.2;                           // a veces se distrae
    usado += t;
    const pErr = 0.02 + 0.07 * dificultad;
    while (azar() < pErr && errores <= A.ERRORES_PARA_ENSENAR) {
      errores++; fallos[c.tipo]++; usado += 4;
      A.registrarPaso(perfil, c.tipo, false, div.divisor);
    }
    if (errores > A.ERRORES_PARA_ENSENAR) break;
    A.registrarPaso(perfil, c.tipo, true, div.divisor);
  }
  usado = Math.round(usado);
  const ensenada = errores > A.ERRORES_PARA_ENSENAR;
  // Igual que en la aplicación
  A.terminarDivision(perfil, 'reloj', { errores, ensenada, fallos }, div.clave);
  if (!ensenada) A.registrarTiempo(perfil, div.total, usado);
  const sobra = ensenada ? 0 : Math.max(0, tiempo - usado);
  const pts = A.puntosReloj(escalon, errores, sobra);
  const cambio = A.cambioEscalon(reloj, errores, sobra, tiempo, ensenada);
  reloj.escalon = Math.max(1, Math.min(12, reloj.escalon + cambio));
  // El niño aprende un poco con cada división
  al.habilidad += 0.04;
  al.seg *= 0.995;
  return { puntos: ensenada ? Math.floor(pts.base / 2) : pts.total, sobra, errores, ensenada, fallos, escalonFin: reloj.escalon, cambio, tiempo, casillas: div.total, usado };
}

let problemas = 0;
for (const al of ALUMNOS) {
  const perfil = A.nuevoPerfil(al.nombre, 0);
  perfil.recomendado = al.recomendado;
  perfil.reloj = null;
  const reloj = A.asegurarReloj(perfil);
  console.log(`\n${al.nombre} (${al.texto}): tarda unos ${al.seg} s por casilla, puede con el escalón ${al.habilidad}. Empieza en el escalón ${reloj.escalon}.`);
  for (let k = 1; k <= 5; k++) {
    const ronda = { escalonInicial: reloj.escalon, resultados: [] };
    for (let i = 0; i < A.POR_RONDA; i++) ronda.resultados.push(jugarDivision(perfil, al));
    const res = A.terminarRondaReloj(perfil, ronda);
    const rs = ronda.resultados;
    const porCasilla = rs.reduce((t, r) => t + r.tiempo / r.casillas, 0) / rs.length;
    const cambios = rs.filter(r => r.cambio !== 0).length;
    console.log(`  Ronda ${k}: escalón ${res.escalonInicial} → ${res.escalonFinal} · tiempo dado ${porCasilla.toFixed(1)} s/casilla (tarda ${al.seg.toFixed(1)}) · a tiempo ${res.aTiempo}/13 · sin errores ${res.sinErrores}/13 · enseñadas ${res.ensenadas} · cambios de escalón ${cambios} · ${res.puntos} pts`);
  }
  const final = perfil.reloj.escalon;
  const ok = Math.abs(final - al.habilidad) <= 2.5;
  console.log(`  ${ok ? 'OK' : 'REVISAR'}: termina en el escalón ${final}; su habilidad ahora es ${al.habilidad.toFixed(1)}. Velocidad aprendida: ${perfil.velocidad.seg} s/casilla.`);
  if (!ok) problemas++;
}
console.log(problemas ? `\n${problemas} alumno(s) para revisar` : '\nEl juego ajustó tiempo y escalón a cada alumno');
process.exit(problemas ? 1 : 0);
