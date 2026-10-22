/**
 * export/srt.js — Geração e gravação do arquivo .SRT
 *
 * Mostra o diálogo nativo "Salvar como" (File System Access API)
 * quando disponível e usa download como alternativa.
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const Store = App.Store;
  const Utils = App.Utils;
  const $ = Utils.$;

  const el = {};

  function init() {
    el.filename = $('#export-filename');
    el.btnSave = $('#btn-save');
    el.btnCopy = $('#btn-copy');
    el.btnTop = $('#btn-export-top');
    el.note = $('#export-note');

    el.btnSave.addEventListener('click', save);
    el.btnCopy.addEventListener('click', copy);
    el.btnTop.addEventListener('click', function () {
      App.UI.Tabs.go('editor');
      save();
    });

    Store.on('media', suggestFilename);

    if (!('showSaveFilePicker' in window)) {
      el.note.textContent = 'Seu navegador salvará o arquivo na pasta de downloads.';
    }
  }

  /** Sugere o nome do arquivo a partir do nome da mídia. */
  function suggestFilename(state) {
    if (!state.media) return;
    const base = state.media.name.replace(/\.[^.]+$/, '').trim();
    if (!base) return;
    const current = el.filename.value.trim();
    if (!current || current === 'legendas') {
      el.filename.value = base.replace(/[^\w\s\-À-ÿ().]/g, '').trim() || 'legendas';
    }
  }

  /** Monta o conteúdo SRT completo. */
  function buildSrt() {
    const state = Store.state;
    const cues = state.cues
      .filter(function (c) { return c.start != null && String(c.text).trim() !== ''; })
      .sort(function (a, b) { return a.start - b.start; });

    if (!cues.length) return '';

    const duration = state.tick.duration || App.Player.getDuration();
    const blocks = cues.map(function (cue, i) {
      const next = cues[i + 1];
      let end = cue.end;
      if (end == null || end <= cue.start) {
        if (next && next.start != null) end = Math.max(cue.start + 0.3, next.start - 0.05);
        else if (duration > cue.start + 0.3) end = duration;
        else end = cue.start + 2;
      }
      return (
        (i + 1) + '\n' +
        Utils.toSrtTime(cue.start) + ' --> ' + Utils.toSrtTime(end) + '\n' +
        String(cue.text).trim()
      );
    });

    return blocks.join('\n\n') + '\n';
  }

  function getValidatedSrt() {
    const state = Store.state;
    if (!state.cues.length) {
      App.UI.Toast.warning('Não há legendas. Prepare o roteiro e sincronize primeiro.');
      App.UI.Tabs.go(state.lines.length ? 'sync' : 'script');
      return null;
    }

    const missing = state.cues.filter(function (c) { return c.start == null; }).length;
    const srt = buildSrt();
    if (!srt) {
      App.UI.Toast.warning('Nenhuma legenda possui tempo inicial marcado.');
      return null;
    }

    if (missing > 0) {
      const ok = Utils.confirm(
        missing + (missing === 1 ? ' legenda não foi sincronizada' : ' legendas não foram sincronizadas') +
        ' e será(ão) ignorada(s) na exportação.\n\nDeseja continuar?'
      );
      if (!ok) return null;
    }

    return srt;
  }

  function cleanFileName() {
    let name = (el.filename.value || 'legendas').trim();
    name = name.replace(/[<>:"/\\|?*]/g, '').replace(/\.srt$/i, '');
    if (!name) name = 'legendas';
    return name + '.srt';
  }

  async function save() {
    const srt = getValidatedSrt();
    if (!srt) return;
    const fileName = cleanFileName();

    // Caminho moderno: diálogo nativo de salvar
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Arquivo de legenda SRT',
            accept: { 'application/x-subrip': ['.srt'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(srt);
        await writable.close();
        finishSave('Legenda salva em: ' + (handle.name || fileName));
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // usuário cancelou
        console.warn('Falha no diálogo nativo, usando download:', err);
      }
    }

    download(srt, fileName);
    finishSave('Legenda baixada: ' + fileName);
  }

  function download(content, fileName) {
    const blob = new Blob([content], { type: 'application/x-subrip;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function finishSave(message) {
    Store.markExported();
    App.UI.Toast.success(message, 4000);
  }

  async function copy() {
    const srt = getValidatedSrt();
    if (!srt) return;

    try {
      await navigator.clipboard.writeText(srt);
      App.UI.Toast.success('Legenda copiada para a área de transferência.');
    } catch (err) {
      // Fallback para navegadores sem clipboard API
      const ta = document.createElement('textarea');
      ta.value = srt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        App.UI.Toast.success('Legenda copiada para a área de transferência.');
      } catch (e2) {
        App.UI.Toast.error('Não foi possível copiar automaticamente.');
      }
      ta.remove();
    }
  }

  App.Exporter = {
    init: init,
    buildSrt: buildSrt,
    save: save,
    copy: copy
  };
})(window.SRTApp);
