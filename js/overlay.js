/**
 * overlay.js — Exibe a legenda atual sobre o vídeo durante a reprodução
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const Store = App.Store;

  function init() {
    Store.on('tick', update);
    Store.on('cues', update);
  }

  function update(state) {
    const wrap = document.getElementById('subtitle-overlay');
    const textEl = document.getElementById('subtitle-text');
    if (!wrap || !textEl) return;

    if (!state.media || !state.cues.length) {
      wrap.classList.remove('is-visible');
      return;
    }

    const time = state.tick.time;
    const active = state.cues.find(function (cue) {
      if (cue.start == null) return false;
      // Legenda em gravação (sem fim) fica visível por alguns segundos
      const end = cue.end != null ? cue.end : cue.start + 8;
      return time >= cue.start - 0.03 && time <= end + 0.03;
    });

    if (active) {
      if (textEl.textContent !== active.text) textEl.textContent = active.text;
      wrap.classList.add('is-visible');
    } else {
      wrap.classList.remove('is-visible');
    }
  }

  App.Overlay = { init: init };
})(window.SRTApp);
