/**
 * editor/cueEditor.js — Revisão e edição das legendas sincronizadas
 *
 * Permite corrigir texto, ajustar tempos, reordenar, ouvir a partir
 * de um ponto e excluir legendas.
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const Store = App.Store;
  const Utils = App.Utils;
  const $ = Utils.$;

  const el = {};
  let lastStructureSig = '';
  let activeRowId = null;

  function init() {
    el.list = $('#cue-list');
    el.summary = $('#editor-summary');
    el.btnAutoFix = $('#btn-auto-fix');
    el.btnClear = $('#btn-clear-cues');

    el.btnAutoFix.addEventListener('click', autoFix);
    el.btnClear.addEventListener('click', clearCues);

    el.list.addEventListener('click', onListClick);
    el.list.addEventListener('input', onListInput);
    el.list.addEventListener('change', onListChange);

    Store.on('cues', onCuesChanged);
    Store.on('tick', highlightActive);
    Store.on('lines', updateChrome);
  }

  /* ── Assinatura da estrutura (ignora o texto, para não perder o foco) ── */
  function structureSignature(cues) {
    return cues.map(function (c) {
      return c.id + ':' + (c.start == null ? '-' : c.start) + ':' + (c.end == null ? '-' : c.end);
    }).join('|');
  }

  function onCuesChanged(state) {
    // Durante o arraste na linha do tempo, evita reconstruir as linhas
    // (o próprio Timeline chama refresh() ao soltar)
    if (App.Timeline && App.Timeline.isDragging()) {
      updateChrome(state);
      highlightActive(state);
      return;
    }

    const sig = structureSignature(state.cues);
    if (sig !== lastStructureSig) {
      lastStructureSig = sig;
      render(state.cues);
    }
    updateChrome(state);
    highlightActive(state);
  }

  /** Força a reconstrução das linhas (usado após ajustes externos). */
  function refresh() {
    render(Store.state.cues);
    lastStructureSig = structureSignature(Store.state.cues);
    updateChrome(Store.state);
    highlightActive(Store.state);
  }

  /** Rola o editor até a linha da legenda informada. */
  function scrollTo(cueId) {
    const row = el.list.querySelector('.cue-row[data-id="' + cueId + '"]');
    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function render(cues) {
    el.list.innerHTML = '';

    if (!cues.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<span class="empty-icon">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="4" width="18" height="16" rx="3"/><line x1="7" y1="10" x2="17" y2="10"/><line x1="7" y1="14" x2="13" y2="14"/>' +
        '</svg></span>' +
        '<h4>O editor aparece aqui</h4>' +
        '<p>Prepare o roteiro e sincronize as legendas para revisar cada uma delas.</p>';
      el.list.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    cues.forEach(function (cue, index) {
      fragment.appendChild(buildRow(cue, index));
    });
    el.list.appendChild(fragment);
  }

  function buildRow(cue, index) {
    const row = document.createElement('div');
    row.className = 'cue-row';
    row.dataset.id = cue.id;
    if (cue.id === activeRowId) row.classList.add('is-active');

    const head = document.createElement('div');
    head.className = 'cue-head';

    const num = document.createElement('span');
    num.className = 'cue-index';
    num.textContent = String(index + 1);

    const times = document.createElement('div');
    times.className = 'cue-times';

    const start = document.createElement('input');
    start.className = 'input input-time cue-start';
    start.type = 'text';
    start.placeholder = '00:00:00,000';
    start.value = cue.start != null ? Utils.toSrtTime(cue.start) : '';
    start.setAttribute('aria-label', 'Tempo inicial da legenda ' + (index + 1));

    const arrow = document.createElement('span');
    arrow.className = 'cue-arrow';
    arrow.textContent = '→';

    const end = document.createElement('input');
    end.className = 'input input-time cue-end';
    end.type = 'text';
    end.placeholder = '00:00:00,000';
    end.value = cue.end != null ? Utils.toSrtTime(cue.end) : '';
    end.setAttribute('aria-label', 'Tempo final da legenda ' + (index + 1));

    times.appendChild(start);
    times.appendChild(arrow);
    times.appendChild(end);

    const actions = document.createElement('div');
    actions.className = 'cue-actions';
    actions.appendChild(actionButton('play', App.Icons.play, 'Ouvir a partir daqui'));
    actions.appendChild(actionButton('up', App.Icons.up, 'Mover para cima'));
    actions.appendChild(actionButton('down', App.Icons.down, 'Mover para baixo'));
    actions.appendChild(actionButton('delete', App.Icons.trash, 'Excluir legenda', 'icon-btn-danger'));

    head.appendChild(num);
    head.appendChild(times);
    head.appendChild(actions);

    const text = document.createElement('textarea');
    text.className = 'textarea cue-text';
    text.rows = 2;
    text.spellcheck = false;
    text.value = cue.text;
    text.setAttribute('aria-label', 'Texto da legenda ' + (index + 1));

    row.appendChild(head);
    row.appendChild(text);
    return row;
  }

  function actionButton(action, icon, title, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn icon-btn-sm' + (extraClass ? ' ' + extraClass : '');
    btn.dataset.action = action;
    btn.title = title;
    btn.innerHTML = icon;
    return btn;
  }

  /* ── Interações ── */

  function onListClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('.cue-row');
    if (!row) return;
    const id = row.dataset.id;
    const cue = Store.state.cues.find(function (c) { return c.id === id; });
    if (!cue) return;

    switch (btn.dataset.action) {
      case 'play':
        if (cue.start == null) {
          App.UI.Toast.warning('Essa legenda ainda não tem tempo inicial.');
          return;
        }
        App.Player.pause();
        App.Player.seekTo(cue.start);
        App.Player.play();
        break;
      case 'up':
        Store.moveCue(id, -1);
        break;
      case 'down':
        Store.moveCue(id, 1);
        break;
      case 'delete':
        Store.removeCue(id);
        App.UI.Toast.info('Legenda excluída.', 2200);
        break;
    }
  }

  function onListInput(e) {
    const row = e.target.closest('.cue-row');
    if (!row) return;
    if (e.target.classList.contains('cue-text')) {
      Store.updateCue(row.dataset.id, { text: e.target.value });
    }
  }

  function onListChange(e) {
    const row = e.target.closest('.cue-row');
    if (!row) return;

    if (e.target.classList.contains('cue-start') || e.target.classList.contains('cue-end')) {
      const isStart = e.target.classList.contains('cue-start');
      const value = Utils.parseTime(e.target.value);
      const cue = Store.state.cues.find(function (c) { return c.id === row.dataset.id; });
      if (!cue) return;

      if (value == null && e.target.value.trim() !== '') {
        App.UI.Toast.warning('Use o formato 00:00:00,000 (h:mm:ss,mmm).');
        e.target.value = isStart
          ? (cue.start != null ? Utils.toSrtTime(cue.start) : '')
          : (cue.end != null ? Utils.toSrtTime(cue.end) : '');
        return;
      }

      const patch = {};
      if (isStart) patch.start = e.target.value.trim() === '' ? null : value;
      else patch.end = e.target.value.trim() === '' ? null : value;

      if (patch.start != null && patch.end != null && patch.end <= patch.start) {
        App.UI.Toast.warning('O tempo final deve ser depois do inicial.');
        return;
      }
      Store.updateCue(cue.id, patch);
    }
  }

  /* ── Barra de ferramentas ── */

  function autoFix() {
    const state = Store.state;
    if (!state.cues.length) return;
    const duration = state.tick.duration || App.Player.getDuration();

    state.cues.forEach(function (cue, index) {
      if (cue.start == null) return;
      const next = state.cues[index + 1];
      let end = cue.end;
      if (end == null || end <= cue.start) {
        if (next && next.start != null) end = Math.max(next.start - 0.05, cue.start + 0.3);
        else if (duration > cue.start + 0.3) end = duration;
        else end = cue.start + 2;
      }
      cue.end = end;
    });

    Store.emit('cues');
    App.UI.Toast.success('Tempos ajustados automaticamente.');
  }

  function clearCues() {
    const hasMarks = Store.state.cues.some(function (c) { return c.start != null; });
    if (hasMarks) {
      const ok = Utils.confirm('Apagar todas as marcações de tempo?\n\nO texto do roteiro será mantido.');
      if (!ok) return;
    }
    Store.setCues([]);
    Store.resetSync();
    App.UI.Tabs.go('sync');
    App.UI.Toast.info('Marcações zeradas.');
  }

  /* ── Atualizações auxiliares ── */

  function updateChrome(state) {
    const cues = state.cues;
    const marked = cues.filter(function (c) { return c.start != null; });

    if (!cues.length) {
      el.summary.textContent = state.lines.length
        ? state.lines.length + ' linhas prontas — falta sincronizar.'
        : 'Nenhuma legenda sincronizada ainda.';
    } else if (marked.length === cues.length) {
      el.summary.textContent = cues.length + ' legendas prontas para exportação ✓';
    } else {
      el.summary.textContent = marked.length + ' de ' + cues.length + ' legendas sincronizadas.';
    }

    el.btnAutoFix.disabled = !cues.length;
    el.btnClear.disabled = !cues.length;

    // Contadores das abas
    const editorCount = document.getElementById('editor-count');
    const syncCount = document.getElementById('sync-count');
    if (editorCount) {
      editorCount.hidden = marked.length === 0;
      editorCount.textContent = String(marked.length);
    }
    if (syncCount) {
      syncCount.hidden = cues.length === 0;
      syncCount.textContent = String(cues.length);
    }
  }

  /** Destaca a legenda que está no ar no momento atual. */
  function highlightActive(state) {
    const time = state.tick.time;
    const active = state.cues.find(function (c) {
      if (c.start == null) return false;
      const end = c.end != null ? c.end : (state.sync.active ? c.start + 8 : c.start + 0.5);
      return time >= c.start - 0.02 && time <= end + 0.02;
    });

    const id = active ? active.id : null;
    if (id === activeRowId) return;

    if (activeRowId) {
      const prev = el.list.querySelector('.cue-row[data-id="' + activeRowId + '"]');
      if (prev) prev.classList.remove('is-active');
    }
    activeRowId = id;
    if (id) {
      const row = el.list.querySelector('.cue-row[data-id="' + id + '"]');
      if (row) row.classList.add('is-active');
    }
  }

  App.Editor = {
    init: init,
    autoFix: autoFix,
    refresh: refresh,
    scrollTo: scrollTo
  };
})(window.SRTApp);
