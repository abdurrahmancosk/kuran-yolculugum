/* Yerel köprü soyutlaması: Android'de AndroidBridge, tarayıcıda Web API yedekleri. */
window.K = window.K || {};
(function () {
  const B = window.AndroidBridge || null;
  const listeners = new Map();
  let seq = 0;
  const nid = (p) => p + (++seq) + '_' + Date.now().toString(36);

  window.__native = function (type, id, data) {
    const fns = listeners.get(type + ':' + id) || listeners.get(type + ':*');
    if (fns) [...fns].forEach((fn) => { try { fn(data, id); } catch (e) { console.error(e); } });
  };
  function on(type, id, fn) {
    const k = type + ':' + id;
    if (!listeners.has(k)) listeners.set(k, new Set());
    listeners.get(k).add(fn);
    return () => { const s = listeners.get(k); if (s) { s.delete(fn); if (!s.size) listeners.delete(k); } };
  }

  // ------------------------------------------------------------ TTS
  let ttsInfo = { ready: false };
  if (B) { try { ttsInfo = JSON.parse(B.ttsStatus()); } catch (e) {} }
  on('ttsready', '', (d) => { try { ttsInfo = JSON.parse(d); } catch (e) {} });
  on('ttsready', '*', (d) => { try { ttsInfo = JSON.parse(d); } catch (e) {} });

  let webVoices = [];
  function loadWebVoices() { try { webVoices = speechSynthesis.getVoices() || []; } catch (e) {} }
  if (!B && 'speechSynthesis' in window) { loadWebVoices(); speechSynthesis.onvoiceschanged = loadWebVoices; }

  let currentSpeech = null;

  // ------------------------------------------------------------ gömülü erkek sesi paketi (önceden üretilmiş)
  function vhash(lang, t) {
    t = (lang + '|' + String(t)).normalize('NFC').replace(/\s+/g, ' ').trim();
    let h1 = 0x811c9dc5, h2 = 5381;
    for (const ch of t) { const c = ch.codePointAt(0); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = (Math.imul(h2, 33) + c) >>> 0; }
    return h1.toString(36) + h2.toString(36);
  }
  function voiceFile(text, lang) {
    if (!K.VOICE) return null;
    const h = vhash(lang, text);
    return K.VOICE.has(h) ? h : null;
  }
  function estimate(text, rate) { return Math.max(1200, (text.length * 85) / (rate || 1)) + 1500; }

  /** Metni seslendirir; bitince çözülür. lang: 'tr' | 'ar' */
  function speak(text, lang = 'tr', opts = {}) {
    stopSpeech();
    const rate = opts.rate || 1, pitch = opts.pitch || 1.05;
    if (K.onSpeak) K.onSpeak(text, lang);
    const vf = voiceFile(text, lang);
    if (vf) {
      const speed = Math.max(0.7, Math.min(1.3, rate));
      return play(B ? ['asset:www/voice/' + vf + '.mp3'] : ['voice/' + vf + '.mp3'], { speed }).then((r) => (r === 'end' ? 'done' : r === 'stop' ? 'stop' : 'error'));
    }
    if (K.onMiss) K.onMiss(text, lang);
    return new Promise((resolve) => {
      let done = false, off = null, timer = null;
      const finish = (r) => { if (done) return; done = true; if (off) off(); clearTimeout(timer); if (currentSpeech && currentSpeech.id === id) currentSpeech = null; resolve(r); };
      const id = nid('u');
      currentSpeech = { id, cancel: () => finish('stop') };
      if (B) {
        off = on('tts', id, (st) => { if (st === 'done' || st === 'error' || st === 'stop') finish(st); });
        let ok = false;
        try { ok = B.ttsSpeak(id, text, lang, rate, pitch); } catch (e) { ok = false; }
        if (!ok) { timer = setTimeout(() => finish('nospeech'), Math.min(2200, estimate(text, rate) / 2)); return; }
        timer = setTimeout(() => finish('timeout'), estimate(text, rate) * 2 + 4000);
      } else if ('speechSynthesis' in window) {
        try {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = lang === 'ar' ? 'ar-SA' : 'tr-TR';
          const v = webVoices.find((x) => x.lang && x.lang.toLowerCase().startsWith(lang));
          if (v) u.voice = v;
          u.rate = rate; u.pitch = pitch;
          u.onend = () => finish('done'); u.onerror = () => finish('error');
          speechSynthesis.cancel(); speechSynthesis.speak(u);
          timer = setTimeout(() => finish('timeout'), estimate(text, rate) * 2 + 2000);
        } catch (e) { timer = setTimeout(() => finish('nospeech'), 900); }
      } else {
        timer = setTimeout(() => finish('nospeech'), Math.min(2200, estimate(text, rate) / 2));
      }
    });
  }
  function stopSpeech() {
    if (currentSpeech) currentSpeech.cancel();
    if (B) { try { B.ttsStop(); } catch (e) {} }
    else if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
  }
  function ttsLangOk(lang) {
    if (B) { try { ttsInfo = JSON.parse(B.ttsStatus()); } catch (e) {} return ttsInfo.ready && ttsInfo[lang] === 'ok'; }
    if ('speechSynthesis' in window) return webVoices.some((v) => v.lang && v.lang.toLowerCase().startsWith(lang));
    return false;
  }

  // ------------------------------------------------------------ ses çalar
  const webRecs = new Map(); // tarayıcı yedeği için kayıtlar
  let webAudio = null, currentAudio = null;

  /** urls: [birincil, yedek...] veya 'rec:anahtar'. Döner: 'end' | 'error' | 'stop' */
  function play(urls, opts = {}) {
    stopAudio();
    if (typeof urls === 'string') urls = [urls];
    const speed = opts.speed || 1;
    return new Promise((resolve) => {
      const id = nid('a');
      let done = false, off = null;
      const finish = (r) => { if (done) return; done = true; if (off) off(); if (currentAudio && currentAudio.id === id) currentAudio = null; resolve(r); };
      currentAudio = { id, cancel: () => finish('stop') };
      if (B) {
        off = on('audio', id, (st) => {
          if (st === 'loading') opts.onLoading && opts.onLoading();
          else if (st.startsWith('start')) opts.onStart && opts.onStart(+st.split(':')[1] || 0);
          else if (st === 'end' || st === 'error' || st === 'stop') finish(st);
        });
        try { B.audioPlay(id, JSON.stringify(urls), speed); } catch (e) { finish('error'); }
      } else {
        let i = 0;
        const tryNext = () => {
          if (done) return;
          if (i >= urls.length) return finish('error');
          let src = urls[i++];
          if (src.startsWith('rec:')) { src = webRecs.get(src.slice(4)); if (!src) return tryNext(); }
          else if (src.startsWith('asset:')) src = src.slice(6).replace(/^www\//, '');
          const frag = (src.split('#t=')[1] || '').split(',').map(Number);
          src = src.split('#')[0];
          const a = new Audio(src);
          webAudio = a;
          a.playbackRate = speed;
          if (frag[0] > 0) a.addEventListener('loadedmetadata', () => { a.currentTime = frag[0]; }, { once: true });
          if (frag[1] > 0) a.addEventListener('timeupdate', () => { if (a.currentTime >= frag[1]) { a.pause(); finish('end'); } });
          a.onended = () => finish('end');
          a.onerror = () => tryNext();
          a.onplaying = () => opts.onStart && opts.onStart((a.duration || 0) * 1000);
          a.play().catch(() => tryNext());
        };
        opts.onLoading && opts.onLoading();
        tryNext();
      }
    });
  }
  function stopAudio() {
    if (currentAudio) currentAudio.cancel();
    if (B) { try { B.audioStop(); } catch (e) {} }
    if (webAudio) { try { webAudio.pause(); } catch (e) {} webAudio = null; }
  }
  function stopAll() { stopSpeech(); stopAudio(); }
  function isCached(urls) { if (B) { try { return B.audioIsCached(JSON.stringify(urls)); } catch (e) {} } return false; }
  function prefetch(list, onProgress) {
    return new Promise((resolve) => {
      if (!B) { setTimeout(() => resolve({ ok: 0, fail: list.length, offline: true }), 300); return; }
      const id = nid('p');
      const off = on('prefetch', id, (d) => {
        if (d === 'error') { off(); resolve({ ok: 0, fail: list.length }); return; }
        const p = d.split('/');
        if (p[0] === 'done') { off(); resolve({ ok: +p[1], fail: +p[2] }); }
        else onProgress && onProgress(+p[0], +p[1], +p[2]);
      });
      B.audioPrefetch(id, JSON.stringify(list));
    });
  }
  function cacheSize() { if (B) { try { return B.audioCacheSize(); } catch (e) {} } return 0; }
  function clearCache() { if (B) { try { B.audioClearCache(); } catch (e) {} } }

  // ------------------------------------------------------------ kayıt
  let webRec = null, webStream = null, webChunks = [], webAnalyser = null;
  function micState() { if (B) return B.micPermission(); return 'unknown'; }
  function ensureMic() {
    return new Promise((resolve) => {
      if (!B) { resolve(true); return; }
      if (B.micPermission() === 'granted') { resolve(true); return; }
      const off = on('perm', 'mic', (d) => { off(); resolve(d === 'granted'); });
      B.requestMic();
    });
  }
  async function recStart(key) {
    const ok = await ensureMic();
    if (!ok) return false;
    stopAll();
    if (B) {
      return new Promise((resolve) => {
        const off = on('rec', key, (d) => { if (d === 'started' || d === 'error') { off(); resolve(d === 'started'); } });
        if (!B.recStart(key)) { off(); resolve(false); }
      });
    }
    try {
      webStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      webChunks = [];
      webRec = new MediaRecorder(webStream);
      webRec.ondataavailable = (e) => webChunks.push(e.data);
      webRec._key = key;
      webRec.start();
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const src = ac.createMediaStreamSource(webStream);
        webAnalyser = ac.createAnalyser(); webAnalyser.fftSize = 256; src.connect(webAnalyser);
      } catch (e) { webAnalyser = null; }
      return true;
    } catch (e) { return false; }
  }
  function recStop(key) {
    if (B) {
      return new Promise((resolve) => {
        const off = on('rec', key, (d) => { if (d === 'saved' || d === 'error') { off(); resolve(d); } });
        B.recStop();
        setTimeout(() => { off(); resolve('timeout'); }, 4000);
      });
    }
    return new Promise((resolve) => {
      if (!webRec) { resolve('error'); return; }
      webRec.onstop = () => {
        const blob = new Blob(webChunks, { type: 'audio/webm' });
        webRecs.set(webRec._key, URL.createObjectURL(blob));
        webStream.getTracks().forEach((t) => t.stop());
        webRec = null; webAnalyser = null;
        resolve('saved');
      };
      webRec.stop();
    });
  }
  function recLevel() {
    if (B) { try { return Math.min(1, B.recLevel() / 18000); } catch (e) { return 0; } }
    if (webAnalyser) {
      const a = new Uint8Array(webAnalyser.frequencyBinCount); webAnalyser.getByteTimeDomainData(a);
      let m = 0; for (const v of a) m = Math.max(m, Math.abs(v - 128)); return Math.min(1, m / 64);
    }
    return 0;
  }
  function recHas(key) { if (B) { try { return B.recHas(key); } catch (e) { return false; } } return webRecs.has(key); }
  function recDelete(key) { if (B) { try { B.recDelete(key); } catch (e) {} } webRecs.delete(key); }
  function recList() { if (B) { try { return JSON.parse(B.recList()); } catch (e) { return []; } } return [...webRecs.keys()]; }

  // ------------------------------------------------------------ durum / çeşitli
  function loadState() {
    if (B) { try { const s = B.loadState(); if (s) return s; } catch (e) {} }
    try { return localStorage.getItem('ky_state') || ''; } catch (e) { return ''; }
  }
  function saveState(s) {
    if (B) { try { B.saveState(s); } catch (e) {} }
    try { localStorage.setItem('ky_state', s); } catch (e) {}
  }
  function vibrate(ms) {
    if (K.Store && K.Store.s.settings.vibrate === false) return;
    if (B) { try { B.vibrate(ms); } catch (e) {} } else if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function keepScreenOn(on) { if (B) { try { B.keepScreenOn(!!on); } catch (e) {} } }
  function isOnline() { if (B) { try { return B.isOnline(); } catch (e) {} } return navigator.onLine !== false; }
  function openExternal(url) { if (B) B.openExternal(url); else window.open(url, '_blank'); }
  function openInApp(url, title) { if (B && B.openInApp) B.openInApp(url, title || ''); else window.open(url, '_blank'); }
  function setLandscape(on) { if (B && B.setLandscape) B.setLandscape(!!on); }
  function exitApp() { if (B) B.exitApp(); }
  function ttsVoices(lang) { if (B && B.ttsVoices) { try { return JSON.parse(B.ttsVoices(lang)); } catch (e) {} } return []; }
  function ttsSetVoice(lang, name) { if (B && B.ttsSetVoice) B.ttsSetVoice(lang, name); }
  function ttsGetVoice(lang) { if (B && B.ttsGetVoice) { try { return B.ttsGetVoice(lang); } catch (e) {} } return ''; }
  /** Gömülü paketi atlayıp doğrudan telefonun sesiyle konuşur (ses testi için). */
  function speakDevice(text, lang) { const v = K.VOICE; K.VOICE = null; const r = speak(text, lang); K.VOICE = v; return r; }
  function openTtsSettings() { if (B) B.openTtsSettings(); }
  function installTtsData() { if (B) B.installTtsData(); }
  function ttsReinit() { if (B) B.ttsReinit(); }
  // ------------------------------------------------------------ kullanıcı fotoğrafları
  const webImgs = new Map();
  function imageList() { if (B && B.userImageList) { try { return JSON.parse(B.userImageList()); } catch (e) {} } return [...webImgs.keys()]; }
  function saveImage(key, dataUrl) {
    if (B && B.saveUserImage) return B.saveUserImage(key, dataUrl.split(',')[1]);
    webImgs.set(key, dataUrl); return true;
  }
  function deleteImage(key) { if (B && B.deleteUserImage) B.deleteUserImage(key); webImgs.delete(key); }
  function imageUrl(key, stamp) {
    if (B) return `https://appassets.androidplatform.net/userimg/${key}.jpg?v=${stamp || 0}`;
    return webImgs.get(key) || '';
  }

  // ------------------------------------------------------------ otomatik güncelleme
  function updStatus() { if (B && B.updStatus) { try { return JSON.parse(B.updStatus()); } catch (e) {} } return null; }
  function updCheck() {
    return new Promise((resolve) => {
      if (!B || !B.updCheck) { resolve('web'); return; }
      const off = on('update', 'check', (d) => { off(); resolve(d); });
      B.updCheck();
    });
  }
  function updInstall() {
    return new Promise((resolve) => {
      if (!B || !B.updInstall) { resolve('web'); return; }
      const off = on('update', 'install', (d) => { off(); resolve(d); });
      B.updInstall();
    });
  }
  function updSetAuto(v) { if (B && B.updSetAuto) B.updSetAuto(!!v); }
  function openInstallPermission() { if (B && B.openInstallPermission) B.openInstallPermission(); }
  function requestNotif() {
    return new Promise((resolve) => {
      if (!B || !B.requestNotif) { resolve('web'); return; }
      const off = on('perm', 'notif', (d) => { off(); resolve(d); });
      B.requestNotif();
      setTimeout(() => { off(); resolve('timeout'); }, 20000);
    });
  }

  function version() { if (B) { try { return B.appVersion(); } catch (e) {} } return 'web'; }

  K.N = {
    isAndroid: !!B, on, speak, stopSpeech, ttsLangOk, ttsInfo: () => ttsInfo,
    play, stopAudio, stopAll, isCached, prefetch, cacheSize, clearCache,
    micState, ensureMic, recStart, recStop, recLevel, recHas, recDelete, recList,
    vhash, voiceFile,
    loadState, saveState, vibrate, keepScreenOn, isOnline, openExternal, openInApp, setLandscape, exitApp,
    openTtsSettings, installTtsData, ttsReinit, version, ttsVoices, ttsSetVoice, ttsGetVoice, speakDevice,
    updStatus, updCheck, updInstall, updSetAuto, openInstallPermission, requestNotif,
    imageList, saveImage, deleteImage, imageUrl,
  };
})();
