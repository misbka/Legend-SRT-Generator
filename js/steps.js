/**
 * steps.js — Indicador de etapas do topo (1 Mídia · 2 Roteiro · 3 Sincronizar · 4 Exportar)
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const Store = App.Store;
  const $$ = App.Utils.$$;

  const ORDER = ['media', 'script', 'sync', 'export'];

  function init() {
    ['media', 'lines', 'cues', 'sync', 'exported'].forEach(function (evt) {
      Store.on(evt, render);
    });
    render(Store.state);
  }

  function compute(state) {
    const hasMedia = !!state.media;
    const hasScript = state.lines.length > 0;
    const marked = state.cues.filter(function (c) { return c.start != null; }).length;
    const synced = hasScript && marked > 0 && marked >= state.cues.length && !state.sync.active;
    const exported = !!state.exported;

    return {
      media: hasMedia,
      script: hasScript,
      sync: synced,
      export: exported
    };
  }

  function render(state) {
    const done = compute(state);
    let currentSet = false;

    $$('.step').forEach(function (step) {
      const key = step.dataset.step;
      const isDone = !!done[key];
      let isCurrent = false;

      if (!isDone && !currentSet) {
        isCurrent = true;
        currentSet = true;
      }

      step.classList.toggle('is-done', isDone);
      step.classList.toggle('is-current', isCurrent);
    });
  }

  App.Steps = { init: init };
})(window.SRTApp);
