/**
 * text/scriptInput.js — Campo de texto do roteiro
 *
 * Aceita texto colado ou importação de arquivos .txt
 * e transforma o conteúdo em "linhas" (1 linha = 1 legenda).
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const Store = App.Store;
  const Utils = App.Utils;
  const $ = Utils.$;
  const $$ = Utils.$$;

  const el = {};

  function init() {
    el.textarea = $('#script-input');
    el.lineCount = $('#line-count');
    el.dropzoneText = $('#dropzone-text');
    el.fileInput = $('#text-file-input');

    $('#btn-prepare').addEventListener('click', prepare);
    $('#btn-clear-script').addEventListener('click', clearAll);

    $('#btn-load-txt').addEventListener('click', function (e) {
      e.stopPropagation();
      el.fileInput.click();
    });
    el.dropzoneText.addEventListener('click', function () { el.fileInput.click(); });
    el.dropzoneText.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.fileInput.click();
      }
    });

    el.fileInput.addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0];
      if (file) readTextFile(file);
      e.target.value = '';
    });

    bindDrop(el.dropzoneText, readTextFile);
    bindDrop(el.textarea, readTextFile);

    el.textarea.addEventListener('input', function () {
      updateCount();
      Store.setScript(el.textarea.value);
    });

    $('#gap-select').addEventListener('change', function (e) {
      Store.setGap(Number(e.target.value) / 1000);
    });

    updateCount();
  }

  function bindDrop(target, onFile) {
    ['dragenter', 'dragover'].forEach(function (type) {
      target.addEventListener(type, function (e) {
        e.preventDefault();
        e.stopPropagation();
        target.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      target.addEventListener(type, function (e) {
        e.preventDefault();
        e.stopPropagation();
        target.classList.remove('is-dragover');
      });
    });
    target.addEventListener('drop', function (e) {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      if (!/\.(txt|md|text|srt|vtt|csv|log|json)$/i.test(file.name) && file.type.indexOf('text/') !== 0) {
        App.UI.Toast.warning('Solte aqui arquivos de texto (.txt).');
        return;
      }
      onFile(file);
    });
  }

  function readTextFile(file) {
    const reader = new FileReader();
    reader.onload = function () {
      el.textarea.value = String(reader.result || '').replace(/\r\n/g, '\n');
      updateCount();
      Store.setScript(el.textarea.value);
      App.UI.Toast.success('Texto importado: ' + file.name);
    };
    reader.onerror = function () {
      App.UI.Toast.error('Não foi possível ler o arquivo.');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function getLines() {
    return String(el.textarea.value || '')
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line.length > 0; });
  }

  function updateCount() {
    const n = getLines().length;
    el.lineCount.textContent = n + (n === 1 ? ' linha' : ' linhas');
  }

  function clearAll() {
    if (!el.textarea.value) return;
    el.textarea.value = '';
    updateCount();
    Store.setScript('');
    App.UI.Toast.info('Texto limpo.');
  }

  /**
   * Prepara o sincronismo: separa as linhas, cria as legendas
   * e leva o usuário para a aba de sincronismo.
   */
  function prepare() {
    const lines = getLines();
    if (!lines.length) {
      App.UI.Toast.warning('Cole ou importe o texto das legendas primeiro.');
      el.textarea.focus();
      return;
    }

    const hasMarks = Store.state.cues.some(function (c) { return c.start != null; });
    if (hasMarks) {
      const ok = Utils.confirm(
        'Existem marcações de tempo atuais que serão apagadas.\n\nDeseja preparar o sincronismo novamente?'
      );
      if (!ok) return;
    }

    if (!Store.state.media) {
      App.UI.Toast.warning('Recomendado: carregue o vídeo ou áudio antes de sincronizar.');
    }

    Store.setLines(lines);
    Store.setCues([]);
    Store.resetSync();
    Store.setScript(el.textarea.value);

    App.UI.Tabs.go('sync');
    App.UI.Toast.success(
      lines.length + (lines.length === 1 ? ' legenda pronta' : ' legendas prontas') + ' para sincronizar.'
    );
  }

  App.ScriptInput = {
    init: init,
    getLines: getLines,
    updateCount: updateCount
  };
})(window.SRTApp);
