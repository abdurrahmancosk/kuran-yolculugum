/* Arayüz yardımcıları: öğe üretimi, ekran yönlendirici, modal, bildirim, konfeti, ebeveyn kapısı, video. */
window.K = window.K || {};
(function () {
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') {
          for (const [sk, sv] of Object.entries(v)) {
            if (sv == null) continue;
            if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
          }
        }
        else if (k.startsWith('on') && typeof v === 'function') {
          const ev = k.slice(2).toLowerCase();
          if (ev === 'tap') el.addEventListener('click', (e) => { K.Sfx.unlock(); v(e); });
          else el.addEventListener(ev, v);
        } else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const $ = (sel, root = document) => root.querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function btn(label, cls, onTap, attrs = {}) {
    return h('button', Object.assign({ class: 'btn ' + (cls || ''), onTap: (e) => { K.Sfx.tap(); onTap && onTap(e); } }, attrs), label);
  }
  function iconBtn(icon, onTap, cls = '', title = '') {
    return h('button', { class: 'btn icon-btn ' + cls, 'aria-label': title, onTap: (e) => { K.Sfx.tap(); onTap && onTap(e); } }, icon);
  }

  // ------------------------------------------------------------ yönlendirici
  const app = () => document.getElementById('app');
  const R = {
    stack: [],
    cur: null,
    go(screenFn, params = {}, opts = {}) {
      K.Speech && K.Speech.cancelAll();
      const old = R.cur;
      if (old) { old.onLeave && old.onLeave(); if (!opts.replace) R.stack.push({ fn: old.fn, params: old.params }); }
      const scr = screenFn(params) || {};
      scr.fn = screenFn; scr.params = params;
      R.cur = scr;
      app().innerHTML = '';
      app().append(scr.el);
      requestAnimationFrame(() => scr.onEnter && scr.onEnter());
    },
    back() {
      const prev = R.stack.pop();
      if (!prev) return false;
      K.Speech && K.Speech.cancelAll();
      if (R.cur && R.cur.onLeave) R.cur.onLeave();
      const scr = prev.fn(prev.params) || {};
      scr.fn = prev.fn; scr.params = prev.params;
      R.cur = scr;
      app().innerHTML = '';
      app().append(scr.el);
      requestAnimationFrame(() => scr.onEnter && scr.onEnter());
      return true;
    },
    home() {
      K.Speech && K.Speech.cancelAll();
      if (R.cur && R.cur.onLeave) R.cur.onLeave();
      R.stack = []; R.cur = null;
      R.go(K.Screens.home, {}, { replace: true });
    },
    refresh() {
      if (!R.cur) return;
      const { fn, params } = R.cur;
      if (R.cur.onLeave) R.cur.onLeave();
      const scr = fn(params) || {};
      scr.fn = fn; scr.params = params; R.cur = scr;
      app().innerHTML = ''; app().append(scr.el);
      requestAnimationFrame(() => scr.onEnter && scr.onEnter());
    },
  };

  function topbar(title, opts = {}) {
    const back = iconBtn(opts.backIcon || '⬅️', () => (opts.onBack ? opts.onBack() : R.back()), '', 'Geri');
    const t = h('div', { class: 'title' }, title, opts.sub ? h('small', null, opts.sub) : null);
    const right = opts.right || h('div', { class: 'pill', style: { visibility: opts.hideStars ? 'hidden' : 'visible' } }, '⭐ ', String(K.Store.totalStars()));
    return h('div', { class: 'topbar' }, back, t, right);
  }

  // ------------------------------------------------------------ modal / toast
  let modalStack = [];
  function modal(content, opts = {}) {
    const root = document.getElementById('modal-root');
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal' }, content);
    back.append(box);
    const close = (v) => {
      if (!back.isConnected) return;
      back.remove();
      modalStack = modalStack.filter((m) => m.close !== close);
      opts.onClose && opts.onClose(v);
    };
    back.addEventListener('click', (e) => { if (e.target === back && !opts.sticky) close(); });
    root.append(back);
    modalStack.push({ close });
    return close;
  }
  function closeTopModal() { const m = modalStack[modalStack.length - 1]; if (m) { m.close(); return true; } return false; }
  function confirm(title, text, yes = 'Evet', no = 'Vazgeç') {
    return new Promise((resolve) => {
      let res = false;
      const close = modal(h('div', null, h('h2', null, title), text ? h('p', null, text) : null,
        h('div', { class: 'row' }, btn(no, 'white small', () => close()), btn(yes, 'small', () => { res = true; close(); }))), { onClose: () => resolve(res) });
    });
  }
  function toast(msg, ms = 2400) {
    const root = document.getElementById('toast-root');
    root.innerHTML = '';
    const t = h('div', { class: 'toast' }, msg);
    root.append(t);
    setTimeout(() => t.remove(), ms);
  }

  // ------------------------------------------------------------ konfeti
  const conf = { parts: [], raf: 0 };
  function confetti(n = 120, origin) {
    const cv = document.getElementById('confetti');
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#FF6B9A', '#FFD23F', '#4CC26B', '#4AA8FF', '#8E7CFF', '#FF9F43', '#2BB3A3'];
    const ox = origin ? origin.x : innerWidth / 2, oy = origin ? origin.y : innerHeight * 0.35;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      conf.parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, r: 4 + Math.random() * 6, c: pick(colors), rot: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 90 + Math.random() * 60, star: Math.random() < .25 });
    }
    if (!conf.raf) {
      const step = () => {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        conf.parts = conf.parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
        for (const p of conf.parts) {
          p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.globalAlpha = Math.min(1, p.life / 30);
          if (p.star) { ctx.font = `${p.r * 3}px sans-serif`; ctx.fillText('★', -p.r, p.r); } else ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
          ctx.restore();
        }
        if (conf.parts.length) conf.raf = requestAnimationFrame(step); else { conf.raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
      };
      conf.raf = requestAnimationFrame(step);
    }
  }

  // ------------------------------------------------------------ ebeveyn kapısı
  const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
  const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
  function parentGate() {
    return new Promise((resolve) => {
      const n = 11 + Math.floor(Math.random() * 88);
      const words = (TENS[Math.floor(n / 10)] + ' ' + ONES[n % 10]).trim();
      let entry = '';
      let ok = false;
      const disp = h('div', { class: 'gate-display' }, ' ');
      const keys = h('div', { class: 'keypad' });
      const press = (d) => {
        if (d === '⌫') entry = entry.slice(0, -1); else if (entry.length < 2) entry += d;
        disp.textContent = entry || ' ';
        if (entry.length === 2) {
          if (+entry === n) { ok = true; close(); } else { disp.classList.add('shake'); setTimeout(() => { disp.classList.remove('shake'); entry = ''; disp.textContent = ' '; }, 500); }
        }
      };
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].forEach((d) => keys.append(btn(d, 'white', () => press(d))));
      const close = modal(h('div', null,
        h('h2', null, '👨‍👩‍👦 Ebeveyn girişi'),
        h('p', null, 'Devam etmek için şu sayıyı rakamla yazın: ', h('b', null, words)),
        disp, keys,
        h('div', { class: 'row' }, btn('Vazgeç', 'white small', () => close()))), { onClose: () => resolve(ok) });
    });
  }

  // ------------------------------------------------------------ video (uygulama içi, öneri göstermeyen oynatıcı)
  let ytReady = null;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytReady) return ytReady;
    ytReady = new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = () => resolve();
      const sc = document.createElement('script');
      sc.src = 'https://www.youtube.com/iframe_api';
      sc.onerror = () => { ytReady = null; reject(new Error('yt')); };
      document.head.append(sc);
      setTimeout(() => { if (!(window.YT && window.YT.Player)) { ytReady = null; reject(new Error('timeout')); } }, 15000);
    });
    return ytReady;
  }
  const fmtT = (t) => { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

  function videoModal(v) {
    if (!K.N.isOnline()) { toast('Video için internet bağlantısı gerekiyor.'); return; }
    K.N.stopAll();
    if (v.ext || !v.id) { K.N.openInApp(v.url, v.title); return; }
    const root = document.getElementById('modal-root');
    const thumb = `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
    const host = h('div', { class: 'vp-frame' });
    const mount = h('div', { id: 'yt-' + Math.random().toString(36).slice(2) });
    host.append(mount);
    // YouTube arayüzüne dokunulmasını engelleyen kalkan + kapak (duraklatma/bitişte önerileri gizler)
    const cover = h('div', { class: 'vp-cover', style: { backgroundImage: `url(${thumb})` } }, h('div', { class: 'vp-big' }, '▶'));
    const shield = h('div', { class: 'vp-shield' });
    const msg = h('div', { class: 'vp-msg hidden' });
    host.append(shield, cover, msg);
    const playB = btn('▶', 'green small', () => toggle());
    const back10 = btn('⏪ 10', 'white small', () => seekBy(-10));
    const fwd10 = btn('10 ⏩', 'white small', () => seekBy(10));
    const fsB = btn('⛶', 'white small', () => setFull(!full), { 'aria-label': 'Tam ekran' });
    const bar = h('div', { class: 'vp-bar' }, h('i'));
    const time = h('span', { class: 'vp-time' }, '0:00 / 0:00');
    const panel = h('div', { class: 'vp' },
      h('div', { class: 'vp-top' }, btn('✖ Kapat', 'white small', () => close()), h('div', { class: 'vp-title' }, v.title)),
      host, bar, h('div', { class: 'vp-ctrl' }, back10, playB, fwd10, time, fsB));
    root.append(panel);
    modalStack.push({ close });
    let player = null, timer = null, full = false, ended = false, dur = 0;
    function setCover(on, text) {
      cover.classList.toggle('hidden', !on);
      cover.querySelector('.vp-big').textContent = text || '▶';
    }
    function toggle() {
      if (!player || !player.getPlayerState) return;
      const st = player.getPlayerState();
      if (st === 1) player.pauseVideo();
      else { if (ended) { player.seekTo(0, true); ended = false; } player.playVideo(); }
    }
    function seekBy(d) { if (player && player.getCurrentTime) { const t = player.getCurrentTime() + d; player.seekTo(Math.max(0, Math.min(t, dur - 1)), true); } }
    function setFull(on) { full = on; panel.classList.toggle('full', on); K.N.setLandscape(on); }
    function tick() {
      if (!player || !player.getCurrentTime) return;
      const t = player.getCurrentTime(); dur = player.getDuration() || dur;
      bar.firstChild.style.width = (dur ? (t / dur) * 100 : 0) + '%';
      time.textContent = fmtT(t) + ' / ' + fmtT(dur);
      // video sonuna gelmeden durdur: YouTube'un bitiş ekranındaki öneriler hiç görünmesin
      if (dur && t >= dur - 0.6 && player.getPlayerState() === 1) { player.pauseVideo(); ended = true; setCover(true, '🔁'); }
    }
    bar.addEventListener('click', (e) => { if (!player || !dur) return; const r = bar.getBoundingClientRect(); player.seekTo(((e.clientX - r.left) / r.width) * dur, true); });
    shield.addEventListener('click', () => toggle());
    cover.addEventListener('click', () => toggle());
    function close() {
      clearInterval(timer);
      try { player && player.destroy(); } catch (e) {}
      if (full) setFull(false);
      panel.remove();
      modalStack = modalStack.filter((m) => m.close !== close);
    }
    loadYT().then(() => {
      player = new YT.Player(mount.id, {
        videoId: v.id, host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%',
        playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, disablekb: 1, fs: 0, playsinline: 1, cc_load_policy: 0, showinfo: 0, origin: location.origin, hl: 'tr' },
        events: {
          onReady: () => { player.playVideo(); timer = setInterval(tick, 250); },
          onStateChange: (e) => {
            const st = e.data;
            playB.textContent = st === 1 ? '⏸' : '▶';
            if (st === 1) { setCover(false); ended = false; }
            else if (st === 0) { ended = true; setCover(true, '🔁'); }
            else if (st === 2) setCover(true, '▶');
          },
          onError: (e) => {
            msg.classList.remove('hidden');
            msg.textContent = (e.data === 101 || e.data === 150 || e.data === 153) ? 'Bu videonun sahibi, videonun başka uygulamalarda oynatılmasına izin vermiyor.' : 'Video açılamadı. İnternet bağlantısını kontrol edin.';
            setCover(true, '⚠️');
          },
        },
      });
    }).catch(() => { msg.classList.remove('hidden'); msg.textContent = 'Video oynatıcısı yüklenemedi. İnternet bağlantısını kontrol edin.'; });
  }
  function videoItem(v) {
    const thumb = h('div', { class: 'vthumb', style: v.id ? { backgroundImage: `url(https://i.ytimg.com/vi/${v.id}/mqdefault.jpg)` } : { background: 'linear-gradient(135deg,#1D8A7D,#2BB3A3)' } });
    return h('button', { class: 'video-item', onTap: () => videoModal(v) }, thumb, h('div', null, h('div', { class: 'vtitle' }, v.title), h('div', { class: 'vsub' }, v.sub || (v.ext ? 'Tarayıcıda açılır' : ''))));
  }

  /** Galeriden fotoğraf seçer, en fazla 1000px JPEG'e küçültür. */
  function pickImage() {
    return new Promise((resolve) => {
      const inp = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      document.body.append(inp);
      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0];
        inp.remove();
        if (!f) return resolve(null);
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, 1000 / Math.max(img.width, img.height));
          const cv = document.createElement('canvas');
          cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          URL.revokeObjectURL(img.src);
          resolve(cv.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = () => resolve(null);
        img.src = URL.createObjectURL(f);
      });
      inp.click();
    });
  }
  /** Bir adım için kullanıcı fotoğrafı varsa <img>, yoksa çizim döndürür. */
  function stepVisual(key, svg) {
    const s = K.Store.s;
    const stamp = (s.photos || {})[key];
    if (stamp && K.N.imageList().includes(key)) {
      return h('img', { class: 'step-photo', src: K.N.imageUrl(key, stamp), alt: '' });
    }
    return h('div', { class: 'fig-ill', html: svg });
  }

  function stars(n, max = 3) { return '⭐'.repeat(n) + '☆'.repeat(Math.max(0, max - n)); }

  K.UI = { pickImage, stepVisual, h, $, sleep, shuffle, pick, btn, iconBtn, R, topbar, modal, closeTopModal, confirm, toast, confetti, parentGate, videoModal, videoItem, stars };
})();
