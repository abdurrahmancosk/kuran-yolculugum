/* Kalıcı durum: ilerleme, ayarlar, istatistikler. */
window.K = window.K || {};
(function () {
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const DEFAULT = () => ({
    v: 1,
    profile: { name: '', avatar: '🦁' },
    settings: {
      rate: 1,             // anlatım kaydı çalma hızı
      otre: 'ü',           // ince harflerde ötre: 'ü' | 'u'
      reciter: 'danis',      // Türk hafız İshak Danış
      speed: 1,            // tilavet hızı
      script: 'tr',        // yazım: 'tr' Türkiye mushafı usulü | 'std' standart
      qsize: 40,           // Kur'an yazı boyutu
      sfx: true, vibrate: true,
      dailyLimit: 0,       // dakika, 0 = sınırsız
      teacherName: 'Musa Hoca',
      useRec: true,        // kaydedilmiş hoca sesini öncelikle kullan
      showMeal: false, showLatin: false,
      unlockAll: false,
      namazGender: 'm',    // namaz çizimleri: 'm' erkek | 'f' kadın
    },
    levels: {},            // id -> {stars, done, step, plays}
    stickers: [],
    letterStats: {},       // harfId -> {ok, bad}
    surahs: {},            // no -> {listen, memo, read}
    namaz: {},             // bölüm -> true
    days: {},              // tarih -> saniye
    streak: { last: '', count: 0 },
    customVideos: [],      // {id, title, cat}
    hiddenVideos: [],
    diploma: false,
    unlockedAt: 0,
    missed: {},            // insan sesi kaydı olmayan cümleler → kaç kez geçti (ebeveyn kaydı için)
  });

  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    for (const k of Object.keys(saved)) {
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && typeof saved[k] === 'object' && !Array.isArray(saved[k])) merge(base[k], saved[k]);
      else base[k] = saved[k];
    }
    return base;
  }

  let s = DEFAULT();
  try { const raw = K.N.loadState(); if (raw) s = merge(DEFAULT(), JSON.parse(raw)); } catch (e) { console.warn('state', e); }

  // göç: Türk hafız varsayılanına geç (bir kez)
  if (!s.recMigrated2) { if (s.settings.reciter === 'husary_m') s.settings.reciter = 'danis'; s.recMigrated2 = true; }

  // göç (1.4.0): yapay ses kaldırıldı; anlatım kayıtları normal hızda çalar
  if (!s.hvMigrated) { s.settings.rate = 1; delete s.settings.sylMode; s.hvMigrated = true; }

  let saveTimer = null;
  const Store = {
    get s() { return s; },
    today,
    save(now) {
      clearTimeout(saveTimer);
      const fn = () => K.N.saveState(JSON.stringify(s));
      if (now) fn(); else saveTimer = setTimeout(fn, 400);
    },
    reset() { const keepSettings = s.settings; const keepVideos = s.customVideos; s = DEFAULT(); s.settings = keepSettings; s.customVideos = keepVideos; Store.save(true); },
    level(id) { return s.levels[id] || (s.levels[id] = { stars: 0, done: false, step: 0, plays: 0 }); },
    addLetterStat(id, ok) {
      if (!id) return;
      const st = s.letterStats[id] || (s.letterStats[id] = { ok: 0, bad: 0 });
      if (ok) st.ok++; else st.bad++;
      Store.save();
    },
    surah(n) { return s.surahs[n] || (s.surahs[n] = { listen: 0, memo: false, read: false }); },
    totalStars() { return Object.values(s.levels).reduce((a, l) => a + (l.stars || 0), 0) + Object.values(s.surahs).reduce((a, x) => a + (x.memo ? 3 : 0), 0); },
    addSticker(id) { if (!s.stickers.includes(id)) { s.stickers.push(id); Store.save(); return true; } return false; },
    tick(sec) {
      const d = today();
      s.days[d] = (s.days[d] || 0) + sec;
      if (s.streak.last !== d) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
        s.streak.count = s.streak.last === yd ? s.streak.count + 1 : 1;
        s.streak.last = d;
      }
      Store.save();
    },
    todaySecs() { return s.days[today()] || 0; },
    limitReached() {
      const lim = +s.settings.dailyLimit || 0;
      if (!lim) return false;
      if (s.unlockedAt && Date.now() - s.unlockedAt < 30 * 60 * 1000) return false;
      return Store.todaySecs() >= lim * 60;
    },
  };
  K.Store = Store;
  // Kaydı olmayan cümleleri say (Ebeveyn Paneli → Ses Kayıt Stüdyosu → Anlatım)
  K.onMiss = (text) => {
    const m = s.missed || (s.missed = {});
    if (!(text in m) && Object.keys(m).length >= 400) return;
    m[text] = (m[text] || 0) + 1; Store.save();
  };
})();
