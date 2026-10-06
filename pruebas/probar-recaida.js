// ¿Qué pasa si un alumno que ya sabía empieza a fallar? (cansancio, se le olvidó…)
// Simula a una alumna buena que de pronto rinde peor y mide cómo reacciona el juego.
// Uso: node pruebas/probar-recaida.js
const Division = require('../juego/codigo/division.js');
const A = require('../juego/codigo/aprendizaje.js');

let semilla = 777;
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
A.azar = azar;
const normal = () => Math.sqrt(-2 * Math.log(azar() + 1e-9)) * Math.cos(2 * Math.PI * azar());
let problemas = 0;
const comprobar = (ok, texto) => { console.log(`  ${ok ? 'OK    ' : 'REVISAR'} ${texto}`); if (!ok) problemas++; };

// Resuelve una división como lo haría la alumna: tiempo variable y errores según su estado
function resolver(perfil, div, al) {
  let usado = 0, errores = 0;
  const fallos = { cabe: 0, mult: 0, restar: 0, bajar: 0 };
  for (const c of div.celdas.filter(x => x.orden > 0)) {
    let t = al.seg * Math.exp(0.35 * normal());
    if (azar() < 0.08) t *= 2.2;
    usado += t;
    const pErr = al.error(c, div);
    while (azar() < pErr && errores <= A.ERRORES_PARA_ENSENAR) {
      errores++; fallos[c.tipo]++; usado += 4;
      A.registrarPaso(perfil, c.tipo, false, div.divisor);
    }
    if (errores > A.ERRORES_PARA_ENSENAR) break;
    A.registrarPaso(perfil, c.tipo, true, div.divisor);
  }
  return { usado: Math.round(usado), errores, fallos, ensenada: errores > A.ERRORES_PARA_ENSENAR };
}

// ---------- 1. Modo con reloj ----------
console.log('\n1. MODO CON RELOJ: Eva va por el escalón 10 y de pronto rinde como en el escalón 5 y va más lenta');
{
  const perfil = A.nuevoPerfil('Eva', 0);
  perfil.recomendado = 'dificil'; perfil.reloj = null;
  const reloj = A.asegurarReloj(perfil);
  const eva = { habilidad: 10, seg: 5 };
  eva.error = (c) => 0.02 + 0.07 * Math.max(0, reloj.escalon - eva.habilidad);
  const registro = [];
  for (let n = 0; n < 13 * 6; n++) {
    if (n === 13 * 3) { eva.habilidad = 5; eva.seg = 12; }   // empieza a fallar
    const escalon = reloj.escalon;
    const g = A.elegirProblema(perfil, null, { escalon });
    const div = Division.crearDivision(g.dividendo, g.divisor, g.decimales);
    const tiempo = A.tiempoPara(perfil, div.total);
    const r = resolver(perfil, div, eva);
    A.terminarDivision(perfil, 'reloj', r, div.clave);
    if (!r.ensenada) A.registrarTiempo(perfil, div.total, r.usado);
    const sobra = r.ensenada ? 0 : Math.max(0, tiempo - r.usado);
    reloj.escalon = Math.max(1, Math.min(12, reloj.escalon + A.cambioEscalon(reloj, r.errores, sobra, tiempo, r.ensenada)));
    registro.push({ escalon, porCasilla: tiempo / div.total, aTiempo: sobra > 0, ensenada: r.ensenada });
  }
  const tramo = (a, b) => registro.slice(a, b);
  const media = (xs, f) => xs.reduce((t, x) => t + f(x), 0) / xs.length;
  const antes = tramo(26, 39), despues1 = tramo(39, 52), despues3 = tramo(65, 78);
  console.log(`  Antes de fallar (ronda 3): escalón ${antes[0].escalon}→${antes[12].escalon}, tiempo ${media(antes, x => x.porCasilla).toFixed(1)} s/casilla, a tiempo ${antes.filter(x => x.aTiempo).length}/13`);
  console.log(`  1.ª ronda fallando:        escalón ${despues1[0].escalon}→${despues1[12].escalon}, tiempo ${media(despues1, x => x.porCasilla).toFixed(1)} s/casilla, a tiempo ${despues1.filter(x => x.aTiempo).length}/13, enseñadas ${despues1.filter(x => x.ensenada).length}`);
  console.log(`  3.ª ronda fallando:        escalón ${despues3[0].escalon}→${despues3[12].escalon}, tiempo ${media(despues3, x => x.porCasilla).toFixed(1)} s/casilla, a tiempo ${despues3.filter(x => x.aTiempo).length}/13, enseñadas ${despues3.filter(x => x.ensenada).length}`);
  const hasta = registro.slice(39).findIndex(x => x.escalon <= 7);
  comprobar(hasta >= 0 && hasta <= 13, `detecta la recaída: baja al escalón 7 o menos en ${hasta + 1} divisiones`);
  comprobar(media(despues3, x => x.porCasilla) > media(antes, x => x.porCasilla) * 1.5, 'le da más tiempo porque ahora va más lenta');
  comprobar(Math.abs(despues3[12].escalon - eva.habilidad) <= 2, `se estabiliza cerca de lo que ahora puede (escalón ${despues3[12].escalon}, puede con el ${eva.habilidad})`);
  comprobar(despues3.filter(x => x.ensenada).length <= despues1.filter(x => x.ensenada).length, 'con el tiempo necesita que le enseñen menos veces');
}

