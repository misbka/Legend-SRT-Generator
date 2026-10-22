/**
 * keyboard.js — Atalhos globais do teclado
 *
 *  Espaço   → durante o sincronismo: marca o tempo da legenda atual
 *             fora do sincronismo: play/pause
 *  Enter    → encerra a legenda atual e pausa a mídia (somente no sincronismo)
 *  Backspace/Delete → desfaz a última marcação (somente no sincronismo)
 *  ← / →    → volta ou avança 5 segundos
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const Store = App.Store;

  function isTyping(target) {
    if (!target) return false;
    const tag = (target.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  function init() {
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target)) return;

      const syncing = Store.state.sync.active;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (syncing) App.Synchronizer.mark();
          else App.Player.togglePlay();
          break;

        case 'Enter':
          if (syncing) {
            e.preventDefault();
            App.Synchronizer.markEndAndPause();
          }
          break;

        case 'Backspace':
        case 'Delete':
          if (syncing) {
            e.preventDefault();
            App.Synchronizer.undo();
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          App.Player.nudge(-5);
          break;

        case 'ArrowRight':
          e.preventDefault();
          App.Player.nudge(5);
          break;
      }
    });
  }

  App.Keyboard = { init: init };
})(window.SRTApp);
