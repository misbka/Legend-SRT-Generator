/**
 * timeline/timeline.js — Linha do tempo de legendas (estilo CapCut)
 *
 * Cada legenda sincronizada vira um bloco proporcional à sua duração:
 *
 *  · clique no bloco      → a mídia salta para o início da legenda
 *  · arrastar o corpo     → move a legenda na linha do tempo
 *  · arrastar as bordas   → ajusta início / fim com prévia ao vivo
 *  · clique na régua      → posiciona o cursor (scrub)
 *  · zoom                 → aproxima/afasta sem perder a posição
 *
 * Os ajustes são gravados direto no Store, então editor, prévia de
 * legenda e exportação refletem tudo em tempo real.
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const Store = App.Store;
  const Utils = App.Utils;

  const MIN_BLOCK = 0.12;   // duração mínima de uma legenda (s)
  const SNAP_PX = 7;        // distância de encaixe (px)
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 8;

  const el = {};
  let zoom = 1;
  let selectedId = null;
  let drag = null;     // { id, mode, block, x0, s0, e0, W, duration, moved }
  let scrub = false;
  let dirty = true;    // força reconstrução no próximo render
  let lastSeekAt = 0;
  let rafId = 0;

  /* ───────────────────────── Init ───────────────────────── */

  function init() {
    el.root = document.getElementById('timeline');
    el.scroll = document.getElementById('timeline-scroll');
    el.canvas = document.getElementById('timeline-canvas');
    el.ruler = document.getElementById('timeline-ruler');
    el.track = document.getElementById('timeline-track');
    el.playhead = document.getElementById('timeline-playhead');
    el.tip = document.getElementById('tl-tip');
    el.placeholder = document.getElementById('tl-placeholder');
    el.count = document.getElementById('tl-count');
    el.zoom = document.getElementById('tl-zoom');

    document.getElementById('tl-zoom-in').addEventListener('click', function () {
      setZoom(zoom + 1);
    });
    document.getElementById('tl-zoom-out').addEventListener('click', function () {
      setZoom(zoom - 1);
    });
    document.getElementById('tl-fit').addEventListener('click', function () {
      setZoom(MIN_ZOOM);
      el.scroll.scrollLeft = 0;
    });
    el.zoom.addEventListener('input', function () {
      setZoom(Number(el.zoom.value));
    });

    el.scroll.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(zoom + (e.deltaY < 0 ? 0.5 : -0.5));
    }, { passive: false });

    el.canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endInteraction);
    window.addEventListener('pointercancel', endInteraction);

    el.track.addEventListener('dblclick', function (e) {
      const block = e.target.closest && e.target.closest('.tl-block');
      if (!block) return;
      App.UI.Tabs.go('editor');
      if (App.Editor && App.Editor.scrollTo) App.Editor.scrollTo(block.dataset.id);
    });

    Store.on('cues', scheduleRender);
    Store.on('media', onMediaChanged);
    Store.on('sync', scheduleRender);
    Store.on('tick', onTick);
    window.addEventListener('resize', scheduleRender);

    render();
  }

  function onMediaChanged() {
    zoom = MIN_ZOOM;
    el.zoom.value = String(MIN_ZOOM);
    selectedId = null;
    el.scroll.scrollLeft = 0;
    dirty = true;
    render();
  }

  /* ───────────────────── Dimensões / tempo ───────────────────── */

  function getDuration() {
    return Store.state.tick.duration || App.Player.getDuration() || 0;
  }

  function viewport() {
    return el.scroll.clientWidth || 900; // fallback p/ testes/DOM sem layout
  }

  function contentW() {
    return Math.round(viewport() * zoom);
  }

  /** Limites reais de uma legenda (fim ausente/inválido é resolvido aqui). */
  function boundsOf(cue, index) {
    const state = Store.state;
    if (cue.start == null) return null;

    let end = cue.end;
    if (end == null || end <= cue.start) {
      if (state.sync.active && !state.sync.awaitingStart && state.sync.index === index) {
        // Legenda sendo gravada agora → cresce com o playhead
        end = Math.max(cue.start + MIN_BLOCK, state.tick.time);
      } else {
        const next = state.cues[index + 1];
        end = next && next.start != null
          ? Math.max(cue.start + MIN_BLOCK, next.start - state.gap)
          : cue.start + 0.4;
      }
    }
    return { start: cue.start, end: Math.max(end, cue.start + MIN_BLOCK) };
  }

  function xOf(seconds, W, duration) {
    return (seconds / duration) * W;
  }

  function secondsAt(clientX, W, duration) {
    const rect = el.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    return Utils.clamp((x / W) * duration, 0, duration);
  }

  function formatRuler(t) {
    const total = Math.max(0, Math.floor(t));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
      ? h + ':' + Utils.pad(m) + ':' + Utils.pad(s)
      : Utils.pad(m) + ':' + Utils.pad(s);
  }

  /* ───────────────────── Renderização ───────────────────── */

  function scheduleRender() {
    if (drag) { dirty = true; return; } // não reconstrui durante o arraste
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      render();
    });
  }

  function render() {
    const duration = getDuration();
    const W = contentW();
    const cues = Store.state.cues;

    el.canvas.style.width = W + 'px';
    el.placeholder.classList.toggle('is-hidden', !!duration);

    updateCount(cues);

    if (!duration) return;

    const signature = buildSignature(cues, W, duration, zoom);
    if (!dirty && signature === currentSignature) {
      movePlayhead();
      return;
    }
    currentSignature = signature;
    dirty = false;

    buildRuler(W, duration);
    buildBlocks(W, duration);
    movePlayhead();
  }

  let currentSignature = '';

  function buildSignature(cues, W, duration, z) {
    const parts = [z, W, duration.toFixed(2), cues.length];
    for (let i = 0; i < cues.length; i++) {
      const b = boundsOf(cues[i], i);
      parts.push(cues[i].id, b ? b.start.toFixed(3) : '-', b ? b.end.toFixed(3) : '-');
    }
    return parts.join('|');
  }

  function updateCount(cues) {
    const withStart = cues.filter(function (c) { return c.start != null; }).length;
    const hint = document.getElementById('tl-hint');

    if (!cues.length) {
      el.count.textContent = Store.state.lines.length
        ? Store.state.lines.length + ' linhas prontas'
        : 'sem legendas';
      if (hint) {
        hint.innerHTML = 'Sincronize as legendas para vê-las aqui como blocos na linha do tempo.';
      }
    } else if (withStart === cues.length) {
      el.count.textContent = withStart + ' legendas ✓';
      if (hint) renderHint(hint);
    } else {
      el.count.textContent = withStart + ' de ' + cues.length + ' sincronizadas';
      if (hint) renderHint(hint);
    }
  }

  function renderHint(hint) {
    hint.innerHTML =
      'Clique num bloco para ir até ele · <strong>arraste o corpo</strong> para mover a legenda · ' +
      '<strong>arraste as bordas</strong> para ajustar início/fim · clique na régua para posicionar o cursor';
  }

  function buildRuler(W, duration) {
    const pxPerSec = W / duration;
    const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800];
    let step = steps[steps.length - 1];
    for (let i = 0; i < steps.length; i++) {
      if (steps[i] * pxPerSec >= 78) { step = steps[i]; break; }
    }

    const minor = step / 5;
    const showMinor = minor * pxPerSec >= 13;
    let html = '';

    if (showMinor) {
      for (let t = 0; t <= duration; t += minor) {
        html += '<div class="tl-tick" style="left:' + xOf(t, W, duration).toFixed(2) + 'px"></div>';
      }
    }
    for (let t = 0; t <= duration; t += step) {
      const x = xOf(t, W, duration).toFixed(2);
      html += '<div class="tl-tick is-major" style="left:' + x + 'px">' +
        '<span>' + formatRuler(t) + '</span></div>';
    }

    el.ruler.innerHTML = html;
  }

  function buildBlocks(W, duration) {
    const state = Store.state;
    const frag = document.createDocumentFragment();

    state.cues.forEach(function (cue, index) {
      const b = boundsOf(cue, index);
      if (!b) return; // ainda sem tempo inicial

      const block = document.createElement('div');
      block.className = 'tl-block';
      block.dataset.id = cue.id;
      block.title = Utils.toSrtTime(b.start) + ' → ' + Utils.toSrtTime(b.end) + '\n' + cue.text;

      if (cue.id === selectedId) block.classList.add('is-selected');
      if (state.sync.active && state.sync.index === index && !state.sync.awaitingStart) {
        block.classList.add('is-recording');
      }

      const html =
        '<span class="tl-cc">CC</span>' +
        '<span class="tl-label"></span>' +
        '<span class="tl-edge tl-edge-start" data-edge="start"></span>' +
        '<span class="tl-edge tl-edge-end" data-edge="end"></span>';
      block.innerHTML = html;
      block.querySelector('.tl-label').textContent = cue.text;

      applyBlockStyle(block, b.start, b.end, W, duration);
      frag.appendChild(block);
    });

    el.track.innerHTML = '';
    el.track.appendChild(frag);
  }

  function applyBlockStyle(block, start, end, W, duration) {
    const left = xOf(start, W, duration);
    const width = Math.max(13, xOf(end, W, duration) - left);
    block.style.left = left.toFixed(2) + 'px';
    block.style.width = width.toFixed(2) + 'px';
    block.classList.toggle('has-icon', width >= 34);
    block.classList.toggle('has-label', width >= 78);
  }

  function movePlayhead() {
    const duration = getDuration();
    if (!duration) return;
    const W = contentW();
    const x = xOf(Store.state.tick.time, W, duration);
    el.playhead.style.transform = 'translateX(' + x.toFixed(2) + 'px)';
    return x;
  }

  /* ───────────────────── Acompanhar a reprodução ───────────────────── */

  function onTick() {
    const x = movePlayhead();
    if (x == null) return;

    // A legenda em gradação cresce junto com o playhead
    const state = Store.state;
    if (state.sync.active && !state.sync.awaitingStart) {
      const cue = state.cues[state.sync.index];
      if (cue && cue.start != null) {
        const block = el.track.querySelector('.tl-block[data-id="' + cue.id + '"]');
        if (block) {
          applyBlockStyle(block, cue.start, Math.max(cue.start + MIN_BLOCK, state.tick.time),
            contentW(), getDuration());
          block.classList.add('is-recording');
        }
      }
    }

    // Mantém o cursor visível enquanto toca
    if (state.playing && !drag) {
      const scroll = el.scroll;
      const vw = scroll.clientWidth;
      if (x < scroll.scrollLeft + 30 || x > scroll.scrollLeft + vw - 70) {
        scroll.scrollLeft = Math.max(0, x - vw * 0.35);
      }
    }
  }

  /* ───────────────────── Zoom ───────────────────── */

  function setZoom(value) {
    const duration = getDuration();
    const next = Utils.clamp(value, MIN_ZOOM, MAX_ZOOM);
    if (next === zoom) return;

    // Mantém o playhead na mesma posição visual
    let offset = 0;
    if (duration) offset = xOf(Store.state.tick.time, contentW(), duration) - el.scroll.scrollLeft;

    zoom = next;
    el.zoom.value = String(zoom);
    dirty = true;
    render();

    if (duration) {
      const x = xOf(Store.state.tick.time, contentW(), duration);
      el.scroll.scrollLeft = Math.max(0, x - offset);
    }
  }

  /* ───────────────────── Interação ───────────────────── */

  function indexOf(id) {
    return Store.state.cues.findIndex(function (c) { return c.id === id; });
  }

  function select(id) {
    selectedId = id;
    Utils.$$('.tl-block', el.track).forEach(function (b) {
      b.classList.toggle('is-selected', b.dataset.id === id);
    });
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;

    const duration = getDuration();
    if (!duration) return;
    const W = contentW();
    const target = e.target;
    const block = target.closest && target.closest('.tl-block');

    if (block) {
      const id = block.dataset.id;
      const index = indexOf(id);
      const cue = Store.state.cues[index];
      if (!cue || cue.start == null) return;

      select(id);

      const edge = target.dataset ? target.dataset.edge : null;
      const mode = edge === 'start' ? 'start' : edge === 'end' ? 'end' : 'move';
      const bounds = boundsOf(cue, index);

      drag = {
        id: id,
        mode: mode,
        block: block,
        x0: e.clientX,
        s0: bounds.start,
        e0: bounds.end,
        W: W,
        duration: duration,
        moved: false
      };

      showTip(bounds.start, bounds.end);
      // Prévia: cursor vai para a borda que está sendo manipulada
      App.Player.seekTo(mode === 'end' ? bounds.end : bounds.start);
      e.preventDefault();
      return;
    }

    // Clique fora dos blocos → arrastar o cursor (scrub)
    if (target.closest && (target.closest('#timeline-ruler') || target.closest('#timeline-track'))) {
      scrub = true;
      App.Player.seekTo(secondsAt(e.clientX, W, duration));
      e.preventDefault();
    }
  }

  function onPointerMove(e) {
    if (scrub) {
      App.Player.seekTo(secondsAt(e.clientX, contentW(), getDuration()));
      return;
    }
    if (!drag) return;

    const d = drag;
    const dt = ((e.clientX - d.x0) / d.W) * d.duration;
    const snapSec = (SNAP_PX / d.W) * d.duration;
    const length = d.e0 - d.s0;
    let start;
    let end;

    if (d.mode === 'move') {
      // Encaixa pela borda esquerda e mantém a duração da legenda
      start = Utils.clamp(d.s0 + dt, 0, d.duration - length);
      start = Utils.clamp(applySnap(start, snapSec, d.id), 0, d.duration - length);
      end = start + length;
    } else if (d.mode === 'start') {
      start = Utils.clamp(d.s0 + dt, 0, d.e0 - MIN_BLOCK);
      start = Utils.clamp(applySnap(start, snapSec, d.id), 0, d.e0 - MIN_BLOCK);
      end = d.e0;
    } else {
      end = Utils.clamp(d.e0 + dt, d.s0 + MIN_BLOCK, d.duration);
      end = Utils.clamp(applySnap(end, snapSec, d.id), d.s0 + MIN_BLOCK, d.duration);
      start = d.s0;
    }

    d.moved = true;
    Store.updateCue(d.id, { start: start, end: end });
    applyBlockStyle(d.block, start, end, d.W, d.duration);
    showTip(start, end);

    const previewAt = d.mode === 'end' ? end : start;
    const now = Date.now();
    if (now - lastSeekAt > 110) {
      lastSeekAt = now;
      App.Player.seekTo(previewAt);
    }
  }

  function endInteraction() {
    if (scrub) scrub = false;
    if (!drag) return;

    const id = drag.id;
    drag = null;
    el.tip.hidden = true;

    const cue = Store.state.cues.find(function (c) { return c.id === id; });
    if (cue && cue.start != null) App.Player.seekTo(cue.start);

    // Reconstrói tudo com os valores finais e sincroniza o editor
    dirty = true;
    render();
    if (App.Editor && App.Editor.refresh) App.Editor.refresh();
  }

  function snapCandidates(exceptId) {
    const cands = [0, getDuration(), Store.state.tick.time];
    Store.state.cues.forEach(function (c) {
      if (c.id === exceptId || c.start == null) return;
      const i = indexOf(c.id);
      const b = boundsOf(c, i);
      if (!b) return;
      cands.push(b.start, b.end);
    });
    return cands;
  }

  function applySnap(value, tolerance, exceptId) {
    const cands = snapCandidates(exceptId);
    let best = value;
    let bestDist = tolerance;
    for (let i = 0; i < cands.length; i++) {
      const dist = Math.abs(cands[i] - value);
      if (dist <= bestDist) { bestDist = dist; best = cands[i]; }
    }
    return best;
  }

  function showTip(start, end) {
    el.tip.hidden = false;
    el.tip.textContent = Utils.toSrtTime(start) + '  →  ' + Utils.toSrtTime(end);
    const W = contentW();
    const center = xOf((start + end) / 2, W, getDuration());
    const half = el.tip.offsetWidth ? el.tip.offsetWidth / 2 : 60;
    el.tip.style.left = Utils.clamp(center, half + 4, W - half - 4) + 'px';
  }

  /* ───────────────────── API pública ───────────────────── */

  App.Timeline = {
    init: init,
    /** true enquanto o usuário está arrastando um bloco/borda */
    isDragging: function () { return !!drag; },
    /** Força a reconstrução (usado pelo editor após alterações) */
    invalidate: function () { dirty = true; scheduleRender(); },
    select: select
  };
})(window.SRTApp);
