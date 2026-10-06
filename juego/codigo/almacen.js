// Guarda alumnos y todo lo que el juego aprende de ellos en el propio equipo (PC o celular).
// Hay dos lugares: el almacenamiento de la página y una copia de seguridad
// (archivo datos-juego.json en la PC; almacenamiento propio de Android en el celular).
// Al abrir el juego se usa el que tenga más información.
(function (global) {
  'use strict';
  const CLAVE = 'juegoDivisiones.v1';
  const vacio = () => ({ alumnos: [], ultimo: null, sonido: true });
  const valido = d => d && Array.isArray(d.alumnos);
  const nativo = () => !!(global.Capacitor && global.Capacitor.isNativePlatform && global.Capacitor.isNativePlatform());
  // Cuánta información tiene una copia: alumnos y divisiones hechas
  const cantidad = d => d ? d.alumnos.reduce((t, p) => t + 1 + ((p.contadores && p.contadores.divisiones) || 0), 0) : -1;

  function leerLocal() {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE));
      if (valido(d)) return d;
    } catch (e) { /* datos dañados o almacenamiento bloqueado */ }
    return null;
  }

  async function leerCopia() {
    try {
      let texto = null;
      if (global.escritorio && global.escritorio.leerDatos) texto = await global.escritorio.leerDatos();
      else if (nativo()) texto = (await global.Capacitor.Plugins.Preferences.get({ key: CLAVE })).value;
      if (texto) { const d = JSON.parse(texto); if (valido(d)) return d; }
    } catch (e) { /* sin copia de seguridad */ }
    return null;
  }

  function escribirCopia(texto) {
    try {
      if (global.escritorio && global.escritorio.guardarDatos) global.escritorio.guardarDatos(texto);
      else if (nativo()) global.Capacitor.Plugins.Preferences.set({ key: CLAVE, value: texto });
    } catch (e) { /* la copia principal ya está guardada */ }
  }

  let iniciales = null;
  async function preparar() {
    const local = leerLocal(), copia = await leerCopia();
    let elegido = local;
    if (copia && cantidad(copia) > cantidad(local)) {
      elegido = copia;
      try { localStorage.setItem(CLAVE, JSON.stringify(copia)); } catch (e) { /* se sigue con la copia */ }
    }
    iniciales = elegido || vacio();
    // Si la copia de seguridad está atrasada, se pone al día
    if (elegido && cantidad(copia) < cantidad(elegido)) escribirCopia(JSON.stringify(elegido));
    return iniciales;
  }

  function leer() { return iniciales || leerLocal() || vacio(); }

  let ultimoTexto = null, pendiente = null;
  function guardar(datos) {
    const texto = JSON.stringify(datos);
    let ok = true;
    try { localStorage.setItem(CLAVE, texto); } catch (e) { ok = false; }
    // La copia de seguridad se escribe agrupada, no a cada tecla
    ultimoTexto = texto;
    clearTimeout(pendiente);
    pendiente = setTimeout(() => { escribirCopia(ultimoTexto); pendiente = null; }, 500);
    return ok;
  }

  // Al cerrar o esconder el juego, la copia se escribe enseguida
  function vaciarPendiente() {
    if (pendiente) { clearTimeout(pendiente); pendiente = null; escribirCopia(ultimoTexto); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) vaciarPendiente(); });
  global.addEventListener('pagehide', vaciarPendiente);
  global.addEventListener('beforeunload', vaciarPendiente);

  global.Almacen = { preparar, leer, guardar };
})(window);
