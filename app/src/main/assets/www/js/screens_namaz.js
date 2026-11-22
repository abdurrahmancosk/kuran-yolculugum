/* Namaz Öğreniyorum: abdest, adım adım namaz (otomatik rehber), dualar, beş vakit, sıralama oyunu, videolar. */
window.K = window.K || {};
(function () {
  const { h, sleep, shuffle, btn, iconBtn, R, topbar } = K.UI;
  const S = K.Speech;
  const NZ = K.NZ;
  const Screens = K.Screens = K.Screens || {};

  /** Erkek / Kadın çizim seçimi. */
  function genderSeg(onChange) {
    const s = K.Store.s;
    const wrap = h('div', { class: 'gender-seg' });
    const render = () => {
      wrap.innerHTML = '';
      [['m', '👦 Erkek'], ['f', '👧 Kadın']].forEach(([g, l]) => wrap.append(h('button', { class: s.settings.namazGender === g ? 'on' : '',
        onTap: () => { if (s.settings.namazGender === g) return; K.Sfx.tap(); s.settings.namazGender = g; K.Store.save(); render(); onChange && onChange(g); } }, l)));
    };
    render();
    return wrap;
  }

  function duaText(d) { return d.words ? d.words.map((w) => K.Q.text(w)).join(' ') : d.ar; }

  /** Duayı seslendirir: hoca kaydı → Kur'an sesi (âyetse) → Arapça TTS → Türkçe okunuş. */
  async function playDua(d, opts = {}) {
    const g = S.gen;
    const key = 'dua_' + d.id;
    if (K.Store.s.settings.useRec && K.N.recHas(key)) return K.N.play('rec:' + key);
    if (d.basmala) { const r = await S.ayah(1, 1); if (r !== 'error') return r; }
    else if (d.words && d.from === 1) { const r = await S.ayah(d.s, d.a); if (r !== 'error') return r; }
    else if (d.words) {
      let ok = true;
      for (let i = 0; i < d.words.length; i++) {
        if (g !== S.gen) return 'stop';
        opts.onWord && opts.onWord(i);
        const r = await K.N.play(K.Q.wordUrls(d.s, d.a, d.words[i].i));
        if (r === 'error') { ok = false; break; }
        if (r === 'stop') return 'stop';
      }
      opts.onWord && opts.onWord(-1);
      if (ok) return 'end';
    }
    if (g !== S.gen) return 'stop';
    // Arapça yapay ses kullanılmaz: Türk okuyuşuyla (kursta öğretildiği gibi) erkek sesiyle okunur.
    return K.N.speak(d.lat, 'tr', { rate: 0.85 });
  }
  async function playSurahFull(n) {
    const g = S.gen;
    if (n !== 1) { const r = await S.ayah(1, 1); if (r === 'error' || g !== S.gen) return r; }
    const su = K.Q.surah(n);
    for (const v of su.v) { const r = await S.ayah(n, v.a); if (r !== 'end' || g !== S.gen) return r; await sleep(200); }
    return 'end';
  }

  // ------------------------------------------------------------ merkez
  Screens.namaz = function () {
    const t = (icon, label, color, cd, fn) => h('button', { class: 'tile', style: { '--c': color, '--cd': cd }, onTap: fn }, h('div', { class: 'ti' }, icon), h('div', { class: 'tl' }, label));
    const s = K.Store.s;
    const el = h('div', { class: 'screen namaz' }, topbar('Namaz Öğreniyorum', { sub: 'Sesli, resimli ve videolu' }),
      h('div', { class: 'scroll' }, h('div', { class: 'note', style: { textAlign: 'center' } }, 'Resimlerde kimi görmek istersin?', genderSeg()), h('div', { class: 'tiles' },
        h('button', { class: 'tile wide', style: { '--c': 'var(--purple)', '--cd': 'var(--purple-d)' }, onTap: () => R.go(Screens.namazSteps, { auto: false }) },
          h('div', { class: 'ti' }, '🧎'), h('div', null, h('div', { class: 'tl' }, 'Namaz Kılıyorum'), h('div', { class: 'ts' }, 'Adım adım, resimli ve sesli' + (s.namaz.steps ? ' ✔️' : '')))),
        t('💧', 'Abdest Alıyorum' + (s.namaz.abdest ? ' ✔️' : ''), 'var(--blue)', 'var(--blue-d)', () => R.go(Screens.abdest)),
        t('🎧', 'Benimle Namaz Kıl', 'var(--teal)', 'var(--teal-d)', () => R.go(Screens.namazSteps, { auto: true })),
        t('🤲', 'Namaz Duaları', 'var(--green)', 'var(--green-d)', () => R.go(Screens.duas)),
        t('🕐', 'Beş Vakit', 'var(--orange)', 'var(--orange-d)', () => R.go(Screens.vakitler)),
        t('🧩', 'Namaz Sırası', '#C27C3E', '#9A5A22', () => R.go(Screens.namazOrder)),
        t('🎬', 'Namaz Videoları', 'var(--pink)', 'var(--pink-d)', () => R.go(Screens.namazVideos)))));
    return { el, onEnter() { K.Speech.setCoach(null); S.say('Namaz, Allah ile konuşmaktır. Haydi birlikte öğrenelim!'); } };
  };

  // ------------------------------------------------------------ abdest
  Screens.abdest = function () {
    let i = 0;
    const stage = h('div', { class: 'stage' });
    const coach = K.makeCoach();
    const el = h('div', { class: 'screen namaz' }, topbar('Abdest Alıyorum', { sub: 'Adım adım' }), genderSeg(() => render()), stage, coach.el);
    function render() {
      S.cancelAll();
      const st = NZ.ABDEST[i];
      const ill = K.UI.stepVisual(`ab_${K.Store.s.settings.namazGender}_${i}`, K.Fig.abdestSvg(i)); ill.classList.add('pop-in');
      if (st.count) ill.append(h('div', { class: 'drops' }, [18, 48, 78].map((x, k) => h('i', { style: { left: x + '%', animationDelay: (k * 0.4) + 's' } }, '💧'))));
      const d = st.dua ? NZ.DUA[st.dua] : null;
      const card = h('div', { class: 'pose-card' }, h('div', { class: 'sub', style: { fontWeight: 800, color: 'var(--ink2)' } }, `${i + 1} / ${NZ.ABDEST.length}`),
        ill, h('h3', null, st.title), st.count ? h('div', { style: { fontSize: '28px' } }, '💧'.repeat(st.count)) : null,
        h('p', null, st.text),
        d ? h('div', { class: 'say' }, duaText(d)) : null, d ? h('div', { class: 'say-tr' }, d.lat) : null);
      const prev = iconBtn('⬅️', () => { if (i > 0) { i--; render(); } }, '', 'Önceki');
      const next = btn(i === NZ.ABDEST.length - 1 ? 'Bitti ✔️' : 'Sonraki ➡️', 'green', () => {
        if (i < NZ.ABDEST.length - 1) { i++; render(); } else finish();
      });
      stage.innerHTML = '';
      stage.append(card, h('div', { class: 'action-row' }, prev, iconBtn('🔊', () => narrate(), 'sm'), d ? btn('🤲 Dinle', 'purple', () => playDua(d)) : null, next));
      narrate();
      async function narrate() { coach.show(st.title + ' 🔊'); await S.say(st.title + '. ' + st.text, { bubble: false }); if (d) { await sleep(200); await playDua(d); } next.classList.add('pulse'); }
    }
    function finish() {
      K.Store.s.namaz.abdest = true; const fresh = K.Store.addSticker(K.C.EXTRA_STICKERS.abdest); K.Store.save(true);
      K.UI.confetti(140); K.Sfx.tada(); coach.happy();
      S.say('Maşallah! Abdestini aldın. Artık namaz kılmaya hazırsın!' + (fresh ? ' Su damlası çıkartması kazandın!' : '')).then(() => R.back());
    }
    return { el, onEnter() { render(); } };
  };

  // ------------------------------------------------------------ namaz adımları
  Screens.namazSteps = function (params) {
    let i = 0;
    let auto = !!params.auto;
    const stage = h('div', { class: 'stage', style: { justifyContent: 'flex-start' } });
    const foot = h('div', { class: 'lesson-foot' });
    const coach = K.makeCoach();
    const autoBtn = btn(auto ? '⏸️ Otomatik' : '▶️ Otomatik', 'small ' + (auto ? 'orange' : 'white'), () => { auto = !auto; autoBtn.textContent = auto ? '⏸️ Otomatik' : '▶️ Otomatik'; autoBtn.className = 'btn small ' + (auto ? 'orange' : 'white'); if (auto) render(); else S.cancelAll(); });
    const el = h('div', { class: 'screen namaz' }, topbar(params.auto ? 'Benimle Namaz Kıl' : 'Namaz Kılıyorum', { sub: 'Sabah namazının farzı (2 rekât)', right: autoBtn }), genderSeg(() => render()), h('div', { class: 'scroll', style: { display: 'flex', flexDirection: 'column', paddingBottom: '8px' } }, stage), foot, coach.el);
    function render() {
      S.cancelAll();
      const st = NZ.NAMAZ[i];
      const d = st.dua ? NZ.DUA[st.dua] : null;
      const more = (st.more || []).map((id) => NZ.DUA[id]);
      const sayEls = [];
      const parts = [h('div', { class: 'sub', style: { fontWeight: 800, color: 'var(--ink2)' } }, `${i + 1} / ${NZ.NAMAZ.length} · ${NZ.POSE_NAMES[st.pose] || ''}`),
        (() => { const v = K.UI.stepVisual(`nz_${K.Store.s.settings.namazGender}_${i}`, K.Fig.poseSvg(st.pose)); v.classList.add('pop-in'); return v; })(), h('h3', null, st.title), h('p', null, K.NZ.stepText(st))];
      [d, st.dua2 ? NZ.DUA[st.dua2] : null, ...more].filter(Boolean).forEach((dd) => {
        const se = h('div', { class: 'say' }, duaText(dd));
        sayEls.push(se);
        parts.push(h('div', { style: { fontWeight: 800, marginTop: '6px', color: 'var(--ink2)' } }, dd.title), se, h('div', { class: 'say-tr' }, dd.lat));
      });
      if (st.surah) { const su = K.Q.surah(st.surah); parts.push(h('div', { class: 'say' }, su.v.slice(0, 2).map((v) => v.w.map((w) => K.Q.text(w)).join(' ')).join(' ۝ ') + (su.v.length > 2 ? ' …' : ''))); }
      const card = h('div', { class: 'pose-card' }, ...parts);
      const prev = iconBtn('⬅️', () => { if (i > 0) { i--; render(); } }, 'sm', 'Önceki');
      const next = btn(i === NZ.NAMAZ.length - 1 ? 'Bitti ✔️' : 'Sonraki ➡️', 'green', () => { if (i < NZ.NAMAZ.length - 1) { i++; render(); } else finish(); });
      const listen = btn('🤲 Dinle', 'purple', () => playAll());
      stage.innerHTML = '';
      stage.append(card);
      stage.parentElement && (stage.parentElement.scrollTop = 0);
      foot.innerHTML = '';
      foot.append(prev, iconBtn('🔊', () => narrate(false), 'sm'));
      if (d || st.surah) foot.append(listen);
      foot.append(next);
      narrate(auto);
      async function playAll() {
        const g = S.gen;
        const all = [d, st.dua2 ? NZ.DUA[st.dua2] : null, ...more].filter(Boolean);
        for (let k = 0; k < all.length; k++) {
          sayEls[k] && sayEls[k].classList.add('hl'); if (sayEls[k]) sayEls[k].style.background = '#FFF3B0';
          for (let t = 0; t < (st.times || 1); t++) { await playDua(all[k]); if (g !== S.gen) return false; await sleep(300); }
          if (sayEls[k]) sayEls[k].style.background = '';
        }
        if (st.surah) { await playSurahFull(st.surah); if (g !== S.gen) return false; }
        return true;
      }
      async function narrate(goOn) {
        const g = S.gen;
        coach.show(st.title + ' 🔊'); await S.say(st.title + '. ' + K.NZ.stepText(st), { bubble: false }); if (g !== S.gen) return;
        if (goOn && (d || st.surah)) { await sleep(250); if (!(await playAll())) return; }
        next.classList.add('pulse');
        if (goOn && auto && g === S.gen) { await sleep(1200); if (g === S.gen && auto) { if (i < NZ.NAMAZ.length - 1) { i++; render(); } else finish(); } }
      }
    }
    function finish() {
      K.Store.s.namaz.steps = true; const fresh = K.Store.addSticker(K.C.EXTRA_STICKERS.namaz); K.Store.save(true);
      K.UI.confetti(160); K.Sfx.tada(); coach.happy();
      S.say('Maşallah! Namazı baştan sona öğrendin. Allah kabul etsin!' + (fresh ? ' Yeni bir çıkartma kazandın!' : ''));
      stage.innerHTML = ''; foot.innerHTML = '';
      stage.append(h('div', { class: 'celebrate' }, K.Mascot.el('happy'), h('h2', null, 'Allah kabul etsin!'), h('p', null, 'Namazın bütün adımlarını öğrendin.'),
        h('div', { class: 'action-row' }, btn('🔁 Baştan', 'orange', () => { i = 0; render(); }), btn('🧩 Sırala oyunu', 'green', () => R.go(Screens.namazOrder, {}, { replace: true })))));
    }
    return { el, onEnter() { K.N.keepScreenOn(true); render(); }, onLeave() { K.N.keepScreenOn(false); } };
  };

  // ------------------------------------------------------------ dualar
  Screens.duas = function () {
    const list = h('div', null, NZ.DUAS.map((d) => {
      const arEl = h('div', { class: 'ar' }, duaText(d));
      const mic = K.Games.micButton({ key: 'child_dua', max: 30000 });
      return h('div', { class: 'dua-card' }, h('h3', null, d.title), arEl, h('div', { class: 'lat' }, d.lat), h('div', { class: 'mean' }, '📘 ' + d.mean),
        h('div', { class: 'action-row', style: { justifyContent: 'flex-start' } },
          btn('▶️ Dinle', 'blue small', () => { S.cancelAll(); arEl.style.background = '#FFF3B0'; playDua(d).then(() => { arEl.style.background = ''; }); }),
          btn('🗣️ Okunuşu', 'white small', () => { S.cancelAll(); K.N.speak(d.lat, 'tr', { rate: 0.85 }); }),
          btn('📘 Anlamı', 'white small', () => { S.cancelAll(); S.say(d.mean, { bubble: false }); }),
          mic));
    }));
    const el = h('div', { class: 'screen namaz' }, topbar('Namaz Duaları', { sub: 'Dinle, tekrar et, ezberle' }), h('div', { class: 'scroll' },
      h('div', { class: 'note' }, 'İpucu: Ebeveyn Paneli → Ses Kayıt Stüdyosu\'ndan dualar hocamızın sesiyle kaydedilirse burada o ses çalar.'), list));
    return { el, onEnter() { K.Speech.setCoach(null); S.say('Namazda okuduğumuz dualar burada. Dinle düğmesine bas!'); } };
  };

  // ------------------------------------------------------------ beş vakit
  Screens.vakitler = function () {
    const grid = h('div', { class: 'vakit-grid' }, NZ.VAKITLER.map((v) => h('button', { class: 'vakit pop-in', onTap: () => S.say(v.text) },
      h('div', { class: 'vi' }, v.icon), h('div', null, h('div', { class: 'vt' }, v.name + ' namazı'), h('div', { class: 'vr' }, v.parts.map(([t, c]) => h('span', { class: c === 'f' ? 'f' : c === 'v' ? 'v' : '' }, t)))))));
    const el = h('div', { class: 'screen namaz' }, topbar('Beş Vakit Namaz', { sub: 'Günde beş kere' }), h('div', { class: 'scroll' },
      h('div', { class: 'note' }, 'Turuncu: farz · Sarı: sünnet · Mor: vacip (vitir). Bir güne toplam 40 rekât.'), grid));
    return { el, onEnter() { K.Speech.setCoach(null); S.say('Günde beş vakit namaz kılarız: sabah, öğle, ikindi, akşam ve yatsı. Bir vakte dokun!'); } };
  };

  // ------------------------------------------------------------ sıralama oyunu
  Screens.namazOrder = function () {
    const order = NZ.ORDER_GAME;
    let pos = 0, mistakes = 0;
    const slots = h('div', { class: 'order-slots' }, order.map((_, k) => h('div', { class: 'order-slot' }, String(k + 1))));
    const cards = h('div', { class: 'order-cards' });
    const coach = K.makeCoach();
    shuffle(order).forEach((p) => {
      const c = h('button', { class: 'order-card pop-in', html: K.Fig.poseSvg(p, { noRug: true, tight: true }) });
      c.append(h('small', null, NZ.POSE_NAMES[p]));
      c.addEventListener('click', async () => {
        K.Sfx.unlock();
        if (p === order[pos]) {
          K.Sfx.ok(); c.classList.add('used');
          const sl = slots.children[pos]; sl.innerHTML = K.Fig.poseSvg(p, { noRug: true, tight: true }); sl.classList.add('filled', 'pop-in');
          pos++; coach.happy();
          if (pos === order.length) {
            K.UI.confetti(160); K.Sfx.tada();
            await S.say(mistakes < 2 ? 'Maşallah! Namazın sırasını çok iyi biliyorsun!' : 'Aferin! Sırayı tamamladın!');
            cards.innerHTML = ''; cards.append(btn('🔁 Tekrar oyna', 'orange big', () => R.refresh()));
          } else S.say(NZ.POSE_NAMES[p] + '!', { rate: 1.1 });
        } else {
          mistakes++; K.Sfx.soft(); coach.sad(); c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 450);
          S.say(pos === 0 ? 'Namaz tekbirle başlar!' : `${NZ.POSE_NAMES[order[pos - 1]]} sonrası ne gelir? Bir düşün.`);
        }
      });
      cards.append(c);
    });
    const el = h('div', { class: 'screen namaz' }, topbar('Namaz Sırası', { sub: 'Hareketleri sırayla diz' }), genderSeg(() => R.refresh()), h('div', { class: 'stage' }, slots, cards), coach.el);
    return { el, onEnter() { S.say('Namazın hareketlerini sırayla dizelim. İlk hangisi?'); } };
  };

  // ------------------------------------------------------------ videolar
  Screens.namazVideos = function () {
    const el = h('div', { class: 'screen namaz' }, topbar('Namaz Videoları', { sub: 'Diyanet Çocuk · Namaz Kılmayı Öğreniyorum' }), h('div', { class: 'scroll' },
      h('div', { class: 'note' }, 'Videolar internetten (YouTube) oynatılır. Ebeveyn Paneli\'nden yeni video ekleyebilirsiniz — örneğin Musa Coşkun Hoca\'nın namaz videoları.'),
      h('div', { class: 'video-list' }, K.Q.videos('namaz').map(K.UI.videoItem))));
    return { el, onEnter() { K.Speech.setCoach(null); S.say('Namaz kılmayı videolarla da öğrenebilirsin!'); } };
  };

  K.NamazUI = { playDua, duaText };
})();
