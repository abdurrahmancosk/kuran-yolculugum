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

    /** Türkçe anlatım: balonda gösterilir; sesi yalnız insan kaydıdır (ebeveyn kaydı → gömülü kayıt).
        Kaydı olmayan cümlede opts.item verilmişse o öğenin (harf/hece/kelime) insan sesi çalınır, yoksa sessiz geçilir. */
    async say(text, opts = {}) {
      if (typeof text === 'function') text = text();
      const g = gen;
      if (coach && opts.bubble !== false) coach.show(opts.show || text);
      if (coach) coach.talking(true);
      const rate = (K.Store.s.settings.rate || 1) * (opts.rate || 1);
      let r = await K.N.speak(text, 'tr', { rate, hv: opts.hv });
      if (coach && g === gen) coach.talking(false);
      if (r === 'nospeech' && g === gen) {
        if (opts.item) { r = await S.item(opts.item, { warn: false }); }
        else await K.UI.sleep(Math.min(1600, 450 + text.length * 18));
      }
      return g === gen ? r : 'stop';
    },

    /** Bir öğenin insan sesi: ebeveyn/hoca kaydı → Diyanet CD kaydı → Kur'an kelime kaydı. */
    async item(it, opts = {}) {
      if (!it) return;
      const g = gen;
      const st = K.Store.s.settings;
      if (st.useRec && it.key && K.N.recHas(it.key)) {
        const r = await K.N.play('rec:' + it.key);
        if (r === 'end' || r === 'stop' || g !== gen) return r;
      }
      const hv = it.hv || it.key;
      if (K.N.hvHas(hv)) {
        if (coach) coach.talking(true);
        const r = await K.N.play([K.N.hvUrl(hv)], { speed: st.speed || 1 });
        if (coach) coach.talking(false);
        return r;
      }
      if (it.audio) {
        if (coach) coach.talking(true);
        const r = await K.N.play(it.audio, { speed: st.speed || 1, onLoading: opts.onLoading });
        if (coach) coach.talking(false);
        if (r === 'end' || r === 'stop' || g !== gen) return r;
        if (opts.warn !== false) K.UI.toast('Ses için internet bağlantısı gerekiyor 🌐');
        return 'error';
      }
      return 'nosound';
    },
    /** Öğenin insan sesi var mı? */
    hasSound(it) { return !!it && (K.N.hvHas(it.hv || it.key) || !!it.audio || (K.Store.s.settings.useRec && it.key && K.N.recHas(it.key))); },

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

    /** Tebrik: çizgi filmden insan sesi tebrik kayıtları (K.HV_PRAISE); yoksa yalnız balon. */
    praise() {
      const n = K.Store.s.profile.name;
      const list = (K.HV_PRAISE || []).filter((k) => K.N.hvHas(k));
      if (list.length && Math.random() < 0.6) {
        const k = K.UI.pick(list);
        return S.say(K.HV_TEXT[k], { hv: k });
      }
      const p = K.UI.pick(['Aferin!', 'Harikasın!', 'Maşallah!', 'Çok güzel!', 'Süpersin!', 'Bravo!', 'Tebrikler!']);
      return S.say(p, { show: n && Math.random() < 0.4 ? p.replace('!', ' ' + n + '!') : p });
    },
    tryAgain(it) {
      const list = (K.HV_AGAIN || []).filter((k) => K.N.hvHas(k));
      if (list.length) { const k = K.UI.pick(list); return S.say(K.HV_TEXT[k], { hv: k }); }
      return S.say(K.UI.pick(['Bir daha dinle.', 'Olsun, tekrar deneyelim.', 'Az kaldı! Bir daha dene.']), { item: it });
    },
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
