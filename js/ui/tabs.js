/**
 * ui/tabs.js — Alternância das abas do painel lateral
 * Uso: App.UI.Tabs.go('sync') | 'script' | 'editor'
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const $$ = App.Utils.$$;
  let current = 'script';

  function go(name) {
    if (!document.querySelector('.tab-panel[data-panel="' + name + '"]')) return;
    current = name;
    $$('.tab').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.tab === name);
    });
    $$('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('is-active', panel.dataset.panel === name);
    });
  }

  function init() {
    $$('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        go(btn.dataset.tab);
      });
    });
  }

  App.UI = App.UI || {};
  App.UI.Tabs = {
    init: init,
    go: go,
    get current() { return current; }
  };
})(window.SRTApp);