// ---------- 2. Modo sin reloj ----------
console.log('\n2. MODO SIN RELOJ: Luis hace perfecto el nivel Difícil y luego empieza a fallar al restar y al calcular cuántas veces cabe');
{
  const perfil = A.nuevoPerfil('Luis', 0);
  const luis = { seg: 6, fallando: false };
  luis.error = (c) => luis.fallando && (c.tipo === 'restar' || c.tipo === 'cabe') ? 0.35 : 0.005;
  let nivel = 'dificil';
  for (let k = 1; k <= 5; k++) {
    if (k === 3) luis.fallando = true;
    const ronda = { nivel, resultados: [] };
    const casillas = [];
    let parecida = null;
    for (let i = 0; i < A.POR_RONDA; i++) {
      const g = A.elegirProblema(perfil, nivel, parecida ? { divisor: parecida } : {});
      parecida = null;
      const div = Division.crearDivision(g.dividendo, g.divisor, g.decimales);
      casillas.push(div.total);
      const r = resolver(perfil, div, luis);
      if (r.ensenada) parecida = div.divisor;
      r.estrellas = A.terminarDivision(perfil, nivel, r, div.clave);
      ronda.resultados.push(r);
    }
    const res = A.terminarRonda(perfil, ronda);
    const debil = A.puntoDebil(perfil);
    console.log(`  Ronda ${k} (${A.NIVELES[nivel].nombre})${luis.fallando ? ' fallando' : ''}: ${res.estrellas}/39 estrellas, sin errores ${res.sinErrores}/13, enseñadas ${res.ensenadas}, casillas medias ${(casillas.reduce((a, b) => a + b) / 13).toFixed(1)}, punto débil: ${debil ? A.NOMBRE_TIPO[debil] : '—'}, recomienda ${A.NIVELES[res.recomendado].nombre}`);
    if (k === 2) comprobar(res.recomendado === 'avanzado' || res.recomendado === 'dificil', 'mientras va bien, no lo baja');
    if (k === 3) {
      comprobar(res.recomendado !== 'avanzado', 'en cuanto falla, deja de recomendarle subir');
      comprobar(debil === 'restar' || debil === 'cabe', `detecta el nuevo punto débil (${debil ? A.NOMBRE_TIPO[debil] : 'ninguno'})`);
    }
    if (k === 5) comprobar(perfil.ajuste.dificil < 0.5, `dentro del nivel, las divisiones se hacen más cortas (ajuste ${perfil.ajuste.dificil.toFixed(2)})`);
    nivel = res.recomendado;
  }
}

console.log(problemas ? `\n${problemas} punto(s) para revisar` : '\nEl juego reacciona bien cuando un alumno que ya sabía empieza a fallar');
process.exit(problemas ? 1 : 0);
