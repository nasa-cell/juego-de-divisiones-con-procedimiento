// Niveles, creación de problemas y todo lo que el juego aprende de cada alumno.
(function (global) {
  'use strict';
  const Division = global.Division || (typeof require !== 'undefined' ? require('./division.js') : null);

  const POR_RONDA = 13;
  const ERRORES_PARA_ENSENAR = 3; // al superar este número, se enseña la división
  const TIPOS = ['cabe', 'mult', 'restar', 'bajar'];
  const NOMBRE_TIPO = { cabe: 'por cuánto multiplicar', mult: 'multiplicar', restar: 'restar', bajar: 'bajar la cifra' };
  const ORDEN_NIVELES = ['facil', 'medio', 'dificil', 'avanzado'];

  const NIVELES = {
    facil: { nombre: 'Fácil', color: 'var(--lima)', ejemplo: '84 ÷ 4', texto: 'Divisor de 1 cifra. Sin resto.', pistaSiempre: true },
    medio: { nombre: 'Medio', color: 'var(--cian)', ejemplo: '537 ÷ 6', texto: 'Divisor de 1 cifra. Con resto.', pistaSiempre: true },
    dificil: { nombre: 'Difícil', color: 'var(--naranja)', ejemplo: '2784 ÷ 23', texto: 'Divisor de 2 cifras. Ceros en el cociente.', pistaSiempre: false },
    avanzado: { nombre: 'Avanzado', color: 'var(--rosa)', ejemplo: '15438 ÷ 124', texto: 'Divisor de 3 cifras. Con decimales.', pistaSiempre: false }
  };
  const ESTRELLAS_PARA_AVANZADO = 26;

  const MEDALLAS = [
    { id: 'primera', icono: '1', texto: 'Primera división', color: 'var(--amarillo)' },
    { id: 'diez_seguidas', icono: '10', texto: '10 seguidas sin error', color: 'var(--cian)' },
    { id: 'maestro_resta', icono: '−', texto: 'Maestro de la resta', color: 'var(--lima)' },
    { id: 'ronda_perfecta', icono: '★', texto: 'Ronda perfecta', color: 'var(--amarillo)' },
    { id: 'nivel_dificil', icono: 'D', texto: 'Ronda en Difícil', color: 'var(--naranja)' },
    { id: 'racha7', icono: '7', texto: '7 días seguidos', color: 'var(--rosa)' },
    { id: 'escalon12', icono: '12', texto: 'Cima de la escalera', color: 'var(--cian)' },
    { id: 'solo', icono: '★', texto: 'Lo hice solo', color: 'var(--amarillo)' },
    { id: 'sin_ruedas', icono: '5', texto: 'Sin ruedas', color: 'var(--lima)' }
  ];

  // ---------- ayuda que se retira ----------
  // Cada alumno tiene un nivel de ayuda por tipo de paso: 3 = pista completa, 2 = solo la pregunta,
  // 1 = solo se iluminan los números, 0 = sin pista. Baja con 3 aciertos seguidos sin ayuda y sube con 2 errores.
  const ESPERAS_AYUDA = [8, 15, 25, 40];
  const BOMBILLAS = { facil: 2, medio: 2, dificil: 3, avanzado: 4, reloj: 3 };
  // Divisiones seguidas sin pedir ayuda para recuperar un foco (las de Avanzado son largas)
  const RECARGA = { facil: 3, medio: 3, dificil: 3, avanzado: 2, reloj: 3 };
  function asegurarApoyo(perfil) {
    if (!perfil.apoyo) {
      const nivel = {};
      // Un alumno que ya jugaba empieza con la ayuda que corresponde a sus errores de siempre
      TIPOS.forEach(t => {
        const s = perfil.stats && perfil.stats[t];
        const tasa = s && s.i >= 20 ? s.e / s.i : 1;
        nivel[t] = tasa < 0.05 ? 1 : tasa < 0.12 ? 2 : 3;
      });
      perfil.apoyo = { nivel, racha: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, fallos: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, espera: 0, sinAyuda: 0, rondasSolo: 0 };
    }
    return perfil.apoyo;
  }
  // Una casilla terminada: sin ayuda ni errores suma a la racha; con ayuda la corta
  function registrarApoyo(perfil, tipo, conAyuda) {
    const ap = asegurarApoyo(perfil);
    ap.fallos[tipo] = 0;
    if (conAyuda) { ap.racha[tipo] = 0; ap.sinAyuda = 0; return; }
    ap.racha[tipo]++;
    if (ap.racha[tipo] >= 3 && ap.nivel[tipo] > 0) { ap.nivel[tipo]--; ap.racha[tipo] = 0; }
    ap.sinAyuda++;
    if (ap.sinAyuda >= 3 && ap.espera > 0) { ap.espera--; ap.sinAyuda = 0; }
  }
  function registrarErrorApoyo(perfil, tipo) {
    const ap = asegurarApoyo(perfil);
    ap.racha[tipo] = 0;
    ap.fallos[tipo]++;
    if (ap.fallos[tipo] >= 2) { ap.nivel[tipo] = Math.min(3, ap.nivel[tipo] + 1); ap.fallos[tipo] = 0; }
  }
  // Pedir ayuda seguido hace que la próxima vez haya que esperar más
  function registrarPedidoAyuda(perfil) {
    const ap = asegurarApoyo(perfil);
    ap.espera = Math.min(ESPERAS_AYUDA.length - 1, ap.espera + 1);
    ap.sinAyuda = 0;
  }
  const esperaAyuda = perfil => ESPERAS_AYUDA[asegurarApoyo(perfil).espera];
  // Ronda terminada sin pulsar Ayuda y sin que haya que enseñar: medallas «Lo hice solo» y «Sin ruedas»
  function rondaSinAyuda(perfil, resultados) {
    const solo = resultados.length > 0 && resultados.every(r => r && !r.ayuda && !r.ensenada);
    if (!solo) return false;
    const ap = asegurarApoyo(perfil);
    ap.rondasSolo++;
    ganarMedalla(perfil, 'solo');
    if (ap.rondasSolo >= 5) ganarMedalla(perfil, 'sin_ruedas');
    return true;
  }

  const A = { azar: Math.random };
  const entre = (a, b) => a + Math.floor(A.azar() * (b - a + 1));

  // ---------- generadores por nivel ----------
  const GENERAR = {
    facil(divisor) {
      const d = divisor && divisor <= 9 ? divisor : entre(2, 9);
      const q = entre(Math.max(2, Math.ceil(10 / d)), Math.floor(99 / d));
      return { dividendo: d * q, divisor: d, decimales: 0 };
    },
    medio(divisor) {
      const d = divisor && divisor <= 9 ? divisor : entre(2, 9);
      return { dividendo: entre(100, 999), divisor: d, decimales: 0 };
    },
    dificil(divisor) {
      const d = divisor && divisor >= 11 && divisor <= 99 ? divisor : entre(11, 99);
      return { dividendo: entre(Math.max(10 * d, 300), 9999), divisor: d, decimales: 0 };
    },
    avanzado(divisor) {
      for (let intento = 0; intento < 400; intento++) {
        const d = divisor && divisor >= 101 && intento < 200 ? divisor : entre(101, 999);
        const qMin = Math.ceil(100000 / d), qMax = Math.floor(999990 / d);
        if (qMin > qMax) continue;
        const Q = entre(qMin, qMax);
        if (Q % 10 === 0 || (d * Q) % 10 !== 0) continue;
        const D = d * Q / 10;
        if (D >= 10000 && D <= 99999) return { dividendo: D, divisor: d, decimales: 1 };
      }
      return { dividendo: 15438, divisor: 124, decimales: 1 };
    }
  };

  // ---------- escalera del modo con reloj ----------
  const SEG_POR_CASILLA = 8;
  const conCeros = (d, maxD) => {
    for (let i = 0; i < 200; i++) {
      const q = entre(1, 9) * 100 + entre(0, 9);
      const D = d * q + entre(0, d - 1);
      if (D <= maxD) return D;
    }
    return d * 102;
  };
  const exacta = (d, min, max) => d * entre(Math.max(2, Math.ceil(min / d)), Math.max(2, Math.floor(max / d)));
  const ESCALONES = [
    { texto: '2 cifras entre 2 a 5, exactas', ejemplo: '84 ÷ 4', unaCifra: true, generar: d => { d = d || entre(2, 5); return [exacta(d, 10, 99), d, 0]; } },
    { texto: '2 cifras entre 2 a 9, exactas', ejemplo: '72 ÷ 6', unaCifra: true, generar: d => { d = d || entre(2, 9); return [exacta(d, 10, 99), d, 0]; } },
    { texto: '2 cifras, con resto', ejemplo: '75 ÷ 4', unaCifra: true, generar: d => { d = d || entre(2, 9); return [entre(Math.max(20, d), 99), d, 0]; } },
    { texto: '3 cifras, exactas', ejemplo: '348 ÷ 4', unaCifra: true, generar: d => { d = d || entre(2, 9); return [exacta(d, 100, 999), d, 0]; } },
    { texto: '3 cifras, con resto', ejemplo: '537 ÷ 6', unaCifra: true, generar: d => { d = d || entre(2, 9); return [entre(100, 999), d, 0]; } },
    { texto: '3 cifras, con ceros en el cociente', ejemplo: '612 ÷ 6', unaCifra: true, generar: d => { d = d || entre(2, 9); return [conCeros(d, 999), d, 0]; } },
    { texto: '4 cifras entre 1 cifra', ejemplo: '2784 ÷ 8', unaCifra: true, generar: d => { d = d || entre(2, 9); return [entre(1000, 9999), d, 0]; } },
    { texto: '3 cifras entre 2 cifras', ejemplo: '384 ÷ 16', unaCifra: false, generar: d => { d = d || entre(11, 19); return [entre(Math.min(d * 10, 990), 999), d, 0]; } },
    { texto: '4 cifras entre 2 cifras', ejemplo: '2784 ÷ 23', unaCifra: false, generar: d => { d = d || entre(11, 99); return [entre(Math.max(d * 10, 1000), 9999), d, 0]; } },
    { texto: '4 cifras entre 2 cifras, con ceros', ejemplo: '4715 ÷ 23', unaCifra: false, generar: d => { d = d || entre(11, 49); return [conCeros(d, 9999), d, 0]; } },
    { texto: '5 cifras entre 3 cifras', ejemplo: '15372 ÷ 124', unaCifra: false, generar: d => { d = d || entre(101, 999); return [entre(Math.max(10000, d * 10), 99999), d, 0]; } },
    { texto: '5 cifras entre 3 cifras, con decimales', ejemplo: '15438 ÷ 124', unaCifra: false, generar: d => { const g = GENERAR.avanzado(d); return [g.dividendo, g.divisor, g.decimales]; } }
  ];

  function escalonInicial(perfil) {
    return { facil: 2, medio: 5, dificil: 8, avanzado: 11 }[perfil.recomendado] || 1;
  }

  function asegurarReloj(perfil) {
    if (!perfil.reloj) perfil.reloj = { escalon: escalonInicial(perfil), record: 0, escalonMax: 0, rondas: [] };
    return perfil.reloj;
  }

  // Velocidad propia de cada alumno: segundos que tarda por casilla (media que se va ajustando)
  const SEG_INICIALES = 12;
  function asegurarVelocidad(perfil) {
    if (!perfil.velocidad) perfil.velocidad = { seg: SEG_INICIALES, muestras: 0 };
    return perfil.velocidad;
  }

  function registrarTiempo(perfil, casillas, segundos) {
    if (!casillas || segundos <= 0) return;
    const v = asegurarVelocidad(perfil);
    const porCasilla = Math.max(2, Math.min(40, segundos / casillas));
    // Las primeras divisiones pesan más para que el juego conozca rápido al alumno
    const peso = v.muestras < 3 ? 0.5 : 0.25;
    v.seg = Math.round((v.seg * (1 - peso) + porCasilla * peso) * 10) / 10;
    v.muestras++;
  }

  // Tiempo para una división según lo que suele tardar este alumno, con margen
  function tiempoPara(perfil, casillas) {
    const v = asegurarVelocidad(perfil);
    const porCasilla = Math.max(4, Math.min(25, v.seg * 1.3));
    return Math.round(casillas * porCasilla + 10);
  }

  function puntosReloj(escalon, errores, sobra) {
    const base = 10 * Math.ceil(escalon / 3);
    const extra = errores === 0 ? sobra : Math.floor(sobra / 2);
    return { base, extra, total: base + extra };
  }

  // Decide si cambia de escalón. No reacciona a una sola división: sube tras 2 divisiones
  // seguidas rápidas y sin errores, y baja tras 2 divisiones seguidas con problemas
  // (2 errores o más, o sin tiempo). Si hubo que enseñar, baja enseguida.
  function cambioEscalon(reloj, errores, sobra, tiempo, ensenada) {
    reloj.buenas = reloj.buenas || 0;
    reloj.malas = reloj.malas || 0;
    let cambio = 0;
    if (ensenada) { cambio = -1; reloj.buenas = 0; reloj.malas = 0; }
    else if (errores === 0 && sobra >= tiempo * 0.2) {
      reloj.buenas++; reloj.malas = 0;
      if (reloj.buenas >= 2) { cambio = 1; reloj.buenas = 0; }
    } else if (errores >= 2 || sobra === 0) {
      reloj.malas++; reloj.buenas = 0;
      if (reloj.malas >= 2) { cambio = -1; reloj.malas = 0; }
    } else { reloj.buenas = 0; reloj.malas = 0; }
    return cambio;
  }

  // Tarjeta que se ve mientras juega: cuánto le falta para subir o si está a punto de bajar
  function guiaEscalon(reloj) {
    const e = reloj.escalon, buenas = reloj.buenas || 0, malas = reloj.malas || 0;
    if (malas > 0 && e > 1) {
      return { tipo: 'cuidado', llenos: malas, titulo: '¡Cuidado!', texto: `Si esta también sale con 2 errores o más, o sin tiempo, bajas al escalón ${e - 1}.` };
    }
    if (e >= 12) return { tipo: 'cima', llenos: 2, titulo: '¡Estás en la cima!', texto: 'Sigue sin errores y a tiempo para sumar puntos y batir tu récord.' };
    const falta = 2 - buenas;
    return {
      tipo: 'sube', llenos: buenas, titulo: `Para subir al escalón ${e + 1}`,
      texto: falta === 1 ? 'Te falta 1 división sin errores y con tiempo de sobra.' : 'Te faltan 2 divisiones seguidas sin errores y con tiempo de sobra.'
    };
  }

  // Frase al terminar cada división: qué pasó y qué le falta.
  // d: { antes, despues (escalones), errores, sobra, tiempo, ensenada } y reloj ya actualizado
  function mensajeEscalon(reloj, d) {
    const e = d.despues;
    const buena = !d.ensenada && d.errores === 0 && d.sobra >= d.tiempo * 0.2;
    const mala = !d.ensenada && (d.errores >= 2 || d.sobra === 0);
    const porque = d.sobra === 0 && d.errores < 2 ? 'Se acabó el tiempo' : `Tuviste ${d.errores} errores`;
    if (e > d.antes) return { tipo: 'sube', titulo: `¡Subes al escalón ${e}!`, texto: 'Dos seguidas sin errores y con tiempo de sobra.' };
    if (e < d.antes) {
      return { tipo: 'baja', titulo: `Bajas al escalón ${e} para afianzar`,
        texto: d.ensenada ? 'Esta la hicimos juntos. Practica un poco aquí y vuelve a subir.' : 'Dos seguidas con muchos errores o sin tiempo. Practica un poco aquí y vuelve a subir.' };
    }
    if (d.ensenada) return { tipo: 'normal', titulo: `Sigues en el escalón ${e}`, texto: 'Esta la hicimos juntos. Para subir necesitas 2 seguidas sin errores y con tiempo de sobra.' };
    if (buena) {
      if (e >= 12) return { tipo: 'bien', titulo: '¡Bien! Sin errores y rápido.', texto: 'Estás en la cima: sigue así para batir tu récord.' };
      return { tipo: 'bien', titulo: '¡Bien! Sin errores y rápido.', texto: `Una más así y subes al escalón ${e + 1}.`, llenos: reloj.buenas || 1 };
    }
    if (mala && e > 1) return { tipo: 'cuidado', titulo: `Sigues en el escalón ${e}`, texto: `${porque}. Si la próxima también, bajas al escalón ${e - 1}.`, llenos: reloj.malas || 1 };
    if (mala) return { tipo: 'normal', titulo: `Sigues en el escalón ${e}`, texto: `${porque}. Para subir necesitas 2 seguidas sin errores y con tiempo de sobra.` };
    const casi = d.errores === 1 ? 'Tuviste 1 error' : 'Sin errores, pero justo de tiempo';
    return { tipo: 'normal', titulo: `Sigues en el escalón ${e}`,
      texto: e >= 12 ? `${casi}. Termina con tiempo de sobra para sumar más puntos.` : `${casi}. Para subir necesitas 2 seguidas sin errores y con tiempo de sobra; la cuenta empieza de nuevo.` };
  }

  function terminarRondaReloj(perfil, ronda, fecha) {
    const reloj = asegurarReloj(perfil);
    const res = ronda.resultados;
    const puntos = res.reduce((a, r) => a + r.puntos, 0);
    const sinErrores = res.filter(r => r.errores === 0 && !r.ensenada).length;
    const aTiempo = res.filter(r => r.sobra > 0 && !r.ensenada).length;
    const ensenadas = res.filter(r => r.ensenada).length;
    const escalonMax = Math.max(...res.map(r => r.escalonFin), ronda.escalonInicial);
    const fallos = { cabe: 0, mult: 0, restar: 0, bajar: 0 };
    res.forEach(r => TIPOS.forEach(t => fallos[t] += (r.fallos && r.fallos[t]) || 0));
    const record = puntos > reloj.record;
    reloj.record = Math.max(reloj.record, puntos);
    reloj.escalonMax = Math.max(reloj.escalonMax, escalonMax);
    reloj.rondas.unshift({ fecha: hoy(fecha), puntos, escalonInicial: ronda.escalonInicial, escalonFinal: reloj.escalon, sinErrores, aTiempo });
    if (reloj.rondas.length > 30) reloj.rondas.length = 30;
    if (reloj.escalonMax >= 12) ganarMedalla(perfil, 'escalon12');
    let peor = null;
    TIPOS.forEach(t => { if (fallos[t] > 0 && (!peor || fallos[t] > fallos[peor])) peor = t; });
    const sube = reloj.escalon - ronda.escalonInicial;
    let aprendi = sube > 0 ? `Subiste del escalón ${ronda.escalonInicial} al ${reloj.escalon}.` : sube < 0 ? `Bajaste del escalón ${ronda.escalonInicial} al ${reloj.escalon} para afianzar.` : `Te mantuviste en el escalón ${reloj.escalon}.`;
    if (peor) aprendi += ` Lo que más te costó: ${NOMBRE_TIPO[peor]}. Saldrá más en tus próximas divisiones.`;
    aprendi += ` La próxima ronda empieza en el escalón ${reloj.escalon}.`;
    return { puntos, record, sinErrores, aTiempo, ensenadas, escalonMax, escalonInicial: ronda.escalonInicial, escalonFinal: reloj.escalon, fallos, peor, aprendi, camino: res.map(r => r.escalonFin), total: res.length };
  }

  // ---------- perfil ----------
  function nuevoPerfil(nombre, avatar) {
    const stats = {}; TIPOS.forEach(t => stats[t] = { i: 0, e: 0 });
    const niveles = {}; ORDEN_NIVELES.forEach(n => niveles[n] = { rondas: 0, mejor: 0, estrellas: 0 });
    const ajuste = {}; ORDEN_NIVELES.forEach(n => ajuste[n] = 0.35);
    return {
      id: 'a' + Date.now().toString(36) + Math.floor(A.azar() * 1e4).toString(36),
      nombre, avatar, creado: hoy(),
      nivel: 'facil', recomendado: 'facil',
      stats, tablas: {}, ajuste, niveles,
      semanas: {}, historial: [], dias: [], medallas: {},
      contadores: { divisiones: 0, seguidasSinError: 0, restasSeguidas: 0 },
      recientes: [], ronda: null,
      reloj: { escalon: 1, record: 0, escalonMax: 0, rondas: [] },
      velocidad: { seg: SEG_INICIALES, muestras: 0 }
    };
  }

  function hoy(fecha) {
    const f = fecha || new Date();
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  }

  function claveSemana(fecha) {
    const f = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dia = f.getUTCDay() || 7;
    f.setUTCDate(f.getUTCDate() + 4 - dia);
    const inicio = new Date(Date.UTC(f.getUTCFullYear(), 0, 1));
    const semana = Math.ceil(((f - inicio) / 86400000 + 1) / 7);
    return `${f.getUTCFullYear()}-S${String(semana).padStart(2, '0')}`;
  }

  // Qué tan débil es el alumno en cada tipo de paso (1 = normal, más de 1 = le cuesta)
  function debilidades(perfil) {
    const tasa = {};
    TIPOS.forEach(t => { const s = perfil.stats[t]; tasa[t] = (s.e + 1) / (s.i + 6); });
    const media = TIPOS.reduce((a, t) => a + tasa[t], 0) / TIPOS.length;
    const w = {};
    TIPOS.forEach(t => w[t] = tasa[t] / media);
    return w;
  }

  function puntoDebil(perfil) {
    const w = debilidades(perfil);
    const datos = TIPOS.reduce((a, t) => a + perfil.stats[t].i, 0);
    let mejor = null;
    TIPOS.forEach(t => { if (perfil.stats[t].e >= 2 && (!mejor || w[t] > w[mejor])) mejor = t; });
    return datos >= 12 && mejor && w[mejor] > 1.15 ? mejor : null;
  }

  function tablaDebil(perfil) {
    let peor = null, tasaPeor = 0;
    Object.keys(perfil.tablas).forEach(d => {
      const s = perfil.tablas[d];
      const t = (s.e + 0.5) / (s.i + 4);
      if (s.e >= 2 && t > tasaPeor) { peor = Number(d); tasaPeor = t; }
    });
    return peor;
  }

  const MOTIVOS = {
    cabe: 'Practicamos por cuánto multiplicar el divisor',
    mult: 'Practicamos multiplicaciones que llevan',
    restar: 'Practicamos restas en las que hay que pedir prestado',
    bajar: 'Practicamos bajar cifras y los ceros del cociente'
  };

  function rasgoDeTipo(r, t) {
    if (t === 'cabe') return r.cabeDificil + r.ceros * 0.5;
    if (t === 'mult') return r.llevadas;
    if (t === 'restar') return r.prestamos;
    return r.ceros + r.bajadas * 0.2;
  }

  // Crea un problema nuevo pensado para este alumno
  // nivel: 'facil'… 'avanzado', o bien opciones.escalon (1 a 12) en el modo con reloj
  function elegirProblema(perfil, nivel, opciones) {
    opciones = opciones || {};
    const escalon = opciones.escalon ? ESCALONES[opciones.escalon - 1] : null;
    const generar = escalon
      ? d => { const g = escalon.generar(d); return { dividendo: g[0], divisor: g[1], decimales: g[2] }; }
      : GENERAR[nivel];
    const unaCifra = escalon ? escalon.unaCifra : nivel === 'facil' || nivel === 'medio';
    const recientes = new Set(perfil.recientes);
    const ronda = new Set(perfil.recientes.slice(-POR_RONDA));
    // Cuántas veces salió cada tabla en la última ronda, para repartirlas todas por igual
    const usoTabla = {};
    perfil.recientes.slice(-POR_RONDA).forEach(k => { const d = k.split('/')[1]; usoTabla[d] = (usoTabla[d] || 0) + 1; });
    const ultimaTabla = perfil.recientes.length ? perfil.recientes[perfil.recientes.length - 1].split('/')[1] : null;
    const reparte = unaCifra && !opciones.divisor;
    // La tabla difícil sale más que las otras, pero como mucho 3 veces por ronda
    const debilTabla = reparte ? tablaDebil(perfil) : null;
    const tabla = debilTabla && (usoTabla[debilTabla] || 0) < 3 ? debilTabla : null;
    const candidatos = [];
    const vistos = new Set();
    // Nunca se repite una división de la misma ronda; las de rondas anteriores solo si no hay otras
    for (let i = 0; i < 160 && candidatos.length < 36; i++) {
      const g = generar(opciones.divisor || (tabla && i % 4 === 0 ? tabla : null));
      const clave = `${g.dividendo}/${g.divisor}`;
      if (vistos.has(clave) || (ronda.has(clave) && i < 150)) continue;
      vistos.add(clave);
      const c = Division.crearDivision(g.dividendo, g.divisor, g.decimales);
      c.yaVista = recientes.has(clave);
      candidatos.push(c);
    }
    const w = debilidades(perfil);
    const debil = puntoDebil(perfil);
    const maximo = {};
    TIPOS.forEach(t => maximo[t] = Math.max(1, ...candidatos.map(c => rasgoDeTipo(c.rasgos, t))));
    const porCasillas = candidatos.map(c => c.rasgos.casillas).sort((a, b) => a - b);
    const ajuste = escalon ? 0.5 : perfil.ajuste[nivel];

    let mejor = null, puntosMejor = -Infinity;
    candidatos.forEach(c => {
      let puntos = 0;
      TIPOS.forEach(t => {
        const extra = Math.max(0, w[t] - 1);
        puntos += extra * 2.2 * (rasgoDeTipo(c.rasgos, t) / maximo[t]);
      });
      if (debil) puntos += 1.5 * (rasgoDeTipo(c.rasgos, debil) / maximo[debil]);
      if (tabla && c.divisor === tabla) puntos += 1.5;
      if (c.yaVista) puntos -= 4;
      if (reparte) {
        // Prueba también las tablas que casi no ha practicado, para descubrir si le cuestan
        const t = perfil.tablas[c.divisor];
        puntos += 0.8 * (1 - Math.min(1, (t ? t.i : 0) / 12));
      }
      if (!opciones.divisor) {
        // Cada vez que una tabla ya salió en esta ronda, pierde puntos; y nunca dos seguidas
        puntos -= 1.4 * (usoTabla[c.divisor] || 0);
        if (String(c.divisor) === ultimaTabla) puntos -= 3;
      }
      const posicion = porCasillas.indexOf(c.rasgos.casillas) / Math.max(1, porCasillas.length - 1);
      puntos -= Math.abs(posicion - ajuste) * (escalon ? 0.6 : 1.4);
      puntos += A.azar() * 0.6;
      if (puntos > puntosMejor) { puntosMejor = puntos; mejor = c; }
    });

    let motivo = null;
    if (opciones.divisor) motivo = 'Una parecida a la que aprendimos juntos';
    else if (tabla && mejor.divisor === tabla) motivo = `Practicamos la tabla del ${tabla}`;
    else if (debil) motivo = MOTIVOS[debil];
    return { dividendo: mejor.dividendo, divisor: mejor.divisor, decimales: mejor.decimales, motivo };
  }

  // ---------- registro de lo que pasa en el juego ----------
  function registrarPaso(perfil, tipo, correcto, divisor, fecha) {
    const s = perfil.stats[tipo];
    s.i++;
    if (!correcto) s.e++;
    // La tabla solo cuenta en los pasos que usan la tabla del divisor
    if (divisor <= 12 && (tipo === 'cabe' || tipo === 'mult')) {
      const t = perfil.tablas[divisor] || (perfil.tablas[divisor] = { i: 0, e: 0 });
      t.i++; if (!correcto) t.e++;
      // Pesan más los últimos intentos: una tabla que ya domina deja de contar como difícil
      if (t.i >= 40) { t.i /= 2; t.e /= 2; }
    }
    const sem = claveSemana(fecha || new Date());
    const semana = perfil.semanas[sem] || (perfil.semanas[sem] = { cabe: 0, mult: 0, restar: 0, bajar: 0 });
    if (!correcto) semana[tipo]++;
    if (tipo === 'restar') {
      perfil.contadores.restasSeguidas = correcto ? perfil.contadores.restasSeguidas + 1 : 0;
      if (perfil.contadores.restasSeguidas >= 20) ganarMedalla(perfil, 'maestro_resta');
    }
  }

  function calcularEstrellas(r) {
    if (r.ensenada) return 1;
    let e = r.errores === 0 ? 3 : r.errores <= 2 ? 2 : 1;
    if (r.ayuda) e = Math.min(e, 2);
    return e;
  }

  function ganarMedalla(perfil, id) {
    if (!perfil.medallas[id]) { perfil.medallas[id] = hoy(); perfil._nuevaMedalla = id; }
  }

  function terminarDivision(perfil, nivel, r, clave) {
    const estrellas = calcularEstrellas(r);
    const c = perfil.contadores;
    c.divisiones++;
    c.seguidasSinError = r.errores === 0 && !r.ensenada ? c.seguidasSinError + 1 : 0;
    ganarMedalla(perfil, 'primera');
    if (c.seguidasSinError >= 10) ganarMedalla(perfil, 'diez_seguidas');
    // El nivel interno sube si le va bien y baja si le cuesta
    if (nivel in perfil.ajuste) {
      let a = perfil.ajuste[nivel];
      if (r.ensenada) a -= 0.15; else if (r.errores === 0) a += 0.08; else if (r.errores >= 3) a -= 0.08;
      perfil.ajuste[nivel] = Math.max(0, Math.min(1, a));
    }
    perfil.recientes.push(clave);
    if (perfil.recientes.length > 60) perfil.recientes.splice(0, perfil.recientes.length - 60);
    return estrellas;
  }

  // Suma al total del nivel las estrellas de una división recién terminada y lo anota en la ronda
  function sumarEstrellas(perfil, ronda, estrellas) {
    perfil.niveles[ronda.nivel].estrellas += estrellas;
    ronda.sumadas = (ronda.sumadas || 0) + estrellas;
  }

  function registrarDia(perfil, fecha) {
    const d = hoy(fecha);
    if (!perfil.dias.includes(d)) perfil.dias.push(d);
    if (perfil.dias.length > 90) perfil.dias.splice(0, perfil.dias.length - 90);
    if (racha(perfil, fecha) >= 7) ganarMedalla(perfil, 'racha7');
  }

  function racha(perfil, fecha) {
    const dias = new Set(perfil.dias);
    const f = new Date(fecha || new Date());
    if (!dias.has(hoy(f))) f.setDate(f.getDate() - 1);
    let n = 0;
    while (dias.has(hoy(f))) { n++; f.setDate(f.getDate() - 1); }
    return n;
  }

  function nivelDisponible(perfil, nivel) {
    return nivel !== 'avanzado' || perfil.niveles.dificil.mejor >= ESTRELLAS_PARA_AVANZADO;
  }

  function terminarRonda(perfil, ronda, fecha) {
    const res = ronda.resultados;
    const estrellas = res.reduce((a, r) => a + r.estrellas, 0);
    const sinErrores = res.filter(r => r.errores === 0 && !r.ensenada).length;
    const ensenadas = res.filter(r => r.ensenada).length;
    const fallos = { cabe: 0, mult: 0, restar: 0, bajar: 0 };
    res.forEach(r => TIPOS.forEach(t => fallos[t] += (r.fallos && r.fallos[t]) || 0));

    const n = perfil.niveles[ronda.nivel];
    // Las estrellas de cada división ya se sumaron al terminarla; aquí solo se suma lo que falte
    // (una ronda empezada con una versión anterior del juego no las había sumado)
    n.rondas++; n.estrellas += Math.max(0, estrellas - (ronda.sumadas || 0)); n.mejor = Math.max(n.mejor, estrellas);
    perfil.historial.unshift({ fecha: hoy(fecha), nivel: ronda.nivel, bien: sinErrores, estrellas });
    if (perfil.historial.length > 30) perfil.historial.length = 30;
    if (estrellas === POR_RONDA * 3) ganarMedalla(perfil, 'ronda_perfecta');
    if (ronda.nivel === 'dificil' || ronda.nivel === 'avanzado') ganarMedalla(perfil, 'nivel_dificil');

    // Nivel recomendado para la próxima vez
    const i = ORDEN_NIVELES.indexOf(ronda.nivel);
    let reco = ronda.nivel;
    if (sinErrores >= 10 && i < 3 && nivelDisponible(perfil, ORDEN_NIVELES[i + 1])) reco = ORDEN_NIVELES[i + 1];
    // Solo baja de nivel si de verdad le costó: muchas enseñadas o menos de la mitad de las estrellas
    else if ((ensenadas >= 4 || estrellas < POR_RONDA * 3 * 0.5) && i > 0) reco = ORDEN_NIVELES[i - 1];
    perfil.recomendado = reco;

    let peor = null;
    TIPOS.forEach(t => { if (fallos[t] > 0 && (!peor || fallos[t] > fallos[peor])) peor = t; });
    let aprendi;
    if (!peor) aprendi = '¡No te equivocaste en ningún paso! En la próxima ronda las divisiones serán un poco más largas.';
    else {
      const extras = {
        cabe: 'encontrar por cuánto multiplicar el divisor sin pasarte. En la próxima ronda verás más de esos casos y la tabla del divisor en la pista.',
        mult: 'multiplicar cuando hay que llevar. En la próxima ronda saldrán más multiplicaciones así.',
        restar: 'restar, sobre todo cuando hay que pedir prestado. En la próxima ronda saldrán más restas así.',
        bajar: 'bajar la cifra y poner ceros en el cociente. En la próxima ronda practicaremos más ese paso.'
      };
      aprendi = `Te cuesta ${extras[peor]}`;
    }
    const tabla = tablaDebil(perfil);
    if (tabla && (ronda.nivel === 'facil' || ronda.nivel === 'medio')) aprendi += ` También repasaremos la tabla del ${tabla}.`;

    return { estrellas, sinErrores, ensenadas, fallos, peor, recomendado: reco, aprendi, total: res.length };
  }

  // Ronda sin reloj que el alumno dejó a medias y no continuó (empezó otra): con lo que alcanzó a hacer
  // se actualiza el nivel recomendado con las mismas reglas que al terminar, en proporción.
  // Las estrellas, los pasos y la velocidad ya se aprendieron división a división.
  function cerrarRondaIncompleta(perfil, ronda) {
    if (!ronda || ronda.modo === 'reloj') return;
    const res = ronda.resultados.filter(Boolean);
    if (res.length < 4) return;
    const parte = res.length / POR_RONDA;
    const estrellas = res.reduce((a, r) => a + r.estrellas, 0);
    const sinErrores = res.filter(r => r.errores === 0 && !r.ensenada).length;
    const ensenadas = res.filter(r => r.ensenada).length;
    const i = ORDEN_NIVELES.indexOf(ronda.nivel);
    let reco = perfil.recomendado;
    if (sinErrores >= 10 * parte && i < 3 && nivelDisponible(perfil, ORDEN_NIVELES[i + 1])) reco = ORDEN_NIVELES[i + 1];
    else if ((ensenadas >= 4 * parte || estrellas < res.length * 3 * 0.5) && i > 0) reco = ORDEN_NIVELES[i - 1];
    else if (i >= 0) reco = ronda.nivel;
    perfil.recomendado = reco;
  }

  // Errores del punto débil en las últimas 4 semanas (para la gráfica de progreso)
  function evolucionSemanal(perfil, fecha) {
    let tipo = null, max = -1;
    TIPOS.forEach(t => { if (perfil.stats[t].e > max) { max = perfil.stats[t].e; tipo = t; } });
    const f = new Date(fecha || new Date());
    const semanas = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(f); d.setDate(d.getDate() - i * 7);
      const clave = claveSemana(d);
      semanas.push({ etiqueta: i === 0 ? 'Esta' : `Hace ${i}`, valor: (perfil.semanas[clave] || {})[tipo] || 0 });
    }
    return { tipo, nombre: NOMBRE_TIPO[tipo], semanas };
  }

  Object.assign(A, {
    POR_RONDA, ERRORES_PARA_ENSENAR, SEG_POR_CASILLA, ESCALONES, asegurarVelocidad, registrarTiempo, tiempoPara, asegurarReloj, puntosReloj, cambioEscalon, guiaEscalon, mensajeEscalon,terminarRondaReloj, escalonInicial, TIPOS, NOMBRE_TIPO, NIVELES, ORDEN_NIVELES, MEDALLAS, ESTRELLAS_PARA_AVANZADO,
    GENERAR, nuevoPerfil, hoy, claveSemana, debilidades, puntoDebil, tablaDebil, elegirProblema,
    registrarPaso, calcularEstrellas, terminarDivision, sumarEstrellas, registrarDia, racha, nivelDisponible,
    terminarRonda, cerrarRondaIncompleta, evolucionSemanal,
    ESPERAS_AYUDA, BOMBILLAS, RECARGA, asegurarApoyo, registrarApoyo, registrarErrorApoyo, registrarPedidoAyuda, esperaAyuda, rondaSinAyuda
  });
  global.Aprendizaje = A;
  if (typeof module !== 'undefined') module.exports = A;
})(typeof window !== 'undefined' ? window : globalThis);
