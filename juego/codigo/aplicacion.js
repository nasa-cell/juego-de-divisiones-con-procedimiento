// Pantallas del juego y lo que pasa al tocar cada botón.
// El juego arranca cuando ya se recuperaron los datos guardados en el equipo
Almacen.preparar().then(function () {
  'use strict';
  const A = window.Aprendizaje, D = window.Division;
  const app = document.getElementById('app');
  const MOVIMIENTO = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AVATARES = [['÷', '#FFD23F'], ['×', '#FF4FB8'], ['+', '#B8FF3B'], ['−', '#22D3EE'], ['=', '#FF8A3D'], ['%', '#E0C8FF']];
  const COLORES = ['#B8FF3B', '#22D3EE', '#FFD23F', '#FF4FB8', '#E0C8FF', '#FF8A3D'];
  const BOMBILLA = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z" fill="#FFD23F"/><rect x="9" y="19" width="6" height="2.5" rx="1" fill="#22D3EE"/></svg>';
  const ICONO_SONIDO = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>';
  const ICONO_RELOJ = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="#03384B" stroke-width="2.5"/><path d="M12 9v4l3 2M9 2h6" stroke="#03384B" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>';
  const ICONO_MUDO = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M16 9l5 6M21 9l-5 6"/></svg>';

  // ---------- seguridad de los datos que escribe el usuario ----------
  const MIN_NOMBRE = 2, MAX_NOMBRE = 16, MAX_ALUMNOS = 60, MAX_FOTO = 15 * 1024 * 1024;
  // El nombre solo lleva letras (con tildes y ñ), espacios, guion y apóstrofo (María-José, O'Neil); sin números
  const NO_PERMITIDO = /[^\p{L}\p{M} '’\-]/gu;
  // Con «guardado» se revisa un nombre ya existente: se respetan los números que tuviera de antes
  function limpiarNombre(t, guardado) {
    const limpio = String(t == null ? '' : t).normalize('NFC').replace(guardado ? /[^\p{L}\p{M}\p{N} '’.\-]/gu : NO_PERMITIDO, '').replace(/\s+/g, ' ').trim();
    return Array.from(limpio).slice(0, MAX_NOMBRE).join('').trim();
  }
  function errorNombre(nombre) {
    if (!nombre) return 'Escribe un nombre.';
    if ((nombre.match(/\p{L}/gu) || []).length < MIN_NOMBRE) return `El nombre tiene que tener al menos ${MIN_NOMBRE} letras.`;
    return '';
  }
  // Una foto guardada solo se acepta si es una imagen de verdad (así no se cuela código en la página)
  const fotoSegura = f => typeof f === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(f) ? f : null;

  const datos = Almacen.leer();
  // Los datos guardados se revisan al abrir por si el archivo se cambió a mano o está dañado
  datos.alumnos = datos.alumnos.filter(p => p && typeof p === 'object');
  datos.alumnos.forEach(p => {
    p.nombre = limpiarNombre(p.nombre, true) || 'Alumno';
    p.foto = fotoSegura(p.foto);
    if (!(Number.isInteger(p.avatar) && p.avatar >= 0 && p.avatar < AVATARES.length)) p.avatar = 0;
  });
  Sonidos.activo = datos.sonido !== false;
  let perfil = null;
  let pantalla = 'alumnos';
  let vista = {};
  let juego = null;
  let entrar = true;

  // ---------- utilidades ----------
  const NOMBRE_PASO = { empezar: 'Empezar', cabe: '¿Por cuánto multiplico?', mult: 'Multiplicar', restar: 'Restar', bajar: 'Bajar la cifra', fin: 'Resultado' };
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nivelDe = id => A.NIVELES[id];
  function estrellas(n, total, pop) {
    total = total || 3;
    let h = `<span class="estrellas${pop ? ' pop' : ''}">`;
    for (let i = 0; i < total; i++) h += i < n ? `<span class="e" style="animation-delay:${i * 0.18}s">★</span>` : '<span class="off">★</span>';
    return h + '</span>';
  }
  function avatar(p) {
    const a = AVATARES[p.avatar] || AVATARES[0];
    if (p.foto) return `<span class="avatar con-foto" style="--av:${a[1]};background-image:url(${p.foto})" role="img" aria-label="Foto de ${esc(p.nombre)}"></span>`;
    return `<span class="avatar" style="--av:${a[1]}">${a[0]}</span>`;
  }
  function guardar() { Almacen.guardar(datos); }
  function ir(p, v) { pantalla = p; vista = v || {}; entrar = true; pintar(); window.scrollTo(0, 0); }

  function pintar() {
    app.innerHTML = `<div class="${entrar ? 'pantalla' : ''}">${PANTALLAS[pantalla]()}</div>`;
    entrar = false;
    if (pantalla === 'juego' || pantalla === 'ensenar') ajustarTablero();
    if (pantalla === 'perfil') prepararEditor();
  }

  function aviso(icono, texto) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<i>${icono}</i><span>${texto}</span>`;
    // Si ya hay avisos en pantalla, el nuevo sale encima de ellos en vez de taparlos
    const antes = document.querySelectorAll('.toast').length;
    if (antes) t.style.bottom = `calc(env(safe-area-inset-bottom, 0px) + ${20 + antes * 74}px)`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function revisarMedalla() {
    if (!perfil || !perfil._nuevaMedalla) return;
    const m = A.MEDALLAS.find(x => x.id === perfil._nuevaMedalla);
    delete perfil._nuevaMedalla;
    if (m) { setTimeout(() => { aviso(m.icono, `¡Nueva medalla: ${m.texto}!`); Sonidos.medalla(); }, 500); }
  }

  function chispas(celda) {
    if (!MOVIMIENTO || !celda) return;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      const ang = (Math.PI * 2 * i) / 10, dist = 30 + Math.random() * 18;
      s.className = 'chispa';
      s.style.setProperty('--x', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--y', Math.sin(ang) * dist + 'px');
      s.style.setProperty('--col', COLORES[i % COLORES.length]);
      celda.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
  }

  function confeti() {
    if (!MOVIMIENTO) return;
    const alto = window.innerHeight + 30;
    for (let i = 0; i < 50; i++) {
      const c = document.createElement('span');
      c.className = 'confeti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = COLORES[i % COLORES.length];
      c.style.setProperty('--h', alto + 'px');
      c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3600);
    }
  }

  const colorEscalon = e => e <= 3 ? '#B8FF3B' : e <= 6 ? '#22D3EE' : e <= 9 ? '#FF8A3D' : '#FF4FB8';
  const esReloj = r => r && r.modo === 'reloj';
  const nombreRonda = r => esReloj(r) ? 'con reloj' : `en ${nivelDe(r.nivel).nombre}`;

  // Escalera 3D: cada peldaño es un bloque con cara frontal, superior y lateral
  function escalera(actual, tam) {
    let h = `<div class="escalera3d ${tam}" role="img" aria-label="Escalón ${actual} de 12">`;
    for (let e = 1; e <= 12; e++) {
      const cls = e < actual ? 'pasado' : e === actual ? 'actual' : '';
      h += `<div class="peldano ${cls}" style="--col:${colorEscalon(e)};--n:${e};z-index:${e}">${e === actual ? '<span class="ficha">÷</span>' : ''}${tam === 'g' ? `<small>${e}</small>` : ''}</div>`;
    }
    return h + '</div>';
  }

  // Dos puntitos que se llenan: divisiones buenas (o malas) seguidas de las 2 que hacen falta
  const puntitos = (llenos, texto) => `<span class="puntitos" role="img" aria-label="${texto}"><i class="${llenos >= 1 ? 'on' : ''}"></i><i class="${llenos >= 2 ? 'on' : ''}"></i></span>`;

  function guiaEscalon(escalon) {
    const g = A.guiaEscalon(Object.assign({}, A.asegurarReloj(perfil), { escalon }));
    return `<div class="guia ${g.tipo}"><b>${g.titulo}</b>${puntitos(g.llenos, `${g.llenos} de 2`)}<span>${g.texto}</span></div>`;
  }

  // Leyenda de una gráfica: explicación corta y, si hace falta, qué significa cada color
  function leyenda(texto, colores) {
    return `<div class="leyenda"><p>${texto}</p>${colores ? `<div class="colores">${colores.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}</div>` : ''}</div>`;
  }
  const COLORES_ESCALERA = [['#B8FF3B', '1 a 3: números de 2 cifras'], ['#22D3EE', '4 a 6: números de 3 cifras'], ['#FF8A3D', '7 a 9: 4 cifras o divisor de 2 cifras'], ['#FF4FB8', '10 a 12: los más difíciles']];
  const leyendaEscalera = () => leyenda('La ficha amarilla con ÷ marca tu escalón. Cuanto más alto, más difícil. Los escalones de colores son los que ya subiste.', COLORES_ESCALERA);

  function relojRedondo(seg, total) {
    const r = 30, c = 2 * Math.PI * r, f = total ? Math.max(0, seg / total) : 0;
    const poco = seg > 0 && seg <= 10;
    const col = seg <= 10 ? '#FF4D6D' : '#FFD23F';
    const m = Math.floor(seg / 60), ss = String(seg % 60).padStart(2, '0');
    return `<div class="reloj${poco ? ' poco' : ''}${seg <= 0 ? ' agotado' : ''}" role="timer" aria-label="Quedan ${seg} segundos"><svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="${r}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="8"/><circle cx="36" cy="36" r="${r}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 36 36)"/></svg><span>${m}:${ss}</span></div>`;
  }

  // ---------- tablero de la división ----------
  function tablero(div, o) {
    const nDiv = div.columnasDividendo, nCoc = div.columnasCociente;
    const colDe = c => c.zona === 'div' ? c.col + 2 : nDiv + 3 + c.col;
    // La última columna (--x) usa el ancho que sobra; en celular ahí va el panel con la pista, bajo el cociente
    let h = `<div class="tablero" data-columnas="${nDiv + nCoc}" data-filas="${div.filas}" style="grid-template-columns:var(--m) repeat(${nDiv},var(--c)) var(--g) repeat(${nCoc},var(--c)) var(--x,0px)${o.lateral ? `;grid-template-rows:repeat(${div.filas},var(--c)) auto` : ''}">`;
    h += `<div class="galera" style="grid-column:${nDiv + 3}/${nDiv + 3 + nCoc};grid-row:1/2"></div>`;
    // El panel ocupa desde la fila 3 hasta una fila extra al final que crece si el texto lo necesita
    if (o.lateral) h += `<div class="lateral" style="grid-column:${nDiv + 3}/${nDiv + 4 + nCoc};grid-row:3/${div.filas + 2}">${o.lateral}</div>`;
    const filasVisibles = new Set(div.celdas.filter(c => c.tipo === 'mult' && (c.orden <= o.hasta || c.orden === o.activa)).map(c => c.fila));
    div.menos.forEach(m => { if (filasVisibles.has(m.fila)) h += `<div class="menos" style="grid-column:${m.col + 2};grid-row:${m.fila}">−</div>`; });
    div.lineas.forEach(l => { if (filasVisibles.has(l.fila)) h += `<div class="linea" style="grid-column:${l.desde + 2}/${l.hasta + 3};grid-row:${l.fila}"></div>`; });
    for (const c of div.celdas) {
      let cls = 'celda', txt = '';
      if (c.orden === 0) { cls += ' dato'; txt = c.valor; if (o.marcadas && o.marcadas.includes(c.id)) cls += ' marcada'; }
      else if (c.orden <= o.hasta) {
        cls += ' hecha'; txt = c.valor;
        if (c.orden === o.recien) cls += ' recien';
        if (o.nuevas && o.nuevas.includes(c.orden)) cls += ' nueva';
      } else if (c.orden === o.activa) { cls += ' activa' + (o.error !== null && o.error !== undefined ? ' mal' : ''); txt = o.error !== null && o.error !== undefined ? o.error : ''; }
      else cls += ' vacia';
      if (c.coma) cls += ' coma';
      if (o.luz && o.luz.includes(c.id)) cls += ' luz';
      if (o.luz2 && o.luz2.includes(c.id)) cls += ' luz2';
      h += `<div class="${cls}" data-orden="${c.orden}" style="grid-column:${colDe(c)};grid-row:${c.fila}">${txt}</div>`;
    }
    return h + '</div>';
  }

  function ajustarTablero() {
    const t = app.querySelector('.tablero');
    if (!t) return;
    const caja = t.parentElement, zona = caja.parentElement, panel = app.querySelector('.panel');
    const estilo = getComputedStyle(caja);
    // Con el teclado al lado (PC, tablet) la caja se ajusta al tablero, así que el ancho se mide en la columna
    const alLado = !!panel && panel.getBoundingClientRect().top < caja.getBoundingClientRect().bottom - 10;
    const bordes = parseFloat(estilo.paddingLeft) + parseFloat(estilo.paddingRight) + parseFloat(estilo.borderLeftWidth) + parseFloat(estilo.borderRightWidth);
    const disponible = (alLado ? zona.clientWidth : caja.offsetWidth) - bordes - 4;
    const columnas = Number(t.dataset.columnas);
    const estrecho = disponible < 420;
    const filas = Number(t.dataset.filas) || 5;
    // Con el teclado al lado el tablero usa el alto que queda hasta el final de la ventana;
    // con el teclado debajo (celular) se mantiene la medida de siempre
    const arriba = caja.getBoundingClientRect().top + window.scrollY;
    // En tablet vertical el teclado va debajo del tablero y se descuenta su alto para que se vea sin desplazar
    const tabletVertical = !alLado && disponible >= 600 && panel;
    // Celular: el tablero usa el alto que queda entre lo de arriba y el teclado, para que no haga falta scroll
    const celular = !alLado && esCelular() && panel;
    const libreCelular = celular ? Math.floor(window.innerHeight - arriba - panel.offsetHeight - 40) : 0;
    const altoLibre = celular ? libreCelular - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom) : alLado
      ? window.innerHeight - arriba - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom) - 70
      : tabletVertical
      ? window.innerHeight - arriba - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom) - panel.offsetHeight - 120
      : window.innerHeight - 330;
    // En pantallas estrechas se juntan las casillas para que quepan las divisiones largas
    // La primera columna es la del signo menos: con menos de 22 px se tapa con el número
    let c = 68, m = 24, g = 14, hueco = 5, porAlto = 0, porAncho = 0;
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      m = estrecho ? 22 : Math.max(24, Math.round(c * 0.42));
      g = estrecho ? 8 : Math.max(14, Math.round(c * 0.3));
      hueco = estrecho ? 3 : Math.max(5, Math.round(c * 0.08));
      porAlto = Math.floor((altoLibre - hueco * (filas - 1)) / filas);
      porAncho = Math.floor((disponible - m - g - hueco * (columnas + 2)) / columnas);
      c = Math.max(22, Math.min(celular ? 64 : 100, porAncho, Math.max((alLado || tabletVertical) && !celular ? 34 : 0, porAlto)));
    }
    // La caja llega hasta abajo de la ventana para que no quede espacio vacío debajo,
    // salvo si las casillas no pueden crecer por falta de ancho: ahí quedaría la caja medio vacía
    const faltaAncho = porAncho < Math.min(100, porAlto) - 8;
    caja.style.minHeight = celular ? Math.max(0, libreCelular) + 'px' : alLado && !faltaAncho ? Math.max(0, Math.floor(window.innerHeight - arriba - 70)) + 'px' : '';
    const lateral = t.querySelector('.lateral');
    const aplicar = () => {
      // El ancho que sobra va a la última columna, donde está el panel de la pista en celular
      const usado = m + g + columnas * c + hueco * (columnas + 3);
      t.style.setProperty('--x', lateral ? Math.max(0, Math.floor(disponible - usado - 4)) + 'px' : '0px');
      t.style.setProperty('--c', c + 'px');
      t.style.setProperty('--m', m + 'px');
      t.style.setProperty('--g', g + 'px');
      t.style.setProperty('--h', hueco + 'px');
    };
    aplicar();
    // Si el texto de la pista no cabe en su hueco, las casillas se achican un poco hasta que quepa
    const cabe = () => lateral.scrollWidth <= lateral.clientWidth + 1 && (!celular || t.offsetHeight <= altoLibre + 2);
    for (let vueltas = 0; lateral && vueltas < 20 && c > 22 && !cabe(); vueltas++) {
      c -= 2;
      aplicar();
    }
    // Si aun así no cabe, el tablero se desplaza solo hasta la casilla que toca
    const activa = t.querySelector('.celda.activa');
    if (activa && caja.scrollWidth > caja.clientWidth) caja.scrollLeft = Math.max(0, activa.offsetLeft - caja.clientWidth / 2);
  }
  // En celular (pantalla estrecha) la pista, los errores y los focos van dentro del tablero para no hacer scroll
  const esCelular = () => window.innerWidth < 700;
  let eraCelular = esCelular();
  window.addEventListener('resize', () => {
    if (pantalla !== 'juego' && pantalla !== 'ensenar') return;
    if (esCelular() !== eraCelular) { eraCelular = esCelular(); pintar(); } else ajustarTablero();
  });

  // ---------- rondas ----------
  function empezarRonda(nivel) {
    A.cerrarRondaIncompleta(perfil, perfil.ronda);
    perfil.nivel = nivel;
    perfil.ronda = { nivel, indice: 0, problemas: [], resultados: [], actual: null, parecida: null };
    A.registrarDia(perfil);
    cargarDivision();
    revisarMedalla();
    guardar();
    ir('juego');
    Sonidos.empezar();
  }

  function empezarRondaReloj() {
    A.cerrarRondaIncompleta(perfil, perfil.ronda);
    const reloj = A.asegurarReloj(perfil);
    perfil.ronda = { modo: 'reloj', nivel: 'reloj', escalonInicial: reloj.escalon, indice: 0, problemas: [], resultados: [], actual: null, parecida: null };
    A.registrarDia(perfil);
    cargarDivision();
    revisarMedalla();
    guardar();
    ir('juego');
    Sonidos.empezar();
  }

  function cargarDivision() {
    const r = perfil.ronda;
    if (!r.problemas[r.indice]) {
      const opciones = r.parecida ? { divisor: r.parecida } : {};
      if (esReloj(r)) {
        opciones.escalon = A.asegurarReloj(perfil).escalon;
        r.problemas[r.indice] = Object.assign(A.elegirProblema(perfil, null, opciones), { escalon: opciones.escalon });
      } else r.problemas[r.indice] = A.elegirProblema(perfil, r.nivel, opciones);
      r.parecida = null;
    }
    const p = r.problemas[r.indice];
    const div = D.crearDivision(p.dividendo, p.divisor, p.decimales);
    if (!r.actual) {
      r.actual = { siguiente: 1, errores: 0, ayuda: false, fallos: { cabe: 0, mult: 0, restar: 0, bajar: 0 }, ensenar: false, pista: false, terminada: false, estrellas: 0 };
      r.actual.usado = 0;
      if (esReloj(r)) { r.actual.tiempo = A.tiempoPara(perfil, div.total); r.actual.seg = r.actual.tiempo; }
    }
    // Otra forma de decir las pistas en cada división, pero la misma si se vuelve a abrir
    Pistas.nuevaDivision(r.indice * 31 + p.dividendo % 97 + p.divisor);
    juego = { div, error: null, recien: 0, extra: false, porQue: null, erroresCasilla: 0, conAyuda: false };
  }

  // ---------- ayuda que se retira ----------
  const bombillasRonda = r => A.BOMBILLAS[esReloj(r) ? 'reloj' : r.nivel] || 3;
  const ayudasQuedan = r => Math.max(0, bombillasRonda(r) - (r.ayudasUsadas || 0));
  const recargaRonda = r => A.RECARGA[esReloj(r) ? 'reloj' : r.nivel] || 3;
  // Foco dibujado como una bombilla de verdad: cristal, filamento y casquillo de rosca
  function focoSVG(encendido, ancho) {
    const alto = Math.round(ancho * 1.4);
    return `<svg class="foco-svg" width="${ancho}" height="${alto}" viewBox="0 0 40 56" aria-hidden="true">${encendido ? '<circle cx="20" cy="19" r="20" fill="#FFE680" opacity=".35"/><circle cx="20" cy="19" r="17" fill="#FFE680" opacity=".35"/>' : ''}`
      + `<path d="M20 3C10.5 3 4 10 4 19c0 7 3.8 10.6 7.6 14.6c1.6 1.7 2.4 3.4 2.4 5.4h12c0-2 .8-3.7 2.4-5.4C32.2 29.6 36 26 36 19C36 10 29.5 3 20 3z" fill="${encendido ? '#FFD23F' : '#C9D6DB'}" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/>`
      + `<ellipse cx="20" cy="17" rx="10" ry="9" fill="${encendido ? '#FFF3A6' : '#E8F0F3'}" opacity="${encendido ? '.9' : '.8'}"/>`
      + '<path d="M10.5 14c1.2-4.4 4.2-6.9 8-7.6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>'
      + '<path d="M16.5 38.5L17 27M23.5 38.5L23 27" stroke="#6F8189" stroke-width="1.4" stroke-linecap="round"/>'
      + `<path d="M17 27c1-3.5 2 3.5 3-.5c1 4 2-3 3 .5" fill="none" stroke="${encendido ? '#E65C00' : '#6F8189'}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
      + '<rect x="13" y="39" width="14" height="4" rx="1.2" fill="#D9DEE2" stroke="#000" stroke-width="2"/>'
      + '<path d="M13.5 43h13v3.2h-13zM13.5 46.2h13v3.2h-13z" fill="#B7BFC5" stroke="#000" stroke-width="1.8" stroke-linejoin="round"/>'
      + '<path d="M14 44.6l12-1.2M14 47.8l12-1.2" stroke="#7D878F" stroke-width="1.2"/>'
      + '<path d="M15.5 49.4h9l-2 4.2h-5z" fill="#4A5258" stroke="#000" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }
  // Botón Ayuda: espera a que el alumno lo intente (unos segundos o un error) y se acaba con las bombillas
  function botonAyuda() {
    const r = perfil.ronda;
    if (juego.extra) return '<button class="tecla suave" type="button" data-accion="ayuda" disabled>Ayuda</button>';
    if (!ayudasQuedan(r)) return '<button class="tecla suave espera" type="button" disabled>Sin focos</button>';
    // La espera cuenta desde la última vez que usó la ayuda (no se reinicia en cada casilla)
    const falta = A.esperaAyuda(perfil) - (r.pensadoAyuda || 0);
    if (falta > 0 && !juego.erroresCasilla) {
      const hecho = 1 - falta / A.esperaAyuda(perfil);
      const largo = 2 * Math.PI * 9;
      return `<button class="tecla suave espera" type="button" data-accion="ayuda" disabled aria-label="La ayuda se abre en ${falta} segundos"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3"/><circle cx="12" cy="12" r="9" fill="none" stroke="#FFD23F" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(largo * hecho).toFixed(1)} ${largo.toFixed(1)}" transform="rotate(-90 12 12)"/></svg>Ayuda en ${falta} s</button>`;
    }
    return '<button class="tecla suave lista" type="button" data-accion="ayuda">Ayuda</button>';
  }
  function refrescarAyuda() {
    const b = app.querySelector('.teclado [data-accion="ayuda"], .teclado .tecla.espera');
    if (b && b.classList.contains('espera')) b.outerHTML = botonAyuda();
  }
  function bombillasHTML(r) {
    const total = bombillasRonda(r), quedan = ayudasQuedan(r);
    const iconos = Array.from({ length: total }, (_, i) => focoSVG(i < quedan, 15)).join('');
    const n = recargaRonda(r), va = r.recarga || 0;
    // Mientras falte algún foco se ve cuánto queda para recuperar uno
    const recarga = quedan < total ? `<div class="recarga" title="Recuperas un foco cada ${n} divisiones seguidas sin pedir ayuda"><span>Nuevo foco: ${va} de ${n} sin ayuda</span><span class="recarga-barra">${Array.from({ length: n }, (_, i) => `<i class="${i < va ? 'on' : ''}"></i>`).join('')}</span></div>` : '';
    const aviso = esReloj(r) ? '' : `<small>${quedan ? 'Los focos que guardes valen estrellas si terminas la ronda.' : 'Sin focos: termina la ronda tú solo.'}</small>`;
    return `<div class="bombillas" title="Focos de ayuda de esta ronda">${iconos}<span>${quedan} de ${total}</span>${recarga}${aviso}</div>`;
  }
  // Primera frase de la pista (nivel 2: solo la pregunta)
  const soloPregunta = t => { const m = String(t).match(/^[^?]*\?/) || String(t).match(/^[^.]*\./); return m ? m[0] : t; };

  function continuarRonda() {
    A.registrarDia(perfil);
    cargarDivision();
    revisarMedalla();
    guardar();
    ir('juego');
  }

  function terminarDivision(ensenada) {
    const r = perfil.ronda, a = r.actual;
    const res = { errores: a.errores, ayuda: a.ayuda, ensenada, fallos: a.fallos };
    res.estrellas = A.terminarDivision(perfil, r.nivel, res, juego.div.clave);
    // Las estrellas cuentan en cuanto se ganan: si el alumno sale a mitad de ronda no las pierde
    if (!esReloj(r)) A.sumarEstrellas(perfil, r, res.estrellas);
    // Focos que se recargan: cada tantas divisiones seguidas sin pedir ayuda se recupera uno
    if (a.ayuda || ensenada) r.recarga = 0;
    else if ((r.ayudasUsadas || 0) > 0) {
      r.recarga = (r.recarga || 0) + 1;
      if (r.recarga >= recargaRonda(r)) { r.ayudasUsadas--; r.recarga = 0; a.recuperoFoco = true; }
    }
    // El juego aprende cuánto tarda este alumno (en los dos modos)
    if (!ensenada) A.registrarTiempo(perfil, juego.div.total, a.usado || 0);
    if (esReloj(r)) {
      const reloj = A.asegurarReloj(perfil), escalon = r.problemas[r.indice].escalon;
      const sobra = ensenada ? 0 : a.seg;
      const pts = A.puntosReloj(escalon, a.errores, sobra);
      if (ensenada) { pts.total = Math.floor(pts.base / 2); pts.base = pts.total; pts.extra = 0; }
      const antes = reloj.escalon;
      reloj.escalon = Math.max(1, Math.min(12, antes + A.cambioEscalon(reloj, a.errores, sobra, a.tiempo, ensenada)));
      // En el escalón 1 no se puede bajar ni en el 12 subir: cuenta solo el cambio real
      const cambio = reloj.escalon - antes;
      const mensaje = A.mensajeEscalon(reloj, { antes, despues: reloj.escalon, errores: a.errores, sobra, tiempo: a.tiempo, ensenada });
      Object.assign(res, { puntos: pts.total, sobra, escalonFin: reloj.escalon });
      a.resultado = { base: pts.base, extra: pts.extra, sobra, cambio, escalon: reloj.escalon, mensaje };
    }
    r.resultados[r.indice] = res;
    a.terminada = true;
    a.estrellas = res.estrellas;
    revisarMedalla();
  }

  function siguienteDivision() {
    const r = perfil.ronda;
    r.indice++;
    r.actual = null;
    if (r.indice >= A.POR_RONDA) return finRonda();
    cargarDivision();
    guardar();
    ir('juego');
  }

  function finRonda() {
    const r = perfil.ronda;
    if (esReloj(r)) {
      const res = A.terminarRondaReloj(perfil, r);
      res.lista = r.problemas.map((p, i) => ({ texto: `${p.dividendo}÷${p.divisor}`, puntos: r.resultados[i].puntos, ensenada: r.resultados[i].ensenada, aTiempo: r.resultados[i].sobra > 0 }));
      res.solo = A.rondaSinAyuda(perfil, r.resultados);
      perfil.ronda = null;
      revisarMedalla();
      guardar();
      ir('resumenReloj', { res });
      if (res.record) Sonidos.record(); else Sonidos.fin();
      confeti();
      return;
    }
    const res = A.terminarRonda(perfil, r);
    res.nivel = r.nivel;
    res.lista = r.problemas.map((p, i) => ({ texto: `${p.dividendo}÷${p.divisor}`, estrellas: r.resultados[i].estrellas, ensenada: r.resultados[i].ensenada }));
    // Las bombillas de ayuda que no usó se cambian por estrellas extra
    res.bombillas = ayudasQuedan(r);
    res.focosTotal = bombillasRonda(r);
    perfil.niveles[r.nivel].estrellas += res.bombillas;
    res.solo = A.rondaSinAyuda(perfil, r.resultados);
    perfil.ronda = null;
    revisarMedalla();
    guardar();
    ir('resumen', { res });
    Sonidos.fin();
    confeti();
  }

  function teclear(n) {
    if (pantalla !== 'juego' || !juego) return;
    const a = perfil.ronda.actual;
    if (a.terminada || a.ensenar) return;
    const div = juego.div;
    const celda = div.celdas.find(c => c.orden === a.siguiente);
    if (!celda) return;
    if (n === celda.valor) {
      A.registrarPaso(perfil, celda.tipo, true, div.divisor);
      A.registrarApoyo(perfil, celda.tipo, juego.conAyuda || juego.erroresCasilla > 0);
      Object.assign(juego, { erroresCasilla: 0, conAyuda: false });
      juego.recien = a.siguiente;
      a.siguiente++;
      juego.error = null;
      juego.extra = false;
      juego.porQue = null;
      Sonidos.acierto();
      if (a.siguiente > div.total) terminarDivision(false);
      guardar();
      pintar();
      chispas(app.querySelector(`.celda[data-orden="${juego.recien}"]`));
      if (a.terminada) {
        setTimeout(() => { Sonidos.fin(); confeti(); }, 250);
        if (a.recuperoFoco) { a.recuperoFoco = false; setTimeout(() => aviso(focoSVG(true, 26), `¡Recuperaste un foco! Hiciste ${recargaRonda(perfil.ronda)} divisiones sin pedir ayuda.`), 600); }
        if (a.resultado && a.resultado.cambio > 0) setTimeout(() => Sonidos.subir(), 900);
        if (a.resultado && a.resultado.cambio < 0) setTimeout(() => Sonidos.bajar(), 900);
      }
    } else {
      A.registrarPaso(perfil, celda.tipo, false, div.divisor);
      A.registrarErrorApoyo(perfil, celda.tipo);
      juego.erroresCasilla++;
      a.errores++;
      a.fallos[celda.tipo]++;
      a.pista = true;
      juego.error = n;
      juego.porQue = { n, texto: Pistas.porQue(div, celda, n) };
      Sonidos.error();
      if (a.errores > A.ERRORES_PARA_ENSENAR) a.ensenar = true;
      guardar();
      pintar();
      const marca = juego;
      setTimeout(() => { if (juego === marca && juego.error === n) { juego.error = null; if (pantalla === 'juego') pintar(); } }, 900);
    }
  }

  // ---------- editor de perfil (nombre, dibujo o foto propia) ----------
  const TAM_FOTO = 256;
  function vistaPerfil() {
    return { nombre: perfil.nombre, modo: perfil.foto ? 'foto' : 'dibujo', dibujo: perfil.avatar || 0,
      fuente: perfil.foto || null, ancho: perfil.foto ? TAM_FOTO : 0, alto: perfil.foto ? TAM_FOTO : 0, px: 0, py: 0, zoom: 1, error: '' };
  }

  function prepararEditor() {
    const v = vista;
    // subir foto: botón o arrastrar y soltar
    const zona = app.querySelector('.soltar'), archivo = app.querySelector('#archivo-foto');
    if (archivo) archivo.addEventListener('change', e => leerFoto(e.target.files[0]));
    if (zona) {
      ['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add('encima'); }));
      ['dragleave', 'drop'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.remove('encima'); }));
      zona.addEventListener('drop', e => leerFoto(e.dataTransfer.files[0]));
    }
    const nombre = app.querySelector('#nombre-perfil');
    if (nombre) nombre.addEventListener('input', () => { v.nombre = nombre.value; app.querySelectorAll('.nombre-previo').forEach(x => { x.textContent = nombre.value.trim() || 'Sin nombre'; }); });
    // lo que sigue solo hace falta si ya hay una foto para ajustar
    const recorte = app.querySelector('.recorte'), img = app.querySelector('.recorte img'), escala = app.querySelector('#escala');
    if (!recorte || !img) return;
    const base = () => Math.max(recorte.clientWidth / v.ancho, recorte.clientWidth / v.alto);
    // La foto siempre llena el círculo: con el zoom mínimo cubre todo el aro, sin bordes oscuros
    v.zoomMin = 1;
    const limitar = () => {
      const t = recorte.clientWidth, e = base() * v.zoom;
      const mx = Math.max(0, (v.ancho * e - t) / 2), my = Math.max(0, (v.alto * e - t) / 2);
      v.px = Math.max(-mx, Math.min(mx, v.px)); v.py = Math.max(-my, Math.min(my, v.py));
    };
    const colocar = () => {
      if (!v.fuente || !v.ancho) return;
      limitar();
      const e = base() * v.zoom;
      img.style.width = v.ancho * e + 'px'; img.style.height = v.alto * e + 'px';
      img.style.transform = `translate(calc(-50% + ${v.px}px), calc(-50% + ${v.py}px))`;
      if (v.modo === 'foto') { const url = recortar(96); app.querySelectorAll('.vista-previa').forEach(x => { x.style.backgroundImage = `url(${url})`; }); }
    };
    // Recorta el círculo a una imagen cuadrada pequeña
    const recortar = tam => {
      const c = document.createElement('canvas'); c.width = c.height = tam;
      const t = recorte.clientWidth, e = base() * v.zoom, f = tam / t;
      const g = c.getContext('2d');
      g.fillStyle = '#043A4D'; g.fillRect(0, 0, tam, tam);
      g.drawImage(img, (t / 2 - v.ancho * e / 2 + v.px) * f, (t / 2 - v.alto * e / 2 + v.py) * f, v.ancho * e * f, v.alto * e * f);
      return c.toDataURL('image/jpeg', 0.85);
    };
    v.recortar = () => recortar(TAM_FOTO);
    if (escala) escala.value = v.zoom;
    if (img.complete) colocar(); else img.onload = colocar;
    let arrastre = null;
    recorte.addEventListener('pointerdown', e => { if (!v.fuente) return; arrastre = { x: e.clientX - v.px, y: e.clientY - v.py }; try { recorte.setPointerCapture(e.pointerId); } catch (x) { /* sin captura también funciona */ } });
    recorte.addEventListener('pointermove', e => { if (!arrastre) return; v.px = e.clientX - arrastre.x; v.py = e.clientY - arrastre.y; colocar(); });
    recorte.addEventListener('pointerup', () => { arrastre = null; });
    recorte.addEventListener('wheel', e => { if (!v.fuente) return; e.preventDefault(); v.zoom = Math.max(v.zoomMin || 1, Math.min(3, v.zoom - e.deltaY * 0.001)); if (escala) escala.value = v.zoom; colocar(); }, { passive: false });
    if (escala) escala.addEventListener('input', () => { v.zoom = Number(escala.value); colocar(); });
    v.colocar = colocar;
  }

  // Carga la foto elegida, reducida para no ocupar mucho
  function leerFoto(f) {
    if (!f || !/^image\/(jpeg|png|webp|gif|bmp)$/.test(f.type)) { vista.error = 'Ese archivo no es una imagen. Elige una foto (JPG o PNG).'; return pintar(); }
    if (f.size > MAX_FOTO) { vista.error = 'Esa foto pesa demasiado (más de 15 MB). Elige otra más pequeña.'; return pintar(); }
    const lector = new FileReader();
    lector.onload = () => {
      const i = new Image();
      i.onload = () => {
        const max = 1024, r = Math.min(1, max / Math.max(i.naturalWidth, i.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(i.naturalWidth * r); c.height = Math.round(i.naturalHeight * r);
        c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
        Object.assign(vista, { fuente: c.toDataURL('image/jpeg', 0.9), ancho: c.width, alto: c.height, px: 0, py: 0, zoom: 1.1, modo: 'foto', error: '' });
        pintar();
      };
      i.onerror = () => { vista.error = 'No se pudo abrir esa foto. Prueba con otra.'; pintar(); };
      i.src = lector.result;
    };
    lector.readAsDataURL(f);
  }

  // ---------- pantallas ----------
  const PANTALLAS = {
    alumnos() {
      const lista = datos.alumnos;
      const formAbierto = vista.form || lista.length === 0;
      const tarjetas = lista.map(p => `<button class="perfil-t${vista.elegido === p.id ? ' elegido' : ''}" type="button" data-accion="elegir" data-id="${p.id}" style="--av:${AVATARES[p.avatar][1]}">
          ${avatar(p)}<b>${esc(p.nombre)}</b><small>${nivelDe(p.recomendado).nombre} · ${sumaEstrellas(p)} ★</small></button>`).join('');
      let abajo = '';
      if (vista.elegido && !formAbierto) {
        const p = lista.find(x => x.id === vista.elegido);
        const texto = p.ronda
          ? `Tienes una ronda ${nombreRonda(p.ronda)} a medias: división ${p.ronda.indice + 1} de ${A.POR_RONDA}.`
          : p.historial.length ? `Te recomiendo el nivel ${nivelDe(p.recomendado).nombre}.` : '¡Empecemos a dividir!';
        // Cada botón tiene su color; si coincide con el color del perfil (el fondo) usa otro para que se vea
        const fondo = AVATARES[p.avatar][1];
        const color = (c, otro) => c === fondo ? otro : c;
        const borrar = vista.borrando
          ? `<div class="confirmar-portada" role="alertdialog" aria-label="Borrar alumno"><b>¿Borrar a ${esc(p.nombre)}?</b>
              <span>Se borrarán sus estrellas, medallas y todo lo que el juego aprendió. <strong>No se puede deshacer.</strong></span>
              <div><button class="boton" type="button" data-accion="portada-borrar-no" style="--bb:#22D3EE">No, dejarlo</button>
              <button class="boton" type="button" data-accion="portada-borrar-si" style="--bb:#E0243F">Sí, borrar</button></div></div>`
          : '';
        abajo = `<div class="bienvenida" style="--av:${fondo}">${avatar(p)}
          <div><b>¡Hola${p.historial.length || p.ronda ? ' otra vez' : ''}, ${esc(p.nombre)}!</b>${texto}</div>
          <div class="acciones-b">${p.ronda ? '<button class="boton" type="button" data-accion="continuar-ronda" style="--bb:#03384B">Continuar</button>' : ''}
          <button class="boton" type="button" data-accion="a-niveles" style="--bb:${p.ronda ? color('#B8FF3B', '#22D3EE') : '#03384B'}">${p.ronda ? 'Niveles' : 'Jugar'}</button>
          <button class="boton" type="button" data-accion="a-progreso" style="--bb:${color('#22D3EE', '#FFD23F')}">Mi progreso</button>
          <button class="boton" type="button" data-accion="editar-perfil" style="--bb:#6A45CF">Editar perfil</button>
          <button class="boton borrar-b" type="button" data-accion="portada-borrar" style="--bb:#E0243F"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>Borrar alumno</button></div>${borrar}</div>`;
      }
      if (formAbierto) {
        abajo = `<form class="formulario" data-accion="crear">
          <label for="nombre">${lista.length ? 'Alumno nuevo: ' : ''}¿Cómo te llamas?</label>
          <input id="nombre" minlength="2" maxlength="16" inputmode="text" autocapitalize="words" spellcheck="false" enterkeyhint="done" autocomplete="off" value="${esc(vista.nombre || '')}" placeholder="Escribe tu nombre">
          <small class="nota-nombre">Solo letras, de 2 a 16.</small>
          ${vista.error ? `<span class="aviso-texto">${vista.error}</span>` : ''}
          <span class="rotulo">Elige tu dibujo</span>
          <div class="avatares">${AVATARES.map((a, i) => `<button type="button" data-accion="dibujo" data-i="${i}" aria-pressed="${i === (vista.av || 0)}" style="--av:${a[1]}" aria-label="Dibujo ${a[0]}">${a[0]}</button>`).join('')}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="boton" type="submit">Empezar</button>
          ${lista.length ? '<button class="boton claro" type="button" data-accion="cerrar-form">Cancelar</button>' : ''}</div>
        </form>`;
      }
      return `<div class="portada">
        <div class="portada-logo">${Logo.logoSVG('cuadro', 110)}</div>
        <h1 class="titulo-portada">Juego de Divisiones</h1>
        <p class="lema">Aprende a dividir paso a paso</p>
        <section class="caja-alumnos">
        <h2 class="titulo">¿Quién va a jugar?</h2>
        ${lista.length ? `<div class="perfiles">${tarjetas}${formAbierto ? '' : `<button class="perfil-t" type="button" data-accion="abrir-form" style="--av:#fff;border-style:dashed"><span class="avatar" style="background:transparent;border:2px dashed rgba(255,255,255,.4);color:#fff;box-shadow:none">+</span><b>Nuevo</b><small>Alumno nuevo</small></button>`}</div>` : ''}
        ${abajo}
        <div class="guardado">El nombre y el progreso se guardan en este equipo.</div>
        </section></div>`;
    },

    niveles() {
      const p = perfil;
      const reloj = A.asegurarReloj(p);
      const debil = A.puntoDebil(p);
      let consejo;
      if (!p.historial.length) consejo = 'Empieza por <b>Fácil</b> para calentar. Yo voy aprendiendo de tus errores para darte divisiones a tu medida.';
      else consejo = `Te recomiendo <b>${nivelDe(p.recomendado).nombre}</b>.${debil ? ` Vamos a practicar más: <b>${A.NOMBRE_TIPO[debil]}</b>.` : ''}`;
      const pendiente = p.ronda ? `<div class="pendiente"><span>Tienes una ronda ${nombreRonda(p.ronda)} a medias: división ${p.ronda.indice + 1} de ${A.POR_RONDA}.</span><button class="boton" type="button" data-accion="continuar-ronda">Continuar</button></div>` : '';
      const tarjetas = A.ORDEN_NIVELES.map(id => {
        const n = nivelDe(id), s = p.niveles[id];
        const abierto = A.nivelDisponible(p, id);
        const reco = id === p.recomendado && abierto;
        return `<div class="nivel${abierto ? '' : ' bloq'}" style="--col:${n.color}">
          ${reco ? '<span class="reco">Recomendado</span>' : ''}
          <h3>${n.nombre}</h3><div class="ej">${n.ejemplo}</div><p>${n.texto}</p>
          ${abierto ? `<div>${estrellas(Math.round(s.mejor / A.POR_RONDA))} <small style="font-weight:900;color:var(--suave)">${s.mejor}/${A.POR_RONDA * 3}</small></div>`
            : `<p>Se abre con ${A.ESTRELLAS_PARA_AVANZADO} estrellas en una ronda de Difícil.</p>`}
          <button class="boton" type="button" ${abierto ? `data-accion="jugar" data-nivel="${id}"` : 'disabled'}>${abierto ? 'Jugar' : 'Bloqueado'}</button>
        </div>`;
      }).join('');
      return `<div class="saludo">${avatar(p)}<h1 class="titulo">Hola, ${esc(p.nombre)}</h1>
          <div class="acciones-s"><button class="boton claro" type="button" data-accion="a-progreso">Mi progreso</button>
          <button class="boton claro" type="button" data-accion="a-alumnos">Cambiar alumno</button></div></div>
        ${pendiente}
        <div class="consejo"><span class="bot">÷</span><span>${consejo}</span></div>
        <div class="modos">
          <section class="modo-g" style="--col:var(--lima)">
            <div class="cab-modo"><span class="icono-modo">∞</span><div><h2>Jugar sin reloj</h2><p>A tu ritmo. Elige el nivel y resuelve ${A.POR_RONDA} divisiones paso a paso.</p></div></div>
            <div class="niveles">${tarjetas}</div>
          </section>
          <section class="modo-g reloj-g" style="--col:var(--naranja)">
            <div class="cab-modo"><span class="icono-modo">${ICONO_RELOJ}</span><div><h2>Jugar con reloj</h2><p>El juego elige la dificultad. Termina rápido para ganar puntos extra y subir la escalera.</p></div></div>
            ${escalera(reloj.escalon, 'g')}
            ${leyendaEscalera()}
            <p class="donde">Estás en el <b>escalón ${reloj.escalon}</b>: ${A.ESCALONES[reloj.escalon - 1].texto} (por ejemplo ${A.ESCALONES[reloj.escalon - 1].ejemplo}).</p>
            <p class="donde">Récord: <b>${reloj.record} puntos</b> · Escalón más alto: <b>${reloj.escalonMax || '—'}</b></p>
            <button class="boton" type="button" data-accion="jugar-reloj" style="--bb:var(--naranja)">Jugar con reloj</button>
          </section>
        </div>`;
    },

    juego() {
      const r = perfil.ronda, a = r.actual, div = juego.div, conReloj = esReloj(r);
      const n = conReloj ? { nombre: 'Con reloj', color: 'var(--naranja)', pistaSiempre: r.problemas[r.indice].escalon <= 6 } : nivelDe(r.nivel);
      const prob = r.problemas[r.indice];
      const puntos = [1, 2, 3, 4].map(i => `<span class="punto${i === 4 ? ' ensena' : ''}${a.errores >= i ? ' lleno' : ''}"></span>`).join('');
      let panel, pis = null, verPista = false, info = '';
      if (a.terminada) {
        const ultima = r.indice + 1 >= A.POR_RONDA;
        if (conReloj) {
          const x = a.resultado;
          // Las rondas guardadas antes de esta versión no tienen mensaje
          const m = x.mensaje || { tipo: x.cambio > 0 ? 'sube' : x.cambio < 0 ? 'baja' : 'normal', titulo: x.cambio > 0 ? `¡Subes al escalón ${x.escalon}!` : x.cambio < 0 ? `Bajas al escalón ${x.escalon} para afianzar` : `Sigues en el escalón ${x.escalon}`, texto: '' };
          const cambio = `<div class="cambio ${m.tipo}"><b>${m.titulo}</b>${m.texto ? `<span>${m.texto}</span>` : ''}${m.llenos ? puntitos(m.llenos, `${m.llenos} de 2`) : ''}</div>`;
          panel = `<div class="exito"><b>${x.sobra > 0 ? '¡A tiempo!' : 'Terminada'}</b>${div.dividendo} ÷ ${div.divisor} = ${div.textoCociente}${div.resto ? ` y sobran ${div.resto}` : ''}.
              <span>+${x.base} puntos${x.extra ? ` · +${x.extra} extra por los ${x.sobra} s que sobraron` : ''}</span></div>${cambio}
            <button class="boton grande" type="button" data-accion="siguiente">${ultima ? 'Ver resumen' : 'Siguiente división'}</button>`;
        } else panel = `<div class="exito"><b>¡Muy bien!</b>${div.dividendo} ÷ ${div.divisor} = ${div.textoCociente}${div.resto ? ` y sobran ${div.resto}` : ''}.<span>${div.comprobacion}</span>${estrellas(a.estrellas, 3, true)}</div>
          <button class="boton grande" type="button" data-accion="siguiente">${ultima ? 'Ver resumen' : 'Siguiente división'}</button>`;
      } else if (a.ensenar) {
        panel = `<div class="aviso"><b>${conReloj ? 'El reloj se paró' : `Te equivocaste ${a.errores} veces`}</b>${conReloj ? `Te equivocaste ${a.errores} veces. ` : 'No pasa nada. '}Vamos a resolver esta división juntos, paso a paso.<button class="boton" type="button" data-accion="ensenar">Ver cómo se hace</button></div>`;
      } else {
        const celda = div.celdas.find(c => c.orden === a.siguiente);
        pis = Pistas.pista(div, celda);
        // La pista depende de cuánta ayuda necesita este alumno en este tipo de paso;
        // si se equivoca en la casilla o pide Ayuda, se ve completa
        const nivelAyuda = (juego.erroresCasilla || juego.extra) ? 3 : A.asegurarApoyo(perfil).nivel[celda.tipo];
        verPista = nivelAyuda >= 1;
        const pregunta = celda.tipo === 'cabe' && celda.ciclo ? `¿Qué número por ${div.divisor} se acerca a ${celda.ciclo.p}?` : soloPregunta(pis.pista);
        const texto = nivelAyuda >= 3 ? pis.pista : nivelAyuda === 2 ? pregunta : '';
        const porQue = juego.porQue ? `<div class="por-que"><small>Por qué no vale el ${juego.porQue.n}</small>${juego.porQue.texto}</div>` : '';
        const fichas = pis.fichas ? `<div class="fichas">${pis.fichas.map(f => `<span class="${f.ok ? 'si' : 'no'}">${f.texto} ${f.ok ? '✓' : '✗'}</span>`).join('')}</div>` : '';
        const ayuda = juego.extra ? `<div class="ayuda-caja"><small>Ayuda</small>${pis.ayuda}${fichas}</div>` : '';
        info = `${porQue}${texto ? `<div class="pista">${BOMBILLA}<div><small>Pista</small>${texto}</div></div>` : ''}${ayuda}
          ${conReloj && a.seg <= 0 ? '<div class="sin-tiempo">Se acabó el tiempo. Termínala igual: no pierdes, solo no hay puntos extra.</div>' : ''}
          <div class="errores">Errores ${puntos}<span class="aviso4">${conReloj ? 'al 4.º el reloj se para' : 'al 4.º te enseño'}</span></div>
          ${bombillasHTML(r)}`;
        // En celular cabe un solo texto en el hueco del tablero: la ayuda, si no el porqué del error, si no la pista
        if (esCelular()) info = `${ayuda || porQue || (texto ? `<div class="pista">${BOMBILLA}<div><small>Pista</small>${texto}</div></div>` : '')}
          ${conReloj && a.seg <= 0 ? '<div class="sin-tiempo">Se acabó el tiempo. Termínala igual: no pierdes, solo no hay puntos extra.</div>' : ''}
          <div class="errores">Errores ${puntos}<span class="aviso4">${conReloj ? 'al 4.º el reloj se para' : 'al 4.º te enseño'}</span></div>
          ${bombillasHTML(r)}`;
        panel = `${esCelular() ? '' : info}
          <div class="teclado">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button class="tecla" type="button" data-accion="tecla" data-n="${k}">${k}</button>`).join('')}
            <button class="tecla suave" type="button" data-accion="borrar">Borrar</button>
            <button class="tecla" type="button" data-accion="tecla" data-n="0">0</button>
            ${botonAyuda()}</div>`;
      }
      const f = a.fallos, max = Math.max(...Object.values(f));
      const aprende = max > 0 ? `<div class="aprende">El juego anota tus fallos:${A.TIPOS.filter(t => f[t] > 0).map(t => `<span class="chip${f[t] === max ? ' alto' : ''}">${A.NOMBRE_TIPO[t]} ${f[t]}</span>`).join('')}</div>` : '';
      const avance = ((r.indice + (a.terminada ? 1 : 0)) / A.POR_RONDA) * 100;
      const puntosRonda = conReloj ? r.resultados.reduce((t, x) => t + (x ? x.puntos : 0), 0) : 0;
      const marcadorReloj = conReloj ? `<div class="marcador">${relojRedondo(a.seg, a.tiempo)}
          <div class="puntos-reloj">${puntosRonda}<small>puntos</small></div>
          <div class="info-escalon"><b>Escalón ${r.problemas[r.indice].escalon}</b><span>${a.ensenar ? 'reloj parado' : A.ESCALONES[r.problemas[r.indice].escalon - 1].texto}</span></div>
          ${escalera(r.problemas[r.indice].escalon, 'p')}</div>${a.terminada || a.ensenar ? '' : guiaEscalon(r.problemas[r.indice].escalon)}` : '';
      return `<div class="cabecera"><span class="chip" style="--cc:${n.color}">${n.nombre}</span><span class="cuenta"><span class="solo-grande">División </span>${r.indice + 1} de ${A.POR_RONDA}</span>
          <div class="progreso"><span style="width:${avance}%"></span></div><button class="boton claro" type="button" data-accion="salir">Salir</button></div>
        ${marcadorReloj}
        ${prob.motivo ? `<div class="motivo">${prob.motivo}</div>` : ''}
        <div class="juego">
          <div class="zona"><div class="enunciado">${div.dividendo} ÷ ${div.divisor}</div>
            <div class="tablero-caja">${tablero(div, { hasta: a.siguiente - 1, activa: a.terminada ? 0 : a.siguiente, error: juego.error, recien: juego.recien, luz: verPista ? pis.luz : null, luz2: verPista ? pis.luz2 : null, lateral: esCelular() && info ? info : '' })}</div>${aprende}</div>
          <div class="panel">${panel}</div>
        </div>`;
    },

    ensenar() {
      const div = juego.div, paso = vista.paso || 0, pasos = div.pasos, p = pasos[paso];
      let hasta = 0;
      pasos.slice(0, paso + 1).forEach(x => x.revela.forEach(o => { hasta = Math.max(hasta, o); }));
      const multiplos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => { const v = i * div.divisor; return `<span class="${p.tabla.includes(v) ? 'si' : p.no.includes(v) ? 'no' : ''}">${v}</span>`; }).join('');
      // Se ven 6 pasos a la vez, en vertical: los hechos (celeste), el actual (morado) y los que faltan (gris)
      const inicio = Math.max(0, Math.min(paso - 2, pasos.length - 6));
      // En celular los pasos se ven como una fila de cuadritos (se puede tocar uno) y solo la tarjeta del paso actual
      const ini8 = Math.max(0, Math.min(paso - 3, pasos.length - 8));
      const pastillas = pasos.slice(ini8, ini8 + 8).map((x, k) => { const i = ini8 + k; return `<button type="button" class="pastilla ${i < paso ? 'hecho' : i === paso ? 'actual' : 'falta'}" data-accion="paso-ir" data-i="${i}" aria-label="Paso ${i + 1}">${i < paso ? '✓' : i + 1}</button>`; }).join('');
      const lista = pasos.map((x, i) => `<li data-n="${i + 1}" class="${i < paso ? 'hecho' : i === paso ? 'actual' : 'falta'}${i < inicio || i >= inicio + 6 ? ' lejos' : ''}"><span><small>${NOMBRE_PASO[x.tipo] || ''}</small>${x.texto}</span></li>`).join('');
      const final = p.final ? `<div class="comprobar">${div.comprobacion}<br><button class="boton" type="button" data-accion="hazlo-tu">Ahora hazlo tú con una parecida</button></div>` : '';
      return `<div class="cab-ensenar"><span class="chip">Modo enseñar</span><h2>Hagamos ${div.dividendo} ÷ ${div.divisor} juntos</h2></div>
        <div class="juego">
          <div class="zona"><div class="tablero-caja">${tablero(div, { hasta, nuevas: p.revela, marcadas: p.resaltar || [] })}</div>
            <div class="tabla">Tabla del ${div.divisor}: ${multiplos}</div></div>
          <div class="panel">
            <div class="pastillas" aria-label="Pasos">${pastillas}</div>
            <ol class="pasos">${lista}</ol>
            <div class="controles">
              <button class="boton claro" type="button" data-accion="paso-ant" ${paso === 0 ? 'disabled' : ''}>Anterior</button>
              <button class="boton" type="button" data-accion="paso-sig" ${p.final ? 'disabled' : ''}>Siguiente paso</button>
              <span class="contador">Paso ${paso + 1} de ${pasos.length}</span>
            </div>${final}
          </div>
        </div>`;
    },

    resumen() {
      const r = vista.res, n = nivelDe(r.nivel);
      const proporcion = r.estrellas / (r.total * 3);
      const grandes = proporcion >= 0.85 ? 3 : proporcion >= 0.6 ? 2 : 1;
      const max = Math.max(1, ...A.TIPOS.map(t => r.fallos[t]));
      const nombres = { cabe: '¿Por cuánto multiplico?', mult: 'Multiplicar', restar: 'Restar', bajar: 'Bajar la cifra' };
      const barras = A.TIPOS.map((t, i) => `<div class="barra${t === r.peor ? ' peor' : ''}"><span>${nombres[t]}</span><div class="pista-b"><span style="width:${r.fallos[t] / max * 100}%;animation-delay:${0.3 + i * 0.12}s"></span></div><b>${r.fallos[t]}</b></div>`).join('');
      const cambio = r.recomendado !== r.nivel
        ? `<p style="margin:8px 0 0">${A.ORDEN_NIVELES.indexOf(r.recomendado) > A.ORDEN_NIVELES.indexOf(r.nivel) ? '¡Estás listo para subir a' : 'Te recomiendo practicar en'} <b>${nivelDe(r.recomendado).nombre}</b>.</p>` : '';
      return `<div class="resumen">
        <div class="titulo-res"><h1 class="titulo">¡Ronda terminada!</h1>${estrellas(grandes, 3, true)}</div>
        ${premioAyuda(r)}
        <div class="cifras">
          <div class="cifra" style="--fc:var(--amarillo)"><b>${r.estrellas}</b><span>estrellas de ${r.total * 3}</span></div>
          <div class="cifra" style="--fc:var(--lima)"><b>${r.sinErrores}/${r.total}</b><span>sin errores</span></div>
          <div class="cifra" style="--fc:var(--violeta)"><b>${r.ensenadas}</b><span>veces te enseñé</span></div>
        </div>
        <div class="lista-ronda">${r.lista.map((x, i) => `<div class="mini${x.ensenada ? ' ensenada' : ''}" style="animation-delay:${0.2 + i * 0.04}s">${x.texto}${estrellas(x.estrellas)}</div>`).join('')}</div>
        <div class="col2">
          <div class="bloque"><h3>Dónde te equivocaste</h3>${barras}${leyenda('Cada barra cuenta tus errores en ese paso de la división en esta ronda. La barra rosa es el paso donde más fallaste.')}</div>
          <div class="aprendio"><h3>Lo que aprendí de ti</h3>${esc(r.aprendi)}${cambio}</div>
        </div>
        <div class="acciones">
          <button class="boton" type="button" data-accion="jugar" data-nivel="${r.nivel}">Otra ronda en ${n.nombre}</button>
          ${r.recomendado !== r.nivel ? `<button class="boton" type="button" data-accion="jugar" data-nivel="${r.recomendado}" style="--bb:var(--cian)">Jugar ${nivelDe(r.recomendado).nombre}</button>` : ''}
          <button class="boton claro" type="button" data-accion="a-progreso">Mi progreso</button>
          <button class="boton claro" type="button" data-accion="a-niveles">Niveles</button>
        </div></div>`;
    },

    perfil() {
      const v = vista, a = AVATARES[v.dibujo] || AVATARES[0];
      const previo = tam => v.modo === 'foto' && v.fuente
        ? `<span class="avatar con-foto vista-previa" style="width:${tam}px;height:${tam}px;flex:0 0 ${tam}px"></span>`
        : `<span class="avatar" style="--av:${a[1]};width:${tam}px;height:${tam}px;flex:0 0 ${tam}px;font-size:${Math.round(tam * 0.55)}px">${a[0]}</span>`;
      const dibujos = AVATARES.map((d, i) => `<button class="dib" type="button" data-accion="perfil-dibujo" data-i="${i}" aria-pressed="${v.modo === 'dibujo' && v.dibujo === i}" style="--av:${d[1]}" aria-label="Dibujo ${d[0]}">${d[0]}</button>`).join('')
        + (v.fuente ? `<button class="dib con-foto vista-previa" type="button" data-accion="perfil-usar-foto" aria-pressed="${v.modo === 'foto'}" aria-label="Usar mi foto"></button>` : '');
      const nombre = esc((v.nombre || '').trim() || 'Sin nombre');
      return `<h1 class="titulo">Editar perfil</h1>
        <div class="editor">
          <div class="tarjeta-editor">
            <label class="rotulo" for="nombre-perfil">Nombre</label>
            <input id="nombre-perfil" minlength="2" maxlength="16" inputmode="text" autocapitalize="words" spellcheck="false" enterkeyhint="done" autocomplete="off" value="${esc(v.nombre)}">
            <small class="nota-nombre">Solo letras, de 2 a 16.</small>
            <span class="rotulo">Tu imagen: un dibujo o tu foto</span>
            <div class="opciones-imagen">${dibujos}</div>
            <label class="soltar">
              <input type="file" id="archivo-foto" accept="image/*">
              <span class="icono-foto"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span>
              <b>${v.fuente ? 'Cambiar la foto' : 'Subir una foto'}</b>
              <small>Toca aquí para elegirla o arrástrala y suéltala en este recuadro</small>
            </label>
            ${v.error ? `<div class="aviso-texto">${v.error}</div>` : ''}
          </div>
          <div class="tarjeta-editor">
            ${v.fuente ? `<span class="rotulo">Ajusta tu foto</span>
            <div class="recorte"><img src="${v.fuente}" alt="Tu foto"><div class="mascara"></div><div class="aro"></div><div class="guia">Arrastra para mover</div></div>
            <div class="zoom"><button type="button" data-accion="perfil-zoom" data-d="-0.15" aria-label="Alejar">−</button><input type="range" id="escala" min="1" max="3" step="0.01" aria-label="Acercar o alejar"><button type="button" data-accion="perfil-zoom" data-d="0.15" aria-label="Acercar">+</button></div>
            <button class="boton claro" type="button" data-accion="perfil-centrar">Centrar</button>`
            : '<p class="sin-foto">Si subes una foto, aquí podrás moverla y acercarla para que quede bien en el círculo.</p>'}
            <span class="rotulo">Así se verá</span>
            <div class="vistas">
              <div><div class="tarjeta-mini">${previo(56)}<b class="nombre-previo">${nombre}</b></div>Portada</div>
              <div><div class="cab-mini">${previo(40)}<b>Hola, <span class="nombre-previo">${nombre}</span></b></div>Arriba en el juego</div>
              <div>${previo(92)}Mi progreso</div>
            </div>
          </div>
        </div>
        <div class="acciones-perfil"><button class="boton" type="button" data-accion="perfil-guardar" style="--bb:var(--lima)">Guardar</button><button class="boton claro" type="button" data-accion="perfil-cancelar">Cancelar</button></div>`;
    },

    resumenReloj() {
      const r = vista.res;
      const max = Math.max(1, ...A.TIPOS.map(t => r.fallos[t]));
      const nombres = { cabe: '¿Por cuánto multiplico?', mult: 'Multiplicar', restar: 'Restar', bajar: 'Bajar la cifra' };
      const barras = A.TIPOS.map((t, i) => `<div class="barra${t === r.peor ? ' peor' : ''}"><span>${nombres[t]}</span><div class="pista-b"><span style="width:${r.fallos[t] / max * 100}%;animation-delay:${0.3 + i * 0.12}s"></span></div><b>${r.fallos[t]}</b></div>`).join('');
      const camino = r.camino.map((v, i) => `<div class="semana"><span>${v}</span><i style="height:${v / 12 * 80}px;background:${colorEscalon(v)};animation-delay:${0.2 + i * 0.05}s"></i><span>${i + 1}</span></div>`).join('');
      return `<div class="resumen">
        <div class="titulo-res"><h1 class="titulo">¡Ronda con reloj terminada!</h1><div class="puntos-grandes">${r.puntos}</div>${r.record ? '<div class="nuevo-record">¡Nuevo récord!</div>' : ''}</div>
        ${premioAyuda(r)}
        <div class="cifras">
          <div class="cifra" style="--fc:var(--lima)"><b>${r.sinErrores}/${r.total}</b><span>sin errores</span></div>
          <div class="cifra" style="--fc:var(--amarillo)"><b>${r.aTiempo}</b><span>a tiempo</span></div>
          <div class="cifra" style="--fc:var(--cian)"><b>${r.escalonMax}</b><span>escalón más alto</span></div>
        </div>
        ${escalera(r.escalonFinal, 'g')}
        ${leyendaEscalera()}
        <div class="col2">
          <div class="bloque"><h3>Tu camino por la escalera</h3><div class="semanas camino">${camino}</div>${leyenda('Cada barra es una división de la ronda (abajo, de la 1 a la 13). El número de arriba es el escalón en que quedaste después de hacerla.', COLORES_ESCALERA)}</div>
          <div class="bloque"><h3>Dónde te equivocaste</h3>${barras}${leyenda('Cada barra cuenta tus errores en ese paso de la división en esta ronda. La barra rosa es el paso donde más fallaste.')}</div>
        </div>
        <div class="aprendio"><h3>Lo que aprendí de ti</h3>${esc(r.aprendi)}</div>
        <div class="acciones">
          <button class="boton" type="button" data-accion="jugar-reloj" style="--bb:var(--naranja)">Otra ronda con reloj</button>
          <button class="boton claro" type="button" data-accion="a-progreso">Mi progreso</button>
          <button class="boton claro" type="button" data-accion="a-niveles">Salir</button>
        </div></div>`;
    },

    progreso() {
      const p = perfil;
      const reloj = A.asegurarReloj(p);
      const racha = A.racha(p);
      const niveles = A.ORDEN_NIVELES.map((id, i) => {
        const n = nivelDe(id), abierto = A.nivelDisponible(p, id), mejor = p.niveles[id].mejor;
        return `<div class="fila-nivel" style="--col:${n.color}"><span>${n.nombre}</span><div class="pista-b"><span style="width:${abierto ? mejor / (A.POR_RONDA * 3) * 100 : 0}%;animation-delay:${0.2 + i * 0.12}s"></span></div><b>${abierto ? `${mejor}/${A.POR_RONDA * 3}` : 'cerrado'}</b></div>`;
      }).join('');
      const ev = A.evolucionSemanal(p);
      const maxS = Math.max(1, ...ev.semanas.map(s => s.valor));
      const hayErrores = ev.semanas.some(s => s.valor > 0);
      const primero = ev.semanas.find(s => s.valor > 0), ultimo = ev.semanas[3];
      const nota = !hayErrores ? '' : ultimo.valor < primero.valor ? 'Cada semana te equivocas menos.' : 'Este paso todavía cuesta: el juego te dará más práctica.';
      const grafica = hayErrores
        ? `<div class="semanas">${ev.semanas.map((s, i) => `<div class="semana"><span>${s.valor}</span><i style="height:${s.valor / maxS * 80}px;animation-delay:${0.2 + i * 0.12}s${i === 3 && ultimo.valor < primero.valor ? ';background:var(--lima)' : ''}"></i><span>${s.etiqueta}</span></div>`).join('')}</div><div class="nota-grafica">${nota}</div>`
        : '<p style="margin:0;color:var(--suave);font-weight:800">Todavía no hay errores que mostrar. ¡Sigue jugando!</p>';
      const medallas = A.MEDALLAS.map((m, i) => `<div class="medalla${p.medallas[m.id] ? '' : ' bloq'}" style="--col:${m.color}"><i style="animation-delay:${0.3 + i * 0.08}s">${m.icono}</i>${m.texto}</div>`).join('');
      const hist = p.historial.slice(0, 6).map(h => { const [y, mm, dd] = h.fecha.split('-'); return `<li><span>${dd}/${mm}/${y.slice(2)}</span><span>${nivelDe(h.nivel).nombre} · ${h.bien}/${A.POR_RONDA} sin errores</span><span style="color:var(--amarillo)">★ ${h.estrellas}</span></li>`; }).join('');
      const borrar = vista.confirmar
        ? `<div class="confirmar"><span>¿Borrar a ${esc(p.nombre)} y todo su progreso? No se puede deshacer.</span><div><button class="boton peligro" type="button" data-accion="borrar-si">Sí, borrar</button><button class="boton claro" type="button" data-accion="borrar-no">No</button></div></div>`
        : '<button class="enlace" type="button" data-accion="borrar-pedir">Borrar este alumno</button>';
      return `<div class="progreso-cab">${avatar(p)}<h1 class="titulo">Progreso de ${esc(p.nombre)}</h1>${racha ? `<span class="chip"><span class="racha">●</span> ${racha} ${racha === 1 ? 'día' : 'días seguidos'}</span>` : ''}
          <div class="acciones-s"><button class="boton claro" type="button" data-accion="editar-perfil">Editar perfil</button><button class="boton" type="button" data-accion="informe" style="--bb:var(--cian)">${vista.creando ? 'Creando informe…' : 'Descargar informe PDF'}</button>
          <button class="boton" type="button" data-accion="a-niveles" style="--bb:var(--naranja)">Jugar</button></div></div>
        <div class="cifras cuatro">
          <div class="cifra" style="--fc:var(--amarillo)"><b>${sumaEstrellas(p)}</b><span>estrellas</span></div>
          <div class="cifra" style="--fc:var(--cian)"><b>${p.contadores.divisiones}</b><span>divisiones hechas</span></div>
          <div class="cifra" style="--fc:var(--lima)"><b>${Object.keys(p.medallas).length}</b><span>medallas</span></div>
          <div class="cifra" style="--fc:var(--rosa)"><b>${nivelDe(p.recomendado).nombre}</b><span>nivel recomendado</span></div>
        </div>
        <div class="bloques">
          <div class="bloque"><h3>Mejor ronda por nivel</h3>${niveles}${leyenda(`Cada barra muestra las estrellas de tu mejor ronda sin reloj en ese nivel. El máximo es ${A.POR_RONDA * 3} (3 por división).`)}</div>
          <div class="bloque"><h3>Errores en «${ev.nombre}», por semana</h3>${grafica}${hayErrores ? leyenda('Cada barra cuenta los errores en este paso durante una semana. «Esta» es la semana actual. Si esta semana te equivocaste menos que al principio, su barra sale verde.', [['var(--rosa)', 'semanas anteriores o sin mejora'], ['var(--lima)', 'esta semana, mejorando']]) : ''}</div>
          <div class="bloque"><h3>Modo con reloj</h3>${escalera(reloj.escalon, 'g')}${leyendaEscalera()}
            <p class="dato-reloj">Escalón actual: <b>${reloj.escalon}</b> · Más alto: <b>${reloj.escalonMax || '—'}</b> · Récord: <b>${reloj.record} puntos</b></p>
            ${reloj.rondas.length ? `<ul class="historial">${reloj.rondas.slice(0, 3).map(h => { const [y, mm, dd] = h.fecha.split('-'); return `<li><span>${dd}/${mm}/${y.slice(2)}</span><span>Escalón ${h.escalonInicial} → ${h.escalonFinal}</span><span style="color:var(--amarillo)">${h.puntos} pts</span></li>`; }).join('')}</ul>` : '<span class="historial vacio">Todavía no jugaste con reloj.</span>'}</div>
          <div class="bloque"><h3>Medallas</h3><div class="medallas">${medallas}</div></div>
          <div class="bloque"><h3>Cuánta ayuda necesitas en cada paso</h3>${ayudaPorPaso(p)}${leyenda('Cada cuadrito lleno es un nivel menos de ayuda. Con los 4 llenos ya lo haces solo. Si te equivocas seguido en un paso, la ayuda vuelve.')}</div>
          <div class="bloque"><h3>Últimas rondas</h3>${hist ? `<ul class="historial">${hist}</ul>` : '<span class="historial vacio">Todavía no terminaste ninguna ronda.</span>'}</div>
        </div>
        <div class="zona-borrar">${borrar}</div>`;
    }
  };

  function sumaEstrellas(p) { return A.ORDEN_NIVELES.reduce((s, id) => s + p.niveles[id].estrellas, 0); }

  const TEXTO_AYUDA = ['Lo haces solo', 'Solo se iluminan', 'Solo la pregunta', 'Ayuda completa'];
  function ayudaPorPaso(p) {
    const ap = A.asegurarApoyo(p);
    return A.TIPOS.map(t => {
      const llenos = 4 - ap.nivel[t];
      const cuadros = [0, 1, 2, 3].map(i => `<i class="${i < llenos ? 'on' : ''}"></i>`).join('');
      return `<div class="fila-ayuda"><span>${NOMBRE_PASO[t]}</span><div class="cuadros">${cuadros}</div><b class="${ap.nivel[t] === 0 ? 'solo' : ''}">${TEXTO_AYUDA[ap.nivel[t]]}</b></div>`;
    }).join('');
  }
  function premioAyuda(r) {
    const partes = [];
    if (r.solo) partes.push('<div class="premio-solo"><span class="medalla-grande">★</span><div><b>¡Lo hiciste solo!</b><span>Terminaste la ronda sin pedir ayuda. Ganaste la medalla «Lo hice solo».</span></div></div>');
    // Barra de focos: los que guardó (encendidos) se cambian por estrellas; solo al terminar la ronda
    if (r.focosTotal) {
      const focos = Array.from({ length: r.focosTotal }, (_, i) => focoSVG(i < r.bombillas, 30)).join('');
      partes.push(`<div class="barra-focos"><div class="focos">${focos}</div><div><b>${r.bombillas ? `Guardaste ${r.bombillas} de ${r.focosTotal} ${r.focosTotal === 1 ? 'foco' : 'focos'}` : 'Usaste todos tus focos'}</b>
        <span>${r.bombillas ? `Se cambiaron por <strong>+${r.bombillas} ${r.bombillas === 1 ? 'estrella' : 'estrellas'}</strong>.` : 'En la próxima ronda intenta guardar alguno: cada foco guardado vale una estrella.'}</span></div></div>`);
    }
    return partes.join('');
  }

  // ---------- acciones ----------
  const ACCIONES = {
    elegir(b) { vista = { elegido: b.dataset.id }; perfil = datos.alumnos.find(p => p.id === b.dataset.id); datos.ultimo = perfil.id; guardar(); pintar(); },
    'abrir-form'() { vista = { form: true, av: datos.alumnos.length % AVATARES.length }; pintar(); const i = document.getElementById('nombre'); if (i) i.focus(); },
    'cerrar-form'() { vista = {}; pintar(); },
    dibujo(b) { vista.nombre = document.getElementById('nombre').value; vista.av = Number(b.dataset.i); pintar(); },
    'a-niveles'() { ir('niveles'); },
    'a-progreso'() { ir('progreso'); },
    'a-alumnos'() { ir('alumnos', { elegido: perfil && perfil.id }); },
    'continuar-ronda'() { continuarRonda(); },
    jugar(b) { empezarRonda(b.dataset.nivel); },
    'jugar-reloj'() { empezarRondaReloj(); },
    tecla(b) { teclear(Number(b.dataset.n)); },
    borrar() { if (juego) { juego.error = null; pintar(); } },
    ayuda() {
      const r = perfil.ronda;
      if (!juego || juego.extra || !ayudasQuedan(r)) return;
      if (A.esperaAyuda(perfil) - (r.pensadoAyuda || 0) > 0 && !juego.erroresCasilla) return;
      r.ayudasUsadas = (r.ayudasUsadas || 0) + 1;
      r.pensadoAyuda = 0;
      A.registrarPedidoAyuda(perfil);
      r.actual.ayuda = true; juego.extra = true; juego.conAyuda = true;
      guardar(); pintar();
    },
    salir() { guardar(); ir('niveles'); },
    siguiente() { siguienteDivision(); },
    ensenar() { ir('ensenar', { paso: 0 }); },
    'paso-sig'() { if (vista.paso < juego.div.pasos.length - 1) { vista.paso++; pintar(); Sonidos.paso(); } },
    'paso-ant'() { if (vista.paso > 0) { vista.paso--; pintar(); Sonidos.paso(); } },
    'paso-ir'(b) { const i = Number(b.dataset.i); if (i >= 0 && i < juego.div.pasos.length && i !== (vista.paso || 0)) { vista.paso = i; pintar(); Sonidos.paso(); } },
    'hazlo-tu'() {
      terminarDivision(true);
      perfil.ronda.parecida = juego.div.divisor;
      siguienteDivision();
    },
    async informe() {
      if (vista.creando) return;
      vista.creando = true; pintar();
      try {
        const r = await Informe.guardar(perfil);
        aviso(r.ok ? '✓' : '!', r.texto);
      } catch (e) {
        aviso('!', 'No se pudo crear el informe. Inténtalo otra vez.');
      }
      vista.creando = false;
      if (pantalla === 'progreso') pintar();
    },
    'editar-perfil'() { const volver = pantalla; ir('perfil', Object.assign(vistaPerfil(), { volver })); },
    'perfil-dibujo'(b) { vista.nombre = app.querySelector('#nombre-perfil').value; vista.modo = 'dibujo'; vista.dibujo = Number(b.dataset.i); pintar(); },
    'perfil-usar-foto'() { vista.nombre = app.querySelector('#nombre-perfil').value; vista.modo = 'foto'; pintar(); },
    'perfil-zoom'(b) { vista.zoom = Math.max(vista.zoomMin || 1, Math.min(3, vista.zoom + Number(b.dataset.d))); const e = app.querySelector('#escala'); if (e) e.value = vista.zoom; if (vista.colocar) vista.colocar(); },
    'perfil-centrar'() { vista.px = 0; vista.py = 0; if (vista.colocar) vista.colocar(); },
    'perfil-cancelar'() { ir(vista.volver === 'progreso' ? 'progreso' : 'alumnos', vista.volver === 'progreso' ? {} : { elegido: perfil.id }); },
    'perfil-guardar'() {
      const nombre = limpiarNombre(app.querySelector('#nombre-perfil').value);
      const fallo = errorNombre(nombre);
      if (fallo) { vista.error = fallo; vista.nombre = nombre; return pintar(); }
      if (datos.alumnos.some(x => x !== perfil && x.nombre.toLowerCase() === nombre.toLowerCase())) { vista.error = 'Ya hay otro alumno con ese nombre.'; vista.nombre = nombre; return pintar(); }
      perfil.nombre = nombre;
      perfil.avatar = vista.dibujo;
      perfil.foto = vista.modo === 'foto' && vista.fuente && vista.recortar ? vista.recortar() : (vista.modo === 'foto' ? perfil.foto : null);
      guardar();
      aviso('✓', 'Perfil guardado.');
      ir(vista.volver === 'progreso' ? 'progreso' : 'alumnos', vista.volver === 'progreso' ? {} : { elegido: perfil.id });
    },
    'borrar-pedir'() { vista.confirmar = true; pintar(); },
    'borrar-no'() { vista.confirmar = false; pintar(); },
    'borrar-si'() {
      datos.alumnos = datos.alumnos.filter(p => p.id !== perfil.id);
      if (datos.ultimo === perfil.id) datos.ultimo = null;
      perfil = null;
      guardar();
      ir('alumnos');
    },
    // Borrar desde la portada: primero pregunta con el nombre del alumno
    'portada-borrar'() { vista.borrando = true; pintar(); const b = app.querySelector('[data-accion="portada-borrar-no"]'); if (b) b.focus(); },
    'portada-borrar-no'() { vista.borrando = false; pintar(); },
    'portada-borrar-si'() {
      const id = vista.elegido;
      datos.alumnos = datos.alumnos.filter(p => p.id !== id);
      if (datos.ultimo === id) datos.ultimo = null;
      if (perfil && perfil.id === id) perfil = null;
      guardar();
      aviso('✓', 'Alumno borrado.');
      ir('alumnos');
    }
  };

  app.addEventListener('click', e => {
    const b = e.target.closest('button[data-accion]');
    if (!b || b.disabled) return;
    if (!['tecla', 'paso-sig', 'paso-ant', 'jugar', 'jugar-reloj', 'continuar-ronda'].includes(b.dataset.accion)) Sonidos.tecla();
    ACCIONES[b.dataset.accion] && ACCIONES[b.dataset.accion](b);
  });

  // Mientras se escribe el nombre se quitan los números y símbolos que no valen (<, >, emojis...)
  app.addEventListener('input', e => {
    const t = e.target;
    if (t.id !== 'nombre' && t.id !== 'nombre-perfil') return;
    const permitido = Array.from(t.value.replace(NO_PERMITIDO, '').replace(/\s{2,}/g, ' ')).slice(0, MAX_NOMBRE).join('');
    if (permitido !== t.value) t.value = permitido;
  }, true);

  app.addEventListener('submit', e => {
    e.preventDefault();
    Sonidos.tecla();
    const nombre = limpiarNombre(document.getElementById('nombre').value);
    vista.nombre = nombre;
    if (!nombre) { vista.error = 'Escribe tu nombre para empezar.'; return pintar(); }
    const fallo = errorNombre(nombre);
    if (fallo) { vista.error = fallo; return pintar(); }
    if (datos.alumnos.length >= MAX_ALUMNOS) { vista.error = `Ya hay ${MAX_ALUMNOS} alumnos, que es el máximo. Borra alguno que ya no juegue para añadir otro.`; return pintar(); }
    if (datos.alumnos.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) { vista.error = 'Ya hay un alumno con ese nombre. Toca su tarjeta o escribe otro.'; return pintar(); }
    perfil = A.nuevoPerfil(nombre, vista.av || 0);
    datos.alumnos.push(perfil);
    datos.ultimo = perfil.id;
    guardar();
    ir('niveles');
  });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (pantalla === 'juego') {
      if (/^[0-9]$/.test(e.key)) {
        const b = app.querySelector(`.tecla[data-n="${e.key}"]`);
        if (b) { b.classList.add('pulsada'); setTimeout(() => b.classList.remove('pulsada'), 120); }
        teclear(Number(e.key));
      } else if (e.key === 'Backspace') ACCIONES.borrar();
      else if (e.key === 'Enter' && perfil.ronda && perfil.ronda.actual && perfil.ronda.actual.terminada) siguienteDivision();
    } else if (pantalla === 'ensenar') {
      if (e.key === 'ArrowRight' || e.key === 'Enter') ACCIONES['paso-sig']();
      else if (e.key === 'ArrowLeft') ACCIONES['paso-ant']();
    }
  });

  const botonSonido = document.getElementById('boton-sonido');
  function pintarSonido() {
    botonSonido.innerHTML = Sonidos.activo ? ICONO_SONIDO : ICONO_MUDO;
    botonSonido.setAttribute('aria-label', Sonidos.activo ? 'Quitar sonido' : 'Poner sonido');
  }
  botonSonido.addEventListener('click', () => {
    Sonidos.activo = !Sonidos.activo;
    datos.sonido = Sonidos.activo;
    guardar();
    pintarSonido();
    Sonidos.tecla();
  });
  pintarSonido();

  // Cuenta el tiempo de cada división (en los dos modos) y mueve el reloj en el modo con reloj.
  // Solo avanza en la pantalla de juego, con la división sin terminar y sin el modo enseñar.
  let ultimoGuardado = 0;
  setInterval(() => {
    if (pantalla !== 'juego' || !perfil || !perfil.ronda || document.hidden) return;
    const a = perfil.ronda.actual;
    if (!a || a.terminada || a.ensenar) return;
    a.usado = (a.usado || 0) + 1;
    if (juego) { perfil.ronda.pensadoAyuda = (perfil.ronda.pensadoAyuda || 0) + 1; refrescarAyuda(); }
    if (!esReloj(perfil.ronda) || a.seg <= 0) return;
    a.seg--;
    const r = app.querySelector('.reloj');
    if (r) r.outerHTML = relojRedondo(a.seg, a.tiempo);
    if (a.seg === 0) { Sonidos.tiempo(); pintar(); guardar(); }
    else if (a.seg <= 10) Sonidos.tictac();
    else if (Date.now() - ultimoGuardado > 5000) { ultimoGuardado = Date.now(); guardar(); }
  }, 1000);

  document.getElementById('logo-dibujo').innerHTML = Logo.logoSVG('cuadro', 40);

  // Arranque: saluda al último alumno que jugó
  const ultimo = datos.alumnos.find(p => p.id === datos.ultimo);
  if (ultimo) { perfil = ultimo; vista = { elegido: ultimo.id }; }
  pintar();
});
