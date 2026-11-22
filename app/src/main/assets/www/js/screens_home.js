/* Ana ekran, yolculuk haritası, oyun parkı, Elif-Ba tablosu, çıkartmalar, hoca videoları, belge, mola. */
window.K = window.K || {};
(function () {
  const { h, sleep, shuffle, btn, iconBtn, R, topbar } = K.UI;
  const S = K.Speech;
  const Screens = K.Screens = K.Screens || {};

  function holdButton(icon, onHold, ms = 1100) {
    const b = h('button', { class: 'btn icon-btn sm', 'aria-label': 'Ebeveyn' }, icon);
    let t = null;
    const start = () => { b.classList.add('pressed'); t = setTimeout(() => { b.classList.remove('pressed'); K.N.vibrate(30); onHold(); }, ms); };
    const end = () => { clearTimeout(t); b.classList.remove('pressed'); };
    b.addEventListener('pointerdown', start); b.addEventListener('pointerup', end); b.addEventListener('pointerleave', end); b.addEventListener('pointercancel', end);
    b.addEventListener('click', () => K.UI.toast('Ebeveyn bölümü için kilide basılı tutun 🔒', 1800));
    return b;
  }
  async function openParent() { if (await K.UI.parentGate()) R.go(Screens.parent); }
  Screens.openParent = openParent;

  // ------------------------------------------------------------ ana ekran
  Screens.home = function () {
    const s = K.Store.s;
    const name = s.profile.name;
    const m = K.Mascot.el('home-mascot');
    const bubble = h('div', { class: 'bubble' });
    const cur = K.C.currentLevel();
    const doneCount = K.C.LEVELS.filter((l) => s.levels[l.id] && s.levels[l.id].done).length;
    const pct = Math.round(doneCount / K.C.LEVELS.length * 100);
    const tile = (icon, label, sub, color, cd, onTap, wide) => h('button', { class: 'tile' + (wide ? ' wide' : ''), style: { '--c': color, '--cd': cd }, onTap: () => { K.Sfx.tap(); onTap(); } },
      h('div', { class: 'ti' }, icon), h('div', null, h('div', { class: 'tl' }, label), sub ? h('div', { class: 'ts' }, sub) : null));
    const tiles = h('div', { class: 'tiles' },
      tile('🗺️', 'Elif-Ba Yolculuğu', cur ? 'Sıradaki: ' + cur.title : '', 'var(--teal)', 'var(--teal-d)', () => R.go(Screens.map), true),
      tile('🌳', 'Sûreler Bahçesi', 'Dinle, ezberle, oku', 'var(--green)', 'var(--green-d)', () => R.go(Screens.garden)),
      tile('🕌', 'Namaz Öğreniyorum', 'Abdest, namaz, dualar', 'var(--purple)', 'var(--purple-d)', () => R.go(Screens.namaz)),
      tile('🎮', 'Oyun Parkı', 'Harf oyunları', 'var(--orange)', 'var(--orange-d)', () => R.go(Screens.playground)),
      tile('📺', 'Hocamızdan Dinle', 'Musa Coşkun Hoca', 'var(--blue)', 'var(--blue-d)', () => R.go(Screens.hoca)),
      tile('🌟', 'Çıkartmalarım', s.stickers.length + ' çıkartma', 'var(--pink)', 'var(--pink-d)', () => R.go(Screens.stickers)),
      s.diploma ? tile('🎓', 'Belgem', 'Kur\'an okuyucusu', '#E0AE10', '#B88C00', () => R.go(Screens.diploma)) : tile('🔤', 'Elif-Ba Tablosu', 'Harflere dokun', '#E05BA0', '#B83C7F', () => R.go(Screens.chart)));
    const prog = h('div', { class: 'progress-ring' }, h('span', { style: { fontWeight: 800 } }, '🚀'), h('div', { class: 'bar' }, h('i', { style: { width: Math.max(3, pct) + '%' } })),
      h('span', { style: { fontWeight: 800 } }, '%' + pct), s.streak.count > 1 ? h('span', { style: { fontWeight: 800 } }, '🔥' + s.streak.count) : null);
    const head = h('div', { class: 'home-head' }, m, h('div', { class: 'home-hello' }, h('h1', null, 'Esselâmü aleyküm' + (name ? ', ' + name : '') + '!'), bubble));
    const el = h('div', { class: 'screen home' }, h('div', { class: 'parent-lock' }, holdButton('🔒', openParent)), h('div', { class: 'scroll' }, head, prog, tiles));
    const coach = { el: null, mascot: m, bubble, last: '', show(t) { this.last = t; bubble.textContent = t; }, talking(on) { m.classList.toggle('talking', !!on); }, happy() { K.Mascot.react(m, 'happy'); }, sad() {} };
    m.addEventListener('click', () => { K.Mascot.react(m, 'happy'); S.say(K.UI.pick(['Ben Hüdhüd! Seninle Kur\'an okumayı öğreneceğiz.', 'Haydi bir ders yapalım!', 'Bugün çok güzel bir gün!'])); });
    return {
      el,
      onEnter() {
        K.Speech.setCoach(coach);
        const first = !s.greetedDay || s.greetedDay !== K.Store.today();
        s.greetedDay = K.Store.today(); K.Store.save();
        const msg = first ? `Esselâmü aleyküm${name ? ' ' + name : ''}! Ben Hüdhüd. Bugün ne yapmak istersin?` : 'Bugün ne yapmak istersin?';
        coach.show(msg);
        setTimeout(() => S.say(msg), 350);
        if (!s.onboarded) setTimeout(onboarding, 600);
      },
    };
  };

  function onboarding() {
    const s = K.Store.s;
    const nameIn = h('input', { type: 'text', placeholder: 'Çocuğunuzun adı', value: s.profile.name || '', style: { width: '100%', padding: '10px', borderRadius: '12px', border: '2px solid #E6DEEF', fontSize: '18px' } });
    let level = 'harf';
    const opts = [['harf', '🏝️ Yeni başlıyor (harfler)'], ['hareke', '🌄 Harfleri biliyor'], ['hece', '🌉 Harekeleri biliyor'], ['kelime', '📖 Okumaya başladı']];
    const optBox = h('div', { style: { display: 'grid', gap: '8px' } });
    const render = () => { optBox.innerHTML = ''; opts.forEach(([id, label]) => optBox.append(btn(label, (level === id ? 'purple' : 'white') + ' small wide', () => { level = id; render(); }))); };
    render();
    const close = K.UI.modal(h('div', null,
      h('h2', null, '👋 Hoş geldiniz!'),
      h('p', null, 'Bu kısa kurulum ebeveyn içindir. Çocuğunuzun adını yazarsanız Hüdhüd ona adıyla seslenir.'),
      nameIn,
      h('p', { style: { marginTop: '14px' } }, 'Çocuğunuz kursta hangi aşamada? (Sonra Ebeveyn Paneli\'nden değiştirebilirsiniz.)'),
      optBox,
      h('div', { class: 'row' }, btn('Başlayalım ✔️', 'green', () => {
        s.profile.name = nameIn.value.trim().slice(0, 24);
        if (level !== 'harf') K.C.jumpTo(level);
        s.onboarded = true; K.Store.save(true); close(); R.home();
        K.N.requestNotif();
      }))), { sticky: true });
  }

  // ------------------------------------------------------------ yolculuk haritası
  Screens.map = function () {
    const s = K.Store.s;
    const cur = K.C.currentLevel();
    const scroll = h('div', { class: 'scroll' });
    let curNode = null;
    K.C.ISLANDS.forEach((isl) => {
      const levels = K.C.LEVELS.filter((l) => l.island === isl.id);
      const pr = K.C.islandProgress(isl.id);
      const path = h('div', { class: 'path' });
      const card = h('div', { class: 'island', style: { '--isl': isl.color } },
        h('div', { class: 'island-head' }, h('div', { class: 'ii' }, isl.icon), h('div', null, h('div', { class: 'it' }, isl.name), h('div', { class: 'is' }, isl.desc)), h('div', { class: 'ip' }, `${pr.done}/${pr.total}`)),
        path);
      levels.forEach((lv, i) => {
        const st = s.levels[lv.id] || {};
        const unlocked = K.C.isUnlocked(lv);
        const isCur = lv === cur && unlocked;
        const x = 50 + Math.sin(i * 1.05) * 28;
        const isEmoji = /\p{Extended_Pictographic}/u.test(lv.glyph);
        const node = h('button', { class: 'node' + (st.done ? ' done' : '') + (!unlocked ? ' locked' : '') + (isCur ? ' current' : ''), style: { left: x + '%', '--nc': isl.node } },
          st.done ? h('div', { class: 'stars' }, '⭐'.repeat(st.stars || 1)) : null,
          !unlocked ? '🔒' : h('span', { class: isEmoji ? '' : 'nl', style: isEmoji ? null : { fontSize: [30, 30, 30, 26, 22, 19, 17, 15][Math.min(7, K.Games.stripMarks(lv.glyph).length)] + 'px' } }, lv.glyph),
          h('span', { class: 'nlbl' }, lv.title));
        node.addEventListener('click', () => {
          K.Sfx.tap();
          if (!unlocked) { S.say('Bu ders kilitli. Önce önceki dersleri bitirelim!'); node.classList.add('shake'); setTimeout(() => node.classList.remove('shake'), 500); return; }
          K.Games.start(lv.id);
        });
        const rowEl = h('div', { class: 'node-row' }, node);
        if (isCur) { const mm = K.Mascot.el('node-mascot'); mm.style.left = `calc(${x}% + 26px)`; rowEl.append(mm); curNode = rowEl; }
        path.append(rowEl);
      });
      scroll.append(card);
    });
    scroll.append(h('div', { class: 'finish-flag' }, s.diploma ? '🎓' : '🏁'));
    const el = h('div', { class: 'screen map' }, topbar('Elif-Ba Yolculuğu', { sub: 'Adım adım Kur\'an okumaya' }), scroll);
    return {
      el,
      onEnter() {
        K.Speech.setCoach(null);
        if (curNode) curNode.scrollIntoView({ block: 'center' });
        S.say(cur && !(s.levels[cur.id] && s.levels[cur.id].done) ? 'Haydi, parlayan derse dokun!' : 'Hangi dersi tekrar edelim?');
      },
    };
  };

  // ------------------------------------------------------------ oyun parkı
  Screens.playground = function () {
    const syl = K.Games.learnedSyllables();
    const g = (icon, label, color, cd, fn, disabled) => h('button', { class: 'tile', style: { '--c': color, '--cd': cd, opacity: disabled ? 0.45 : 1 }, onTap: () => { if (disabled) { S.say('Bu oyun hareke derslerinden sonra açılacak!'); return; } fn(); } },
      h('div', { class: 'ti' }, icon), h('div', { class: 'tl' }, label));
    const el = h('div', { class: 'screen', style: { background: 'linear-gradient(180deg,#FFE6C9 0%, var(--bg) 70%)' } }, topbar('Oyun Parkı', { sub: 'Öğrendiğin harflerle oyna' }),
      h('div', { class: 'scroll' }, h('div', { class: 'tiles' },
        g('🎈', 'Balon Patlat', 'var(--pink)', 'var(--pink-d)', () => K.Games.play('balloons')),
        g('🃏', 'Hafıza Kartları', 'var(--purple)', 'var(--purple-d)', () => K.Games.play('memory')),
        g('👂', 'Harf Avı', 'var(--teal)', 'var(--teal-d)', () => K.Games.play('pick')),
        g('✏️', 'Çizim Defteri', 'var(--orange)', 'var(--orange-d)', () => R.go(Screens.chart, { trace: true })),
        g('👕', 'Hareke Giydir', 'var(--blue)', 'var(--blue-d)', () => K.Games.play('hareke'), !syl),
        g('🔤', 'Hece Avı', 'var(--green)', 'var(--green-d)', () => K.Games.play('sylpick'), !syl),
        g('🧩', 'Namaz Sırası', '#C27C3E', '#9A5A22', () => R.go(Screens.namazOrder)),
        g('📋', 'Elif-Ba Tablosu', '#E05BA0', '#B83C7F', () => R.go(Screens.chart)))));
    return { el, onEnter() { K.Speech.setCoach(null); S.say('Hangi oyunu oynamak istersin?'); } };
  };

  // ------------------------------------------------------------ Elif-Ba tablosu
  Screens.chart = function (params = {}) {
    const grid = h('div', { class: 'choices', style: { gridTemplateColumns: 'repeat(4, 1fr)', direction: 'rtl', gap: '10px' } });
    K.L.LETTERS.forEach((L) => {
      const b = h('button', { class: 'choice', style: { minHeight: '92px', fontSize: '54px', flexDirection: 'column', lineHeight: 1.1 } }, L.ar, h('small', { style: { fontFamily: 'var(--ui-font)', fontSize: '14px', fontWeight: 800, color: 'var(--ink2)' } }, L.name));
      b.addEventListener('click', () => {
        K.Sfx.tap(); b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce');
        if (params.trace) K.Games.play('trace', L.id); else S.item(K.L.I.letter(L));
      });
      grid.append(b);
    });
    const el = h('div', { class: 'screen' }, topbar(params.trace ? 'Çizim Defteri' : 'Elif-Ba Tablosu', { sub: params.trace ? 'Çizmek istediğin harfi seç' : 'Harflere dokun, dinle' }), h('div', { class: 'scroll' }, grid));
    return { el, onEnter() { K.Speech.setCoach(null); S.say(params.trace ? 'Hangi harfi çizmek istersin?' : 'Harflere dokun ve dinle!'); } };
  };

  // ------------------------------------------------------------ çıkartmalar
  Screens.stickers = function () {
    const s = K.Store.s;
    const all = [...K.C.LEVELS.map((l) => l.sticker), ...Object.values(K.C.EXTRA_STICKERS)];
    const uniq = [...new Set(all)];
    const grid = h('div', { class: 'sticker-grid' }, uniq.map((st) => {
      const has = s.stickers.includes(st);
      const el = h('div', { class: 'sticker' + (has ? ' pop-in' : ' locked') }, st);
      if (has) el.addEventListener('click', () => { el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); K.Sfx.star(); });
      return el;
    }));
    const el = h('div', { class: 'screen', style: { background: 'linear-gradient(180deg,#FFE0EE 0%, var(--bg) 70%)' } },
      topbar('Çıkartmalarım', { sub: `${s.stickers.length} / ${uniq.length}` }), h('div', { class: 'scroll' }, grid));
    return { el, onEnter() { K.Speech.setCoach(null); S.say(s.stickers.length ? `${s.stickers.length} çıkartman var! Dersleri bitirdikçe yenilerini kazanırsın.` : 'Dersleri bitirdikçe burada çıkartmalar toplayacaksın!'); } };
  };

  // ------------------------------------------------------------ hocamızdan dinle
  Screens.hoca = function () {
    const s = K.Store.s;
    const tname = s.settings.teacherName || 'Hocamız';
    const list = h('div', { class: 'video-list' }, K.Q.videos('musa').map(K.UI.videoItem));
    const recs = K.N.recList().filter((k) => k.startsWith('A_'));
    const recBySurah = {};
    recs.forEach((k) => { const [, sn] = k.split('_'); recBySurah[sn] = (recBySurah[sn] || 0) + 1; });
    const recCards = Object.keys(recBySurah).map((sn) => {
      const su = K.Q.surah(sn);
      if (!su) return null;
      return h('button', { class: 'video-item', onTap: () => R.go(Screens.surah, { n: su.n, teacher: true }) },
        h('div', { class: 'vthumb', style: { background: 'linear-gradient(135deg,#8E7CFF,#4AA8FF)' } }),
        h('div', null, h('div', { class: 'vtitle' }, su.tr + ' sûresi'), h('div', { class: 'vsub' }, `${tname} sesiyle · ${recBySurah[sn]} âyet`)));
    }).filter(Boolean);
    const el = h('div', { class: 'screen', style: { background: 'linear-gradient(180deg,#D6ECFF 0%, var(--bg) 70%)' } }, topbar('Hocamızdan Dinle', { sub: 'Musa Coşkun Hoca' }),
      h('div', { class: 'scroll' },
        h('div', { class: 'note' }, 'Musa Coşkun Hoca, Diyanet İşleri Başkanlığı Mushafları İnceleme ve Kıraat Kurulu üyesidir. Videolar internetten oynatılır.'),
        h('div', { class: 'section-title' }, '🎬 Tilavetler'), list,
        h('div', { class: 'section-title' }, '🎙️ Uygulamaya kaydedilen okumalar'),
        recCards.length ? h('div', { class: 'video-list' }, recCards) : h('div', { class: 'note' }, `Ebeveyn Paneli → Ses Kayıt Stüdyosu'ndan ${tname}'nın sesiyle harfler, dualar ve sûre âyetleri kaydedilebilir. Kaydedilen sesler uygulamanın her yerinde öncelikli olarak çalınır.`)));
    return { el, onEnter() { K.Speech.setCoach(null); S.say('Musa Hoca\'nın okuduğu güzel tilavetleri burada dinleyebilirsin.'); } };
  };

  // ------------------------------------------------------------ belge
  Screens.diploma = function () {
    const s = K.Store.s;
    const d = new Date();
    const el = h('div', { class: 'screen', style: { background: 'radial-gradient(120% 80% at 50% 0%, #FFF1B8 0%, var(--bg) 70%)' } }, topbar('Belgem', { onBack: () => R.home() }),
      h('div', { class: 'scroll' }, h('div', { class: 'diploma pop-in' },
        h('div', { style: { fontSize: '64px' } }, '🎓'),
        h('div', { class: 'ar' }, 'مَا شَاءَ اللّٰهُ'),
        h('h2', null, 'Kur\'an Okuyucusu Belgesi'),
        h('div', { class: 'dname' }, s.profile.name || 'Sevgili öğrencimiz'),
        h('p', { style: { fontSize: '18px', fontWeight: 700 } }, 'Elif-Ba yolculuğunu tamamladı; harfleri, harekeleri, cezm, tenvin, şedde ve medleri öğrenerek 13 sûreyi okudu.'),
        h('p', { style: { fontSize: '16px', color: 'var(--ink2)' } }, d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })),
        h('div', { style: { fontSize: '40px' } }, '⭐ 🌙 ⭐')),
        h('div', { class: 'action-row' }, btn('🌳 Sûreler Bahçesi', 'green big', () => R.go(Screens.garden)))));
    return {
      el,
      onEnter() {
        K.Speech.setCoach(null);
        K.UI.confetti(200); K.Sfx.tada();
        S.say(`Maşallah${s.profile.name ? ' ' + s.profile.name : ''}! Artık Kur'an-ı Kerim okuyabiliyorsun! Bu belge senin. Her gün biraz Kur'an okumayı unutma!`);
      },
    };
  };

  // ------------------------------------------------------------ mola (günlük süre sınırı)
  Screens.rest = function () {
    const m = K.Mascot.el('sleep');
    const el = h('div', { class: 'screen rest' }, h('div', { class: 'zzz' }, 'Z z z'), m, h('h2', null, 'Bugünlük bu kadar!'), h('p', null, 'Hüdhüd uyumaya gitti. Yarın yine görüşürüz!'),
      btn('🔒 Ebeveyn', 'white small', async () => { if (await K.UI.parentGate()) { K.Store.s.unlockedAt = Date.now(); K.Store.save(true); R.home(); } }));
    return { el, onEnter() { K.Speech.setCoach(null); S.say('Bugün çok çalıştın, aferin! Şimdi biraz dinlenme zamanı. Yarın görüşürüz!'); } };
  };
})();
