/**
 * store.js — Estado central + sistema de eventos (pub/sub simples)
 *
 * Eventos emitidos: media, script, lines, cues, sync, playing, tick, gap, exported
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const listeners = Object.create(null);

  const state = {
    /** { file, url, type: 'video'|'audio', name } */
    media: null,
    /** Texto bruto do campo de roteiro */
    script: '',
    /** Linhas preparadas (1 linha = 1 legenda) */
    lines: [],
    /** [{ id, text, start, end }] */
    cues: [],
    /** Controle do sincronismo ao vivo */
    sync: { active: false, awaitingStart: true, index: 0, history: [] },
    playing: false,
    tick: { time: 0, duration: 0 },
    /** Intervalo (segundos) entre legendas */
    gap: 0.08,
    exported: false
  };

  const Store = {
    state: state,

    on(event, handler) {
      (listeners[event] = listeners[event] || []).push(handler);
      return function unsubscribe() {
        Store.off(event, handler);
      };
    },

    off(event, handler) {
      listeners[event] = (listeners[event] || []).filter(function (h) {
        return h !== handler;
      });
    },

    emit(event) {
      (listeners[event] || []).slice().forEach(function (handler) {
        try {
          handler(state, event);
        } catch (err) {
          console.error('[Store] erro no listener de "' + event + '":', err);
        }
      });
    },

    /* ── Mutações ── */

    setMedia(media) {
      state.media = media;
      state.exported = false;
      Store.emit('media');
    },

    setScript(text) {
      state.script = text;
      Store.emit('script');
    },

    setLines(lines) {
      state.lines = lines;
      state.exported = false;
      Store.emit('lines');
    },

    setCues(cues) {
      state.cues = cues;
      state.exported = false;
      Store.emit('cues');
    },

    newCueId() {
      return App.Utils.uid('cue');
    },

    updateCue(id, patch) {
      const cue = state.cues.find(function (c) { return c.id === id; });
      if (!cue) return;
      Object.assign(cue, patch);
      state.exported = false;
      Store.emit('cues');
    },

    removeCue(id) {
      state.cues = state.cues.filter(function (c) { return c.id !== id; });
      state.exported = false;
      Store.emit('cues');
    },

    moveCue(id, direction) {
      const index = state.cues.findIndex(function (c) { return c.id === id; });
      const target = index + direction;
      if (index < 0 || target < 0 || target >= state.cues.length) return;
      const arr = state.cues.slice();
      const tmp = arr[index];
      arr[index] = arr[target];
      arr[target] = tmp;
      state.cues = arr;
      Store.emit('cues');
    },

    patchSync(patch) {
      Object.assign(state.sync, patch);
      Store.emit('sync');
    },

    resetSync() {
      state.sync = { active: false, awaitingStart: true, index: 0, history: [] };
      Store.emit('sync');
    },

    setPlaying(isPlaying) {
      if (state.playing === isPlaying) return;
      state.playing = isPlaying;
      Store.emit('playing');
    },

    setTick(tick) {
      Object.assign(state.tick, tick);
      Store.emit('tick');
    },

    setGap(gap) {
      state.gap = gap;
      Store.emit('gap');
    },

    markExported() {
      state.exported = true;
      Store.emit('exported');
    }
  };

  App.Store = Store;
})(window.SRTApp);
