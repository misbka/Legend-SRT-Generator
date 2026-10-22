/**
 * ui/icons.js — Ícones SVG usados dinamicamente pelo JS
 * Disponível como SRTApp.Icons
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }

  App.Icons = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="7 4 20 12 7 20" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.4" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1.4" fill="currentColor"/></svg>',
    up: svg('<polyline points="18 15 12 9 6 15"/>'),
    down: svg('<polyline points="6 9 12 15 18 9"/>'),
    trash: svg('<polyline points="3 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>')
  };
})(window.SRTApp);
