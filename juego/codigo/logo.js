// Logo del juego: escalera 3D de colores con la ficha ÷ en lo más alto.
// fondo: 'cuadro' (icono de app), 'circulo' (icono redondo) o 'ninguno' (solo el dibujo, con margen).
(function (global) {
  'use strict';
  const DIBUJO = `
      <g stroke="#000" stroke-width="3" stroke-linejoin="round">
        <path d="M16 82 H34 V66 H16 Z" fill="#B8FF3B"/><path d="M16 66 L23 59 H41 L34 66 Z" fill="#DDFF9A"/>
        <path d="M34 82 H52 V54 H34 Z" fill="#22D3EE"/><path d="M34 54 L41 47 H59 L52 54 Z" fill="#9BEFFA"/>
        <path d="M52 82 H70 V42 H52 Z" fill="#FF8A3D"/><path d="M52 42 L59 35 H77 L70 42 Z" fill="#FFC49C"/>
        <path d="M70 82 H86 V30 H70 Z" fill="#FF4FB8"/><path d="M70 30 L77 23 H93 L86 30 Z" fill="#FFB0DD"/>
        <path d="M86 30 L93 23 V75 L86 82 Z" fill="#9E1F6B"/>
      </g>
      <circle cx="80" cy="15" r="9.5" fill="#FFD23F" stroke="#000" stroke-width="3"/>
      <rect x="74.5" y="13.8" width="11" height="2.6" rx="1.3" fill="#000"/><circle cx="80" cy="10.8" r="1.7" fill="#000"/><circle cx="80" cy="19.2" r="1.7" fill="#000"/>`;

  function logoSVG(fondo, tam) {
    const t = tam ? ` width="${tam}" height="${tam}"` : '';
    let base = '', dibujo = DIBUJO;
    if (fondo === 'circulo') { base = '<circle cx="50" cy="50" r="47" fill="#043A4D" stroke="#000" stroke-width="4"/>'; dibujo = `<g transform="translate(9 11) scale(0.8)">${DIBUJO}</g>`; }
    else if (fondo === 'ninguno') dibujo = `<g transform="translate(17 17) scale(0.66)">${DIBUJO}</g>`;
    else base = '<rect x="3" y="3" width="94" height="94" rx="24" fill="#043A4D" stroke="#000" stroke-width="4"/>';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${t} aria-hidden="true">${base}${dibujo}</svg>`;
  }

  global.Logo = { logoSVG };
  if (typeof module !== 'undefined') module.exports = global.Logo;
})(typeof window !== 'undefined' ? window : globalThis);
