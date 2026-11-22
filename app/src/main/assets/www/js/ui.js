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

  // ------------------------------------------------------------ video
  function videoModal(v) {
    if (v.ext || !v.id) {
      if (!K.N.isOnline()) { toast('Video için internet bağlantısı gerekiyor.'); return; }
      K.N.openExternal(v.url);
      return;
    }
    if (!K.N.isOnline()) { toast('Video için internet bağlantısı gerekiyor.'); return; }
    K.N.stopAll();
    const src = `https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1&playsinline=1&fs=1&autoplay=1&hl=tr`;
    const frame = h('div', { class: 'video-frame' }, h('iframe', { src, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin', title: v.title }));
    const close = modal(h('div', null, h('h2', null, v.title), v.sub ? h('p', { style: { marginTop: '-4px', color: 'var(--ink2)' } }, v.sub) : null, frame,
      h('div', { class: 'row' },
        btn('YouTube\'da aç', 'white small', () => { close(); K.N.openExternal('https://www.youtube.com/watch?v=' + v.id); }),
        btn('Kapat', 'small', () => close()))));
  }
  function videoItem(v) {
    const thumb = h('div', { class: 'vthumb', style: v.id ? { backgroundImage: `url(https://i.ytimg.com/vi/${v.id}/mqdefault.jpg)` } : { background: 'linear-gradient(135deg,#1D8A7D,#2BB3A3)' } });
    return h('button', { class: 'video-item', onTap: () => videoModal(v) }, thumb, h('div', null, h('div', { class: 'vtitle' }, v.title), h('div', { class: 'vsub' }, v.sub || (v.ext ? 'Tarayıcıda açılır' : ''))));
  }

  function stars(n, max = 3) { return '⭐'.repeat(n) + '☆'.repeat(Math.max(0, max - n)); }

  K.UI = { h, $, sleep, shuffle, pick, btn, iconBtn, R, topbar, modal, closeTopModal, confirm, toast, confetti, parentGate, videoModal, videoItem, stars };
})();
