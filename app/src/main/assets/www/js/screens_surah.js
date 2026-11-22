/* Sûreler Bahçesi ve sûre oynatıcı: Dinle / Ezberle / Oku modları, kelime kelime ses, hoca kaydı. */
window.K = window.K || {};
(function () {
  const { h, sleep, btn, iconBtn, R, topbar } = K.UI;
  const S = K.Speech;
  const Screens = K.Screens = K.Screens || {};
  const ICONS = { 1: '🌹', 112: '🌻', 108: '🌊', 103: '⏳', 110: '🕊️', 113: '🌅', 114: '👥', 106: '🐪', 105: '🐘', 111: '🔥', 107: '🤲', 109: '🛡️', 104: '💬' };

  // ------------------------------------------------------------ bahçe
  Screens.garden = function () {
    const s = K.Store.s;
    const grid = h('div', { class: 'surah-grid' }, K.SURAHS.map((su, i) => {
      const st = s.surahs[su.n] || {};
      const badges = (st.listen ? '🎧' : '') + (st.memo ? '🧠' : '') + (st.read ? '📖' : '');
      return h('button', { class: 'surah-card pop-in', style: { animationDelay: (i * 0.03) + 's' }, onTap: () => R.go(Screens.surah, { n: su.n }) },
        h('div', { class: 'num' }, String(su.n)), h('div', { class: 'badges' }, badges),
        h('div', { class: 'sicon' }, ICONS[su.n] || '🌸'), h('div', { class: 'sar ar' }, su.ar), h('div', { class: 'str' }, su.tr), h('div', { class: 'sinfo' }, su.count + ' âyet'));
    }));
    const el = h('div', { class: 'screen garden' }, topbar('Sûreler Bahçesi', { sub: 'Dinle 🎧 · Ezberle 🧠 · Oku 📖' }),
      h('div', { class: 'scroll' }, h('div', { class: 'note' }, 'Kursta ezberlediğin sûreleri burada dinleyip tekrar edebilirsin. Okuma modu, Elif-Ba yolculuğunda ilerledikçe çok kolaylaşacak!'), grid));
    return { el, onEnter() { K.Speech.setCoach(null); S.say('Sûreler bahçesine hoş geldin! Hangi sûreyi dinlemek istersin?'); } };
  };

  // ------------------------------------------------------------ oynatıcı bileşeni
  /**
   * container içine sûreyi çizer. opts: {mode:'listen'|'memo'|'read', lesson:true, onComplete, teacher}
   */
  function buildPlayer(n, opts = {}) {
    const s = K.Store.s;
    const su = K.Q.surah(n);
    const st = K.Store.surah(n);
    let mode = opts.mode || 'listen';
    let reciterId = s.settings.reciter;
    let useTeacher = !!opts.teacher || (s.settings.useRec && hasTeacher());
    let playing = false, curA = 0, repeat = 1, hideLevel = 0;
    const readDone = new Set();
    const root = h('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 } });
    root.style.setProperty('--qsize', (s.settings.qsize || 40) + 'px');

    function hasTeacher() { return su.v.some((v) => K.N.recHas(K.Q.ayahKey(n, v.a))); }

    // kâri seçimi
    const rrow = h('div', { class: 'reciter-row' });
    function renderReciters() {
      rrow.innerHTML = '';
      if (hasTeacher()) rrow.append(h('button', { class: 'rchip' + (useTeacher ? ' on' : ''), onTap: () => { useTeacher = true; stop(); renderReciters(); } }, '🎙️ ' + (s.settings.teacherName || 'Hoca')));
      K.Q.RECITERS.forEach((r) => rrow.append(h('button', { class: 'rchip' + (!useTeacher && r.id === reciterId ? ' on' : ''), onTap: () => { useTeacher = false; reciterId = r.id; s.settings.reciter = r.id; K.Store.save(); stop(); renderReciters(); } }, r.name, h('small', { style: { opacity: .75, marginLeft: '4px' } }, r.sub))));
      const v = K.Q.SURAH_VIDEO[n];
      if (v && !opts.lesson) rrow.append(h('button', { class: 'rchip video', onTap: () => K.UI.videoModal(v) }, '📺 Musa Coşkun (video)'));
    }
    renderReciters();

    // sekmeler
    const tabs = h('div', { class: 'tabs' });
    const TABS = [['listen', '🎧 Dinle'], ['memo', '🧠 Ezberle'], ['read', '📖 Oku']];
    function renderTabs() {
      tabs.innerHTML = '';
      TABS.forEach(([id, label]) => tabs.append(h('button', { class: 'tab' + (mode === id ? ' on' : ''), onTap: () => { stop(); mode = id; renderTabs(); renderAyahs(); renderBar(); intro(); } }, label)));
    }
    if (!opts.lesson) renderTabs();

    // âyetler
    const list = h('div', { class: 'scroll', style: { paddingTop: '4px' } });
    const ayahEls = new Map();
    function renderAyahs() {
      list.innerHTML = '';
      ayahEls.clear();
      if (n !== 1) {
        const b = h('div', { class: 'basmala ar' }, K.BASMALA.w.map((w) => K.Q.text(w)).join(' '));
        b.addEventListener('click', () => playBasmala());
        list.append(b);
      }
      su.v.forEach((v) => {
        const words = h('div', { class: 'words' });
        const wEls = v.w.map((w, wi) => {
          const it = K.Q.wordItem(n, v.a, w);
          const hidden = mode === 'memo' && hideLevel > 0 && (hideLevel === 2 || wi % 2 === 1);
          const e = h('span', { class: 'w' + (hidden ? ' hide' : '') }, it.ar, w.m ? h('span', { class: 'm' }, ' ' + w.m) : null);
          e.addEventListener('click', () => { if (e.classList.contains('hide')) { e.classList.remove('hide'); return; } stop(); flash(e); S.item(it); });
          words.append(e);
          return e;
        });
        words.append(h('span', { class: 'ayah-num' }, '۝' + K.Q.toArabicDigits(v.a)));
        const tools = h('div', { class: 'ayah-tools' });
        if (mode === 'read' || mode === 'memo') {
          tools.append(btn('▶️', 'blue small', () => { stop(); playFrom(v.a, { single: true }); }, { 'aria-label': 'Âyeti dinle' }));
          if (mode === 'read') tools.append(btn('🔤 Kelime kelime', 'purple small', () => { stop(); wordByWord(v, wEls); }));
          const mic = K.Games.micButton({ key: 'child_ayah', max: 20000, afterPlay: () => { if (mode === 'read') markRead(v.a); } });
          tools.append(mic);
          if (mode === 'read') tools.append(btn(readDone.has(v.a) ? '✔️ Okundu' : 'Okudum ✔️', (readDone.has(v.a) ? 'green' : 'white') + ' small', (e) => { markRead(v.a); }));
        }
        const card = h('div', { class: 'ayah' + (readDone.has(v.a) ? ' done' : '') }, words,
          s.settings.showLatin && v.latin ? h('div', { class: 'latin' }, v.latin) : null,
          s.settings.showMeal && v.meal ? h('div', { class: 'meal' }, v.a + '. ' + v.meal) : null,
          tools.childNodes.length ? tools : null);
        card.addEventListener('click', (e) => { if (e.target === card || e.target === words) { stop(); playFrom(v.a, { single: mode !== 'listen' }); } });
        ayahEls.set(v.a, { card, wEls });
        list.append(card);
      });
      if (!opts.lesson) list.append(h('div', { class: 'note', style: { marginTop: '6px' } }, 'Kur\'an metni: Tanzil · Meal: Diyanet İşleri Başkanlığı. Kelimeye dokunarak tek tek dinleyebilirsin.'));
    }
    function flash(e) { e.classList.add('hl'); setTimeout(() => e.classList.remove('hl'), 700); }
    function setCur(a) {
      ayahEls.forEach((x, k) => x.card.classList.toggle('cur', k === a));
      const x = ayahEls.get(a);
      if (x) x.card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    function markRead(a) {
      if (readDone.has(a)) return;
      readDone.add(a); K.Sfx.ok(); renderBar();
      const x = ayahEls.get(a);
      if (x) { x.card.style.boxShadow = '0 5px 0 var(--green)'; const b = [...x.card.querySelectorAll('.btn')].find((bb) => /Okudum/.test(bb.textContent)); if (b) { b.textContent = '✔️ Okundu'; b.classList.remove('white'); b.classList.add('green'); } }
      if (readDone.size === su.v.length) {
        st.read = true; K.Store.save(true);
        K.UI.confetti(120); K.Sfx.tada();
        if (opts.onComplete) opts.onComplete(); else S.say('Maşallah! Bütün sûreyi okudun!');
      } else S.praise();
    }

    // oynatma
    const status = h('div', { style: { textAlign: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--ink2)', minHeight: '18px' } });
    async function playAyahAudio(a) {
      if (useTeacher && K.N.recHas(K.Q.ayahKey(n, a))) return K.N.play('rec:' + K.Q.ayahKey(n, a));
      return K.N.play(K.Q.ayahUrls(n, a, reciterId), { speed: s.settings.speed || 1, onLoading: () => { status.textContent = '⏳ Ses yükleniyor...'; }, onStart: () => { status.textContent = ''; } });
    }
    async function playBasmala() {
      stop();
      const g = S.gen;
      playing = true; renderBar();
      const r = useTeacher && K.N.recHas(K.Q.ayahKey(1, 1)) ? await K.N.play('rec:' + K.Q.ayahKey(1, 1)) : await K.N.play(K.Q.ayahUrls(1, 1, reciterId), { speed: s.settings.speed || 1 });
      if (g === S.gen) { playing = false; renderBar(); }
      return r;
    }
    async function playFrom(a, o = {}) {
      stop();
      const g = S.gen;
      playing = true; renderBar();
      if (!K.N.isOnline() && !useTeacher) status.textContent = 'İnternet yoksa sadece önceden indirilen sesler çalar.';
      if (a === 1 && n !== 1 && !o.single) { const r = await playBasmala(); if (g !== S.gen) return; if (r === 'error') { finishErr(); return; } playing = true; renderBar(); }
      for (let x = a; x <= su.v.length; x++) {
        curA = x; setCur(x);
        for (let rep = 0; rep < repeat; rep++) {
          const r = await playAyahAudio(x);
          if (g !== S.gen) return;
          if (r === 'error') { finishErr(); return; }
          if (r === 'stop') return;
          if (mode === 'memo') {
            await S.say(rep < repeat - 1 ? 'Tekrar dinle.' : 'Şimdi sen söyle!', { rate: 1.05 });
            if (g !== S.gen) return;
            await sleep(rep < repeat - 1 ? 200 : 3500);
            if (g !== S.gen) return;
          } else await sleep(250);
        }
        if (o.single) break;
      }
      playing = false; renderBar(); status.textContent = '';
      if (!o.single && mode === 'listen') {
        st.listen = (st.listen || 0) + 1; K.Store.save();
        K.Sfx.star(); S.say('Maşallah! Sûreyi baştan sona dinledin.');
      }
    }
    function finishErr() { playing = false; renderBar(); status.textContent = '⚠️ Ses açılamadı. İnternet bağlantısını kontrol edin ya da Ebeveyn Paneli\'nden sesleri indirin.'; }
    async function wordByWord(v, wEls) {
      const g = S.gen;
      setCur(v.a);
      for (let i = 0; i < v.w.length; i++) {
        if (g !== S.gen) return;
        wEls[i].classList.add('hl');
        await S.item(K.Q.wordItem(n, v.a, v.w[i]), { warn: i === 0 });
        wEls[i].classList.remove('hl');
        if (g !== S.gen) return;
        await sleep(350);
      }
      if (g === S.gen) S.say('Şimdi sen oku!');
    }
    function stop() { S.cancelAll(); playing = false; renderBar(); ayahEls.forEach((x) => x.wEls.forEach((e) => e.classList.remove('hl'))); }

    // alt çubuk
    const bar = h('div', { class: 'player-bar' });
    function seg(options, val, onSel) {
      return h('div', { class: 'seg' }, options.map(([v, label]) => h('button', { class: v === val ? 'on' : '', onTap: () => { K.Sfx.tap(); onSel(v); } }, label)));
    }
    function renderBar() {
      bar.innerHTML = '';
      if (mode === 'listen') {
        bar.append(playing ? btn('⏸️ Durdur', 'red', () => stop()) : btn('▶️ Baştan dinle', 'green', () => playFrom(1)),
          seg([[0.75, '🐢'], [1, '1x']], s.settings.speed || 1, (v) => { s.settings.speed = v; K.Store.save(); renderBar(); }));
      } else if (mode === 'memo') {
        bar.append(playing ? btn('⏸️', 'red', () => stop()) : btn('▶️ Ezberle', 'green', () => playFrom(curA || 1)),
          seg([[1, '1x'], [3, '3x'], [5, '5x']], repeat, (v) => { repeat = v; renderBar(); }),
          seg([[0, '👁️'], [1, '½'], [2, '🙈']], hideLevel, (v) => { hideLevel = v; renderAyahs(); renderBar(); }),
          st.memo ? h('span', { class: 'pill' }, '🧠 Ezberlendi') : btn('Ezberledim 🏅', 'yellow small', () => confirmMemo()));
      } else {
        bar.append(h('span', { class: 'pill' }, `📖 ${readDone.size} / ${su.v.length}`));
        if (playing) bar.append(btn('⏸️', 'red', () => stop()));
      }
    }
    async function confirmMemo() {
      S.say('Annene ya da babana ezberini dinlet!');
      if (!(await K.UI.confirm('Ezber kontrolü', `${s.profile.name || 'Çocuğunuz'} ${su.tr} sûresini ezbere okudu mu? (Ebeveyn onayı)`, 'Evet, okudu 🏅', 'Henüz değil'))) return;
      st.memo = true; K.Store.save(true);
      const fresh = K.Store.addSticker(K.C.EXTRA_STICKERS.surahMemo);
      K.UI.confetti(160); K.Sfx.tada(); renderBar();
      S.say(`Maşallah! ${su.tr} sûresini ezberledin!` + (fresh ? ' Madalya çıkartması kazandın!' : ''));
    }
    renderAyahs(); renderBar();

    function intro() {
      if (opts.silent) return;
      if (mode === 'listen') S.say(`${su.tr} sûresi. ${su.desc} Dinlemek için yeşil düğmeye bas.`);
      else if (mode === 'memo') S.say('Ezber zamanı! Her âyeti dinle, sonra sen tekrar et. Gizle düğmesiyle kelimeleri saklayabilirsin.');
      else S.say('Okuma zamanı! Her âyeti önce dinle, sonra sen oku ve Okudum düğmesine bas.');
    }
    root.append(rrow, tabs, list, status, bar);
    return { el: root, stop, intro, playFrom, get mode() { return mode; } };
  }

  Screens.surah = function (params) {
    const su = K.Q.surah(params.n);
    const p = buildPlayer(params.n, { teacher: params.teacher });
    const el = h('div', { class: 'screen garden' }, topbar(su.tr + ' sûresi', { sub: su.ar + ' · ' + su.count + ' âyet', hideStars: true, right: iconBtn('⚙️', () => quickSettings(), 'sm', 'Ayarlar') }), p.el);
    function quickSettings() {
      const s = K.Store.s;
      const sw = (label, key) => { const i = h('input', { type: 'checkbox' }); i.checked = !!s.settings[key]; i.addEventListener('change', () => { s.settings[key] = i.checked; K.Store.save(); }); return h('div', { class: 'field' }, h('label', null, label), h('label', { class: 'switch' }, i, h('span'))); };
      const size = h('input', { type: 'range', min: 28, max: 64, step: 2, value: s.settings.qsize || 40 });
      size.addEventListener('input', () => { s.settings.qsize = +size.value; K.Store.save(); });
      const close = K.UI.modal(h('div', { class: 'parent', style: { background: 'none' } }, h('h2', null, 'Görünüm'),
        sw('Türkçe meali göster', 'showMeal'), sw('Latin okunuşu göster', 'showLatin'),
        h('div', { class: 'field' }, h('label', null, 'Yazı boyutu'), size),
        h('div', { class: 'row' }, btn('Tamam', 'small', () => { close(); R.refresh(); }))));
    }
    return { el, onEnter() { K.Speech.setCoach(null); p.intro(); }, onLeave() { p.stop(); } };
  };

  // ders içinde sûre okuma (Sûre Okuma Yolu)
  async function readLesson(c) {
    const n = c.step.surah;
    const su = K.Q.surah(n);
    let res; const done = new Promise((r) => (res = r));
    const p = buildPlayer(n, { mode: 'read', lesson: true, silent: true, onComplete: () => res() });
    c.stage.style.justifyContent = 'flex-start';
    c.stage.append(h('div', { class: 'name', style: { textAlign: 'center', fontSize: '24px', fontWeight: 800 } }, su.tr + ' sûresi'), p.el);
    c.onCleanup(() => { p.stop(); c.stage.style.justifyContent = ''; });
    await S.say(`${su.tr} sûresini okuyalım! Her âyeti önce dinle, sonra sen oku ve Okudum düğmesine bas.`);
    await done;
    c.chk();
  }

  K.SurahUI = { buildPlayer, readLesson };
})();
