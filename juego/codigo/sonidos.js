// Sonidos cortos generados al momento (no necesitan archivos).
(function (global) {
  'use strict';
  let ctx = null;
  let activo = true;

  function contexto() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function nota(freq, inicio, duracion, tipo, volumen, freqFinal) {
    const c = contexto();
    if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo || 'sine';
    const t = c.currentTime + inicio;
    o.frequency.setValueAtTime(freq, t);
    if (freqFinal) o.frequency.exponentialRampToValueAtTime(freqFinal, t + duracion);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volumen || 0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + duracion + 0.05);
  }

  const S = {
    // botones: un «pop» corto
    tecla() { if (!activo) return; nota(420, 0, 0.09, 'sine', 0.16, 880); },
    acierto() { if (!activo) return; nota(660, 0, 0.14, 'sine', 0.2); nota(990, 0.07, 0.2, 'sine', 0.2); },
    error() { if (!activo) return; nota(220, 0, 0.22, 'triangle', 0.22); nota(170, 0.1, 0.28, 'triangle', 0.2); },
    fin() { if (!activo) return; [523, 659, 784, 1046].forEach((f, i) => nota(f, i * 0.11, 0.32, 'sine', 0.2)); },
    medalla() { if (!activo) return; [784, 988, 1175, 1568].forEach((f, i) => nota(f, i * 0.09, 0.35, 'triangle', 0.17)); },
    empezar() { if (!activo) return; nota(330, 0, 0.35, 'sine', 0.16, 990); nota(1320, 0.3, 0.2, 'triangle', 0.12); },
    // modo con reloj
    tictac() { if (!activo) return; nota(1400, 0, 0.05, 'square', 0.05); },
    tiempo() { if (!activo) return; nota(300, 0, 0.5, 'sawtooth', 0.09, 150); },
    subir() { if (!activo) return; [523, 659, 784, 1046, 1318].forEach((f, i) => nota(f, i * 0.07, 0.22, 'triangle', 0.16)); },
    bajar() { if (!activo) return; [659, 523, 440].forEach((f, i) => nota(f, i * 0.12, 0.28, 'sine', 0.15)); },
    record() { if (!activo) return; [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => nota(f, i * 0.1, 0.3, 'triangle', 0.18)); },
    // modo enseñar
    paso() { if (!activo) return; nota(880, 0, 0.18, 'sine', 0.13); nota(1320, 0.06, 0.22, 'sine', 0.08); },
    set activo(v) { activo = v; },
    get activo() { return activo; }
  };
  global.Sonidos = S;
})(window);
