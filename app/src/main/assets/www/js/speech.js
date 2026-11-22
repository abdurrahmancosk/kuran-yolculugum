/* Seslendirme motoru: Türkçe anlatım, harf/hece/kelime sesleri, hoca kayıtları, maskot konuşma balonu. */
window.K = window.K || {};
(function () {
  let gen = 0;          // ekran değişince eski konuşma dizilerini iptal etmek için
  let coach = null;     // etkin maskot + balon

  const S = {
    get gen() { return gen; },
    cancelAll() { gen++; K.N.stopAll(); if (coach) coach.talking(false); },
    alive(g) { return g === gen; },
    setCoach(c) { coach = c; },

    /** Türkçe anlatım (balonda da gösterilir). */
    async say(text, opts = {}) {
      if (typeof text === 'function') text = text();
      const g = gen;
      if (coach && opts.bubble !== false) coach.show(opts.show || text);
      if (coach) coach.talking(true);
      const rate = (K.Store.s.settings.rate || 0.95) * (opts.rate || 1);
      const r = await K.N.speak(text, 'tr', { rate });
      if (coach && g === gen) coach.talking(false);
      if (r === 'nospeech' && g === gen) await K.UI.sleep(Math.min(2500, 600 + text.length * 35));
      return g === gen ? r : 'stop';
    },

    /** Bir öğeyi seslendirir: kayıtlı hoca sesi → gerçek kâri sesi → Arapça/Türkçe TTS. */
    async item(it, opts = {}) {
      if (!it) return;
      const g = gen;
      const st = K.Store.s.settings;
      if (st.useRec && it.key && K.N.recHas(it.key)) {
        const r = await K.N.play('rec:' + it.key);
        if (r === 'end' || r === 'stop' || g !== gen) return r;
      }
      if (opts.spell && it.spell) return S.say(it.spell, { bubble: opts.bubble });
      if (it.audio) {
        if (coach) coach.talking(true);
        const r = await K.N.play(it.audio, { speed: st.speed || 1, onLoading: opts.onLoading });
        if (coach) coach.talking(false);
        if (r === 'end' || r === 'stop' || g !== gen) return r;
        if (opts.warn !== false) K.UI.toast('Ses için internet bağlantısı gerekiyor 🌐');
        return 'error';
      }
      if (it.kind === 'letter' || it.kind === 'form') return K.N.speak(it.say, 'tr', { rate: (st.rate || 0.95) * 0.9 });
      if (st.sylMode === 'ar' && it.sayAr && K.N.ttsLangOk('ar')) return K.N.speak(it.sayAr, 'ar', { rate: 0.7 });
      return K.N.speak(it.say, 'tr', { rate: (st.rate || 0.95) * 0.85 });
    },

    /** Bir âyeti seslendirir (hoca kaydı → seçili kâri). */
    async ayah(s, a, opts = {}) {
      const g = gen;
      const st = K.Store.s.settings;
      const key = K.Q.ayahKey(s, a);
      if ((opts.useRec ?? st.useRec) && K.N.recHas(key)) {
        const r = await K.N.play('rec:' + key);
        if (r === 'end' || r === 'stop' || g !== gen) return r;
      }
      return K.N.play(K.Q.ayahUrls(s, a, opts.reciter), { speed: st.speed || 1, onLoading: opts.onLoading, onStart: opts.onStart });
    },

    /** Sûre başındaki besmele (hoca kaydı → seçili kâri). */
    async basmala(s, opts = {}) {
      const st = K.Store.s.settings;
      const key = K.Q.ayahKey(1, 1);
      if ((opts.useRec ?? st.useRec) && K.N.recHas(key)) { const r = await K.N.play('rec:' + key); if (r === 'end' || r === 'stop') return r; }
      return K.N.play(K.Q.basmalaUrls(s, opts.reciter), { speed: st.speed || 1 });
    },

    praise() {
      const n = K.Store.s.profile.name;
      const list = ['Aferin!', 'Harikasın!', 'Maşallah!', 'Çok güzel!', 'Süpersin!', 'Bravo!', 'Tebrikler!', 'Çok iyi!'];
      const p = K.UI.pick(list);
      return S.say(p, { rate: 1.05, show: n && Math.random() < 0.4 ? p.replace('!', ' ' + n + '!') : p });
    },
    tryAgain() { return S.say(K.UI.pick(['Hımm, bir daha dinle.', 'Olsun, tekrar deneyelim.', 'Az kaldı! Bir daha dene.', 'Tekrar bakalım.']), { rate: 1.05 }); },
  };

  /** Maskot + konuşma balonu bileşeni. */
  function makeCoach(opts = {}) {
    const m = K.Mascot.el();
    const bubble = K.UI.h('div', { class: 'bubble' });
    const el = K.UI.h('div', { class: 'coach' + (opts.cls ? ' ' + opts.cls : '') }, m, bubble);
    m.addEventListener('click', () => { K.Mascot.react(m, 'happy', 1200); if (c.last) S.say(c.last); });
    const c = {
      el, mascot: m, bubble, last: '',
      show(t) { c.last = t; bubble.textContent = t; bubble.classList.remove('pop-in'); void bubble.offsetWidth; bubble.classList.add('pop-in'); },
      talking(on) { m.classList.toggle('talking', !!on); },
      happy() { K.Mascot.react(m, 'happy'); },
      sad() { K.Mascot.react(m, 'sad', 600); },
    };
    S.setCoach(c);
    return c;
  }

  K.Speech = S;
  K.makeCoach = makeCoach;
})();
