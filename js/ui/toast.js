/**
 * ui/toast.js — Notificações flutuantes
 * Uso: App.UI.Toast.success('mensagem') | .info | .warning | .error
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const MARKS = { success: '✓', warning: '!', error: '✕', info: 'i' };

  function show(message, type, duration) {
    const container = document.getElementById('toasts');
    if (!container) return;

    const kind = type || 'info';
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + kind;

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = MARKS[kind] || MARKS.info;

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('is-in');
    });

    window.setTimeout(function () {
      toast.classList.remove('is-in');
      window.setTimeout(function () { toast.remove(); }, 320);
    }, duration || 3400);
  }

  App.UI = App.UI || {};
  App.UI.Toast = {
    show: show,
    success: function (m, d) { show(m, 'success', d); },
    info: function (m, d) { show(m, 'info', d); },
    warning: function (m, d) { show(m, 'warning', d); },
    error: function (m, d) { show(m, 'error', d); }
  };
})(window.SRTApp);
