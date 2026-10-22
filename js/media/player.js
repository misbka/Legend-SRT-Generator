/**
 * media/player.js — Carregamento e reprodução de vídeo/áudio
 *
 * Responsável por: dropzone de mídia, play/pause, seek, volume,
 * velocidade, tela cheia e emissão do relógio (tick) para o resto do app.
 */
window.SRTApp = window.SRTApp || {};
(function (App) {
  'use strict';

  const Store = App.Store;
  const Utils = App.Utils;
  const $ = Utils.$;
  const $$ = Utils.$$;

  const el = {};
  let seeking = false;
  let wasPlayingBeforeSeek = false;

  const VIDEO_RE = /\.(mp4|webm|mov|mkv|avi|m4v|ogv|wmv|flv)$/i;
  const AUDIO_RE = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|wma|webm)$/i;

  function init() {
    el.stage = $('#media-stage');
    el.dropzone = $('#dropzone-media');
    el.fileInput = $('#media-file-input');
    el.video = $('#video');
    el.audio = $('#audio');
    el.audioCard = $('#audio-card');
    el.audioName = $('#audio-name');
    el.audioMeta = $('#audio-meta');
    el.badge = $('#media-badge');
    el.btnSwap = $('#btn-swap-media');

    el.btnPlay = $('#btn-play');
    el.btnBack = $('#btn-back5');
    el.btnFwd = $('#btn-fwd5');
    el.timeCurrent = $('#time-current');
    el.timeDuration = $('#time-duration');
    el.seek = $('#seek');
    el.volume = $('#volume');
    el.btnMute = $('#btn-mute');
    el.speed = $('#speed');
    el.btnFs = $('#btn-fullscreen');

    bindFilePicking();
    bindTransport();
    bindMediaEvents();
    renderPlayState(false);

    Store.on('playing', renderPlayState);
    Store.on('media', renderMediaInfo);
    Store.on('tick', renderClock);
  }

  /* ── Carregamento de arquivo ── */

  function bindFilePicking() {
    $('#btn-pick-media').addEventListener('click', function (e) {
      e.stopPropagation();
      el.fileInput.click();
    });
    el.dropzone.addEventListener('click', function () { el.fileInput.click(); });
    el.dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.fileInput.click();
      }
    });
    el.btnSwap.addEventListener('click', function () { el.fileInput.click(); });

    el.fileInput.addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0];
      if (file) load(file);
      e.target.value = '';
    });

    bindDrop(el.dropzone, load);
    // Também dá para trocar a mídia arrastando sobre o palco já carregado
    bindDrop(el.stage, function (file, e) {
      if (e && e.target && el.dropzone.contains(e.target)) return; // já tratado pelo dropzone
      load(file);
    });
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
      if (file) onFile(file, e);
    });
  }

  function detectType(file) {
    if (file.type.indexOf('video/') === 0) return 'video';
    if (file.type.indexOf('audio/') === 0) return 'audio';
    if (VIDEO_RE.test(file.name)) return 'video';
    if (AUDIO_RE.test(file.name)) return 'audio';
    return null;
  }

  function load(file) {
    const type = detectType(file);
    if (!type) {
      App.UI.Toast.error('Formato não reconhecido. Envie um vídeo ou áudio compatível.');
      return;
    }

    if (Store.state.media) {
      URL.revokeObjectURL(Store.state.media.url);
    }

    const url = URL.createObjectURL(file);
    const target = type === 'video' ? el.video : el.audio;
    const other = type === 'video' ? el.audio : el.video;

    other.pause();
    other.removeAttribute('src');
    other.load();

    target.src = url;
    target.load();

    el.video.hidden = type !== 'video';
    el.audioCard.hidden = type !== 'audio';
    el.dropzone.classList.add('is-hidden');
    el.audioName.textContent = file.name;
    el.audioMeta.textContent = (type === 'video' ? 'Vídeo carregado' : 'Áudio carregado') + ' · pronto para sincronizar';

    Store.setMedia({ file: file, url: url, type: type, name: file.name });
    App.UI.Toast.success('Mídia carregada: ' + file.name);
  }

  function renderMediaInfo(state) {
    if (!state.media) return;
    el.badge.textContent = (state.media.type === 'video' ? '🎬 Vídeo · ' : '🎵 Áudio · ') + state.media.name;
    el.badge.classList.remove('badge-muted');
    el.btnSwap.hidden = false;
    el.audioCard.classList.remove('is-playing');
  }

  /* ── Reprodução ── */

  function active() {
    if (!Store.state.media) return null;
    return Store.state.media.type === 'video' ? el.video : el.audio;
  }

  function play() {
    const media = active();
    if (!media) {
      App.UI.Toast.warning('Carregue um vídeo ou áudio primeiro.');
      return;
    }
    const promise = media.play();
    if (promise && promise.catch) {
      promise.catch(function (err) {
        console.warn('Não foi possível reproduzir:', err);
      });
    }
  }

  function pause() {
    const media = active();
    if (media) media.pause();
  }

  function togglePlay() {
    if (!Store.state.media) {
      App.UI.Toast.warning('Carregue um vídeo ou áudio primeiro.');
      return;
    }
    if (Store.state.playing) pause();
    else play();
  }

  function seekTo(seconds) {
    const media = active();
    if (!media) return;
    const duration = isFinite(media.duration) ? media.duration : Infinity;
    media.currentTime = Utils.clamp(seconds, 0, Math.max(0, duration));
    Store.setTick({ time: media.currentTime });
  }

  function nudge(delta) {
    const media = active();
    if (!media) return;
    seekTo(media.currentTime + delta);
  }

  function getCurrentTime() {
    const media = active();
    return media ? media.currentTime : 0;
  }

  function getDuration() {
    const media = active();
    return media && isFinite(media.duration) ? media.duration : 0;
  }

  function renderPlayState(isPlaying) {
    el.btnPlay.innerHTML = isPlaying ? App.Icons.pause : App.Icons.play;
    el.audioCard.classList.toggle('is-playing', !!isPlaying);
  }

  function bindTransport() {
    el.btnPlay.addEventListener('click', togglePlay);
    el.btnBack.addEventListener('click', function () { nudge(-5); });
    el.btnFwd.addEventListener('click', function () { nudge(5); });
    el.btnFs.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.stage.requestFullscreen) el.stage.requestFullscreen();
    });

    // Seek
    el.seek.addEventListener('pointerdown', function () {
      seeking = true;
      wasPlayingBeforeSeek = Store.state.playing;
    });
    window.addEventListener('pointerup', function () {
      if (!seeking) return;
      seeking = false;
      if (wasPlayingBeforeSeek && !Store.state.playing) play();
    });
    el.seek.addEventListener('input', function () {
      const media = active();
      if (!media || !isFinite(media.duration)) return;
      if (seeking && wasPlayingBeforeSeek) media.pause();
      seekTo(Number(el.seek.value));
    });

    // Volume
    el.volume.addEventListener('input', function () {
      const value = Number(el.volume.value);
      [el.video, el.audio].forEach(function (m) {
        m.volume = value;
        m.muted = value === 0;
      });
      updateMuteIcon();
    });
    el.btnMute.addEventListener('click', function () {
      const media = active();
      if (!media) return;
      const muted = !media.muted;
      [el.video, el.audio].forEach(function (m) { m.muted = muted; });
      el.volume.value = muted ? 0 : 1;
      [el.video, el.audio].forEach(function (m) { m.volume = muted ? 0 : 1; });
      updateMuteIcon();
    });

    // Velocidade
    el.speed.addEventListener('change', function () {
      const rate = Number(el.speed.value);
      [el.video, el.audio].forEach(function (m) { m.playbackRate = rate; });
    });
  }

  function updateMuteIcon() {
    const media = active();
    const muted = !media || media.muted || media.volume === 0;
    el.btnMute.style.opacity = muted ? '0.5' : '1';
    el.btnMute.title = muted ? 'Ativar som' : 'Silenciar';
  }

  function bindMediaEvents() {
    [el.video, el.audio].forEach(function (media) {
      media.addEventListener('play', function () {
        Store.setPlaying(true);
        updateMuteIcon();
      });

      media.addEventListener('pause', function () {
        Store.setPlaying(false);
      });

      media.addEventListener('loadedmetadata', function () {
        Store.setTick({
          time: media.currentTime || 0,
          duration: isFinite(media.duration) ? media.duration : 0
        });
        el.seek.max = isFinite(media.duration) ? media.duration : 100;
        updateMuteIcon();
      });

      media.addEventListener('timeupdate', function () {
        Store.setTick({
          time: media.currentTime,
          duration: isFinite(media.duration) ? media.duration : 0
        });
      });

      media.addEventListener('ended', function () {
        Store.setPlaying(false);
        Store.setTick({ time: getDuration(), duration: getDuration() });
        if (App.Synchronizer) App.Synchronizer.onMediaEnded();
      });

      media.addEventListener('error', function () {
        if (media.getAttribute('src')) {
          App.UI.Toast.error('Este formato não pôde ser reproduzido. Tente MP4, WebM, MP3 ou WAV.');
        }
      });
    });
  }

  function renderClock(state) {
    const tick = state.tick;
    el.timeCurrent.textContent = Utils.toClock(tick.time);
    el.timeDuration.textContent = Utils.toClock(tick.duration);
    el.seek.max = tick.duration || 100;
    if (!seeking) {
      el.seek.value = Math.min(tick.time, tick.duration || tick.time);
    }
  }

  App.Player = {
    init: init,
    load: load,
    play: play,
    pause: pause,
    togglePlay: togglePlay,
    seekTo: seekTo,
    nudge: nudge,
    getCurrentTime: getCurrentTime,
    getDuration: getDuration
  };
})(window.SRTApp);
