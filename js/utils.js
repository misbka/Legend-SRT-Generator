/**
 * utils.js — Utilitários gerais (tempo, IDs, DOM)
 * Disponível globalmente como SRTApp.Utils
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  function pad(num, size) {
    return String(Math.max(0, Math.floor(num))).padStart(size || 2, '0');
  }

  const Utils = {
    pad: pad,

    /** Segundos → timestamp SRT: 00:01:23,450 */
    toSrtTime(seconds) {
      const s = Math.max(0, Number(seconds) || 0);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.min(999, Math.round((s - Math.floor(s)) * 1000));
      return pad(h) + ':' + pad(m) + ':' + pad(sec) + ',' + String(ms).padStart(3, '0');
    },

    /** Segundos → relógio de exibição: 01:23.450 */
    toClock(seconds) {
      const s = Math.max(0, Number(seconds) || 0);
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.min(999, Math.round((s - Math.floor(s)) * 1000));
      return pad(m) + ':' + pad(sec) + '.' + String(ms).padStart(3, '0');
    },

    /**
     * Converte texto de tempo em segundos.
     * Aceita: "00:01:23,450" | "00:01:23.450" | "01:23.5" | "83.5"
     * Retorna null quando inválido.
     */
    parseTime(value) {
      if (typeof value === 'number') return isFinite(value) ? value : null;
      const raw = String(value == null ? '' : value).trim().replace(',', '.');
      if (!raw) return null;
      const parts = raw.split(':');
      let seconds = 0;
      for (const part of parts) {
        const p = part.trim();
        if (p === '' || isNaN(Number(p))) return null;
        seconds = seconds * 60 + Number(p);
      }
      return isFinite(seconds) ? seconds : null;
    },

    /** ID único incremental */
    uid: (function () {
      let seq = 0;
      return function (prefix) {
        seq += 1;
        return (prefix || 'id') + '-' + seq + '-' + Date.now().toString(36);
      };
    })(),

    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    },

    $(selector, root) {
      return (root || document).querySelector(selector);
    },

    $$(selector, root) {
      return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    },

    /** Confirmação simples com padrão "sim" */
    confirm(message) {
      return window.confirm(message);
    }
  };

  App.Utils = Utils;
})(window.SRTApp);
