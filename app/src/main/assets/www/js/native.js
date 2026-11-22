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

  // ------------------------------------------------------------ konuşma: YALNIZ İNSAN SESİ
  // Yapay ses (TTS) kullanılmaz. Bir cümle için sırasıyla: ebeveynin kendi kaydı → gömülü insan sesi kaydı
  // (Diyanet Elif-Ba CD'si, Namaz Hocası, çizgi film; js/hv_index.js) → ses yok ('nospeech', metin balonda kalır).
  let currentSpeech = null;
  function vhash(lang, t) {
    t = (lang + '|' + String(t)).normalize('NFC').replace(/\s+/g, ' ').trim();
    let h1 = 0x811c9dc5, h2 = 5381;
    for (const ch of t) { const c = ch.codePointAt(0); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = (Math.imul(h2, 33) + c) >>> 0; }
    return h1.toString(36) + h2.toString(36);
  }
  const normT = (t) => String(t).normalize('NFC').toLocaleLowerCase('tr').replace(/[.,!?;:…"“”'‘’()\-–]/g, ' ').replace(/\s+/g, ' ').trim();
  let hvByText = null;
  /** Metnin birebir söylendiği gömülü insan sesi kaydının anahtarı. */
  function hvFor(text) {
    if (!hvByText) { hvByText = new Map(); Object.entries(K.HV_TEXT || {}).forEach(([k, t]) => hvByText.set(normT(t), k)); }
    return hvByText.get(normT(text)) || null;
  }
  const hvHas = (key) => !!(key && K.HV && K.HV.has(key));
  const hvUrl = (key) => (B ? 'asset:www/hv/' + key + '.mp3' : 'hv/' + key + '.mp3');
  /** Ebeveynin bu cümle için yaptığı kaydın anahtarı. */
  const sayKey = (text) => 'say_' + vhash('tr', text);
  function voiceFile(text) { return hvFor(text); }

  /** Cümleyi insan sesiyle söyler. Döner: 'done' | 'stop' | 'error' | 'nospeech' */
  async function speak(text, lang = 'tr', opts = {}) {
    if (K.onSpeak) K.onSpeak(text, lang);
    const speed = Math.max(0.7, Math.min(1.3, opts.rate || 1));
    const map = (r) => (r === 'end' ? 'done' : r === 'stop' ? 'stop' : 'error');
    const rk = sayKey(text);
    if (recHas(rk)) return map(await play('rec:' + rk, { speed: 1 }));
    const keys = (opts.hv ? [].concat(opts.hv) : [hvFor(text)]).filter(hvHas);
    if (!keys.length) { if (K.onMiss) K.onMiss(text, lang); return 'nospeech'; }
    for (const k of keys) { const r = await play([hvUrl(k)], { speed }); if (r !== 'end') return map(r); }
    return 'done';
  }
  function stopSpeech() { if (currentSpeech) currentSpeech.cancel(); }
  function ttsLangOk() { return false; }

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
    isAndroid: !!B, on, speak, stopSpeech, ttsLangOk, hvFor, hvHas, hvUrl, sayKey,
    play, stopAudio, stopAll, isCached, prefetch, cacheSize, clearCache,
    micState, ensureMic, recStart, recStop, recLevel, recHas, recDelete, recList,
    vhash, voiceFile,
    loadState, saveState, vibrate, keepScreenOn, isOnline, openExternal, openInApp, setLandscape, exitApp,
    version,
    updStatus, updCheck, updInstall, updSetAuto, openInstallPermission, requestNotif,
    imageList, saveImage, deleteImage, imageUrl,
  };
})();
