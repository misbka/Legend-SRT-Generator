/**
 * sync/synchronizer.js — Sincronismo em tempo real
 *
 * Fluxo: o usuário dá play na mídia e apita (Espaço) o momento exato
 * de cada legenda. Cada toque finaliza a legenda anterior e inicia a
 * próxima, usando o intervalo (gap) configurado para o fim dela.
 *
 * Atalhos durante o sincronismo:
 *   Espaço  → marca início/fim da legenda atual
 *   Enter   → encerra a legenda atual e pausa a mídia
 *   Backspace / Delete → desfaz a última marcação
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const Store = App.Store;
  const Utils = App.Utils;
  const $ = Utils.$;

  const el = {};
  let lastLabelSig = '';

  function init() {
    el.pill = $('#sync-state-pill');
    el.pillLabel = $('#sync-state-label');
    el.progressLabel = $('#sync-progress-label');
    el.progressBar = $('#sync-progress-bar');
    el.recDot = $('#rec-dot');
    el.lineLabel = $('#current-line-label');
    el.lineTime = $('#current-line-time');
    el.lineText = $('#current-line-text');
    el.upcoming = $('#upcoming');
    el.btnToggle = $('#btn-sync-toggle');
    el.btnToggleLabel = $('#btn-sync-toggle-label');
    el.btnUndo = $('#btn-sync-undo');
    el.btnEnd = $('#btn-sync-end');
    el.btnReset = $('#btn-sync-reset');

    el.btnToggle.addEventListener('click', toggle);
    el.btnUndo.addEventListener('click', undo);
    el.btnEnd.addEventListener('click', end);
    el.btnReset.addEventListener('click', reset);

    Store.on('cues', render);
    Store.on('sync', render);
    Store.on('lines', render);
    Store.on('tick', renderLive);
    Store.on('playing', render);

    render(Store.state);
  }

  /* ── Início / controle ── */

  function toggle() {
    const state = Store.state;
    if (state.sync.active) {
      App.Player.togglePlay();
      return;
    }

    const marked = state.cues.filter(function (c) { return c.start != null; }).length;

    if (!state.cues.length || marked === 0) {
      start();
      return;
    }

    if (marked >= state.cues.length) {
      App.UI.Tabs.go('editor');
      App.UI.Toast.info('Sincronismo já concluído. Revise as legendas no editor.');
      return;
    }

    // Retoma do ponto em que parou, sem apagar o que já foi marcado
    Store.patchSync({ active: true });
    App.UI.Tabs.go('sync');
    App.UI.Toast.success('Sincronismo retomado! Continue apertando Espaço.');
  }

  function start() {
    const state = Store.state;

    if (!state.lines.length) {
      App.UI.Toast.warning('Prepare o roteiro antes de sincronizar.');
      App.UI.Tabs.go('script');
      return;
    }
    if (!state.media) {
      App.UI.Toast.warning('Carregue o vídeo ou áudio antes de sincronizar.');
      return;
    }

    const cues = state.lines.map(function (text) {
      return { id: Store.newCueId(), text: text, start: null, end: null };
    });

    Store.setCues(cues);
    Store.patchSync({ active: true, awaitingStart: true, index: 0, history: [] });
    App.Player.pause();
    App.Player.seekTo(0);
    App.UI.Tabs.go('sync');

    App.UI.Toast.success('Sincronismo iniciado! Dê play e aperte Espaço em cada legenda.', 4200);
    render(Store.state);
  }

  /**
   * Ação principal — marca o tempo atual.
   *  · aguardando início  → grava o início e inicia a reprodução se pausada
   *  · aguardando fim     → grava o fim, avança para a próxima legenda
   */
  function mark() {
    const state = Store.state;
    if (!state.sync.active) return;

    const cues = state.cues;
    const index = state.sync.index;
    if (index >= cues.length) return;

    const time = App.Player.getCurrentTime();

    if (state.sync.awaitingStart) {
      const start = Math.max(0, time);
      Store.updateCue(cues[index].id, { start: start, end: null });
      Store.patchSync({
        awaitingStart: false,
        history: state.sync.history.concat([{ type: 'start', index: index }])
      });
      if (!state.playing) App.Player.play();
    } else {
      // Cada toque fecha a legenda atual e abre a próxima no mesmo instante
      closeCurrent(time, true);
    }
  }

  /**
   * Encerra a legenda atual em `time`.
   * Com `openNext`, a próxima legenda começa no mesmo instante
   * (o fim dela leva o intervalo configurado para não grudar).
   */
  function closeCurrent(time, openNext) {
    const state = Store.state;
    const cues = state.cues;
    const index = state.sync.index;
    const cue = cues[index];
    if (!cue) return;

    const start = cue.start != null ? cue.start : time;
    const duration = state.tick.duration || App.Player.getDuration();

    let end = time - state.gap;
    if (duration && end > duration) end = duration;
    if (end <= start) end = start + 0.15;

    Store.updateCue(cue.id, { end: end });

    const history = state.sync.history.concat([{ type: 'end', index: index }]);
    const next = index + 1;
    const finished = next >= cues.length;
    let awaitingStart = true;

    if (!finished && openNext) {
      Store.updateCue(cues[next].id, { start: Math.max(0, time), end: null });
      history.push({ type: 'start', index: next });
      awaitingStart = false;
    }

    Store.patchSync({
      active: !finished,
      awaitingStart: finished ? false : awaitingStart,
      index: next,
      history: history
    });

    if (finished) {
      App.Player.pause();
      App.UI.Toast.success('Sincronismo concluído! Revise as legendas no editor.', 4200);
      App.UI.Tabs.go('editor');
    }
  }

  /** Enter: encerra a legenda atual e pausa para ajuste fino. */
  function markEndAndPause() {
    const state = Store.state;
    if (!state.sync.active) return;
    if (state.sync.awaitingStart) {
      App.Player.pause();
      return;
    }
    closeCurrent(App.Player.getCurrentTime(), false);
    App.Player.pause();
    if (Store.state.sync.active) {
      App.UI.Toast.info('Legenda encerrada. Ajuste a posição e continue com Espaço.', 2600);
    }
  }

  /** Desfaz a última marcação. */
  function undo() {
    const state = Store.state;
    const history = state.sync.history;
    if (!history.length) {
      App.UI.Toast.info('Nada para desfazer.');
      return;
    }

    const last = history[history.length - 1];
    const cues = state.cues.slice();
    const cue = cues[last.index];

    if (cue) {
      if (last.type === 'start') cue.start = null;
      else cue.end = null;
      Store.setCues(cues);
    }

    Store.patchSync({
      history: history.slice(0, -1),
      index: last.index,
      // 'start' desfeito → aguarda novo início; 'end' desfeito → aguarda novo fim
      awaitingStart: last.type === 'start'
    });

    App.UI.Toast.info('Última marcação desfeita.', 2000);
  }

  /** Encerra o sincronismo manualmente. */
  function end() {
    const state = Store.state;
    if (!state.sync.active) return;
    if (!state.sync.awaitingStart) {
      closeCurrent(App.Player.getCurrentTime(), false);
    }
    if (!Store.state.sync.active) return; // já concluiu junto com a última legenda
    Store.patchSync({ active: false });
    App.Player.pause();
    App.UI.Toast.success('Sincronismo encerrado.', 2600);
    App.UI.Tabs.go('editor');
  }

  /** Zera todas as marcações e volta ao início do fluxo. */
  function reset() {
    const hasMarks = Store.state.cues.some(function (c) { return c.start != null; });
    if (hasMarks) {
      const ok = Utils.confirm('Isso irá apagar todas as marcações de tempo.\n\nDeseja continuar?');
      if (!ok) return;
    }
    Store.setCues([]);
    Store.resetSync();
    App.Player.pause();
    App.Player.seekTo(0);
    App.UI.Tabs.go('sync');
    App.UI.Toast.info('Marcações zeradas. Inicie quando quiser.');
  }

  /** Ao fim da mídia, finaliza a legenda ativa (se houver). */
  function onMediaEnded() {
    const state = Store.state;
    if (!state.sync.active || state.sync.awaitingStart) return;
    closeCurrent(App.Player.getDuration(), false);
  }

  /* ── Renderização do painel ── */

  function render(state) {
    if (!el.pill) return; // painel ainda não inicializado
    const cues = state.cues;
    const sync = state.sync;
    const marked = cues.filter(function (c) { return c.start != null; }).length;
    const total = cues.length || state.lines.length;
    const index = Math.min(sync.index, Math.max(0, cues.length));

    // Barra de progresso
    const progress = total ? Math.round((marked / total) * 100) : 0;
    el.progressBar.style.width = progress + '%';
    el.progressLabel.textContent = Math.min(marked, total) + ' de ' + total + ' legendas';

    // Pílula de estado
    el.pill.classList.toggle('is-active', sync.active);
    el.pill.classList.toggle('is-done', !sync.active && total > 0 && marked >= total && total > 0);
    if (sync.active) el.pillLabel.textContent = 'Gravando…';
    else if (total && marked >= total) el.pillLabel.textContent = 'Concluído';
    else if (marked > 0) el.pillLabel.textContent = 'Pausado';
    else el.pillLabel.textContent = 'Inativo';

    // Linha atual
    const currentCue = cues[index];
    const started = cues.some(function (c) { return c.start != null; });

    if (!cues.length) {
      el.lineLabel.textContent = 'Aguardando preparação';
      el.lineText.textContent = 'Prepare o roteiro para começar a sincronizar.';
      el.recDot.className = 'rec-dot';
    } else if (sync.active && currentCue) {
      el.lineLabel.textContent = (sync.awaitingStart ? 'Próxima legenda · ' : 'Gravando agora · ') +
        'linha ' + (index + 1) + ' de ' + cues.length;
      el.lineText.textContent = currentCue.text;
      el.recDot.className = 'rec-dot ' + (sync.awaitingStart ? 'is-waiting' : 'is-recording');
    } else if (currentCue) {
      el.lineLabel.textContent = 'Pausado na linha ' + (index + 1) + ' de ' + cues.length;
      el.lineText.textContent = currentCue.text;
      el.recDot.className = 'rec-dot';
    } else {
      el.lineLabel.textContent = 'Sincronismo concluído';
      el.lineText.textContent = cues.length + ' legendas sincronizadas. Revise no editor.';
      el.recDot.className = 'rec-dot';
    }

    if (sync.awaitingStart || !sync.active) {
      el.lineTime.textContent = started && !sync.active ? '✓ ' + marked + ' marcadas' : 'pronta';
    }

    // Próximas linhas
    const upcoming = cues.slice(index + 1, index + 6);
    const sig = upcoming.map(function (c) { return c.text; }).join('|') + '#' + index;
    if (sig !== lastLabelSig) {
      lastLabelSig = sig;
      el.upcoming.innerHTML = '';
      if (!upcoming.length) {
        const li = document.createElement('li');
        li.className = 'upcoming-empty muted';
        li.textContent = cues.length && index >= cues.length - 1
          ? 'Última legenda da lista.'
          : 'Nenhuma legenda na fila.';
        el.upcoming.appendChild(li);
      } else {
        upcoming.forEach(function (cue, i) {
          const li = document.createElement('li');
          if (i === 0) li.className = 'is-next';
          const n = document.createElement('span');
          n.className = 'n';
          n.textContent = '#' + (index + i + 2);
          const txt = document.createElement('span');
          txt.className = 'txt';
          txt.textContent = cue.text;
          li.appendChild(n);
          li.appendChild(txt);
          el.upcoming.appendChild(li);
        });
      }
    }

    // Botões
    const canControl = cues.length > 0;
    el.btnToggle.disabled = !cues.length && !state.lines.length;
    el.btnToggleLabel.textContent = sync.active
      ? (state.playing ? 'Pausar mídia' : 'Reproduzir mídia')
      : (started ? 'Retomar sincronismo' : 'Iniciar sincronismo');
    el.btnUndo.disabled = !sync.history.length;
    el.btnEnd.disabled = !sync.active;
    el.btnReset.disabled = !canControl;

    renderLive(state);
  }

  function renderLive(state) {
    if (!el.lineTime) return;
    const sync = state.sync;
    if (sync.active && !sync.awaitingStart) {
      const cue = state.cues[sync.index];
      if (cue && cue.start != null) {
        el.lineTime.textContent = '+' + (state.tick.time - cue.start).toFixed(3).replace('.', ',') + ' s';
      }
    } else if (sync.active) {
      el.lineTime.textContent = 'aperte Espaço';
    }
  }

  App.Synchronizer = {
    init: init,
    start: start,
    mark: mark,
    markEndAndPause: markEndAndPause,
    undo: undo,
    end: end,
    reset: reset,
    onMediaEnded: onMediaEnded
  };
})(window.SRTApp);
