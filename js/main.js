/**
 * main.js — Ponto de entrada: inicializa todos os módulos
 *
 * A ordem importa: UI base → mídia → conteúdo → sincronismo →
 * editor → exportação → camadas auxiliares.
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  function boot() {
    App.UI.Tabs.init();
    App.Player.init();
    App.ScriptInput.init();
    App.Synchronizer.init();
    App.Editor.init();
    App.Timeline.init();
    App.Exporter.init();
    App.Overlay.init();
    App.Steps.init();
    App.Keyboard.init();

    console.log(
      '%c Legendário %c gerador de legendas SRT carregado com sucesso ',
      'background:#6c5ce7;color:#fff;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold',
      'background:#0b1120;color:#98a4bd;padding:4px 8px;border-radius:0 4px 4px 0'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.SRTApp);
