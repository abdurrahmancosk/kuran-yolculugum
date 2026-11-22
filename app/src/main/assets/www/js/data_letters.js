/* Elif-Ba verisi: harfler, harekeler ve öğe (kart) üreticileri.
   Okunuşlar Türkiye'deki Kur'an kursu usulüne göredir (Be üstün "be", Be esre "bi", Be ötre "bü"). */
window.K = window.K || {};
(function () {
  const M = {
    FATHA: 'َ', KASRA: 'ِ', DAMMA: 'ُ', SUKUN: 'ْ', SHADDA: 'ّ',
    FATHATAN: 'ً', KASRATAN: 'ٍ', DAMMATAN: 'ٌ', DAGGER: 'ٰ', TATWEEL: 'ـ',
  };
  // v: 'thin' (e/i/ü) | 'thick' (a/ı/u — kalın harfler) | 'open' (a/i/u)
  const LETTERS = [
    { id: 'elif', ar: 'ا', name: 'Elif', c: '', v: 'thin', join: false, tip: 'Elif dümdüz, dik bir çizgidir. Tıpkı bir kalem gibi!' },
    { id: 'be', ar: 'ب', name: 'Be', c: 'b', v: 'thin', join: true, tip: 'Be bir kayığa benzer. Altında bir nokta var.' },
    { id: 'te', ar: 'ت', name: 'Te', c: 't', v: 'thin', join: true, tip: 'Te de bir kayık gibi, ama üstünde iki nokta var.' },
    { id: 'se', ar: 'ث', name: 'Se', c: 's', v: 'thin', join: true, tip: 'Se\'nin üstünde üç nokta var. Dilimizin ucu dişlerimizin arasında söyleriz.' },
    { id: 'cim', ar: 'ج', name: 'Cim', c: 'c', v: 'thin', join: true, tip: 'Cim açık bir ağza benzer. Karnında bir nokta var.' },
    { id: 'ha', ar: 'ح', name: 'Ha', c: 'h', v: 'open', join: true, tip: 'Ha, Cim\'e benzer ama hiç noktası yok. Boğazımızın ortasından söyleriz.' },
    { id: 'hi', ar: 'خ', name: 'Hı', c: 'h', v: 'thick', join: true, tip: 'Hı\'nın başının üstünde bir nokta var. Kalın okunur.' },
    { id: 'dal', ar: 'د', name: 'Dal', c: 'd', v: 'thin', join: false, tip: 'Dal küçük bir köşeye benzer. Noktası yok.' },
    { id: 'zel', ar: 'ذ', name: 'Zel', c: 'z', v: 'thin', join: false, tip: 'Zel, Dal\'a benzer ama üstünde bir nokta var.' },
    { id: 'ra', ar: 'ر', name: 'Ra', c: 'r', v: 'open', join: false, tip: 'Ra küçük bir kaydırak gibidir. Noktası yok.' },
    { id: 'ze', ar: 'ز', name: 'Ze', c: 'z', v: 'thin', join: false, tip: 'Ze, Ra\'ya benzer ama üstünde bir nokta var.' },
    { id: 'sin', ar: 'س', name: 'Sin', c: 's', v: 'thin', join: true, tip: 'Sin\'in üç küçük dişi var. Noktası yok.' },
    { id: 'shin', ar: 'ش', name: 'Şın', c: 'ş', v: 'thin', join: true, tip: 'Şın da üç dişlidir, üstünde de üç nokta var.' },
    { id: 'sad', ar: 'ص', name: 'Sad', c: 's', v: 'thick', join: true, tip: 'Sad\'ın yumurta gibi yuvarlak bir başı var. Kalın okunur.' },
    { id: 'dad', ar: 'ض', name: 'Dad', c: 'd', v: 'thick', join: true, tip: 'Dad, Sad\'a benzer ama üstünde bir nokta var. Kalın okunur.' },
    { id: 'ti', ar: 'ط', name: 'Tı', c: 't', v: 'thick', join: true, tip: 'Tı\'nın dimdik bir bayrak direği var. Kalın okunur.' },
    { id: 'zi', ar: 'ظ', name: 'Zı', c: 'z', v: 'thick', join: true, tip: 'Zı, Tı\'ya benzer ama bir noktası var. Kalın okunur.' },
    { id: 'ayn', ar: 'ع', name: 'Ayn', c: '', v: 'open', join: true, tip: 'Ayn küçük bir kulağa benzer. Boğazımızdan söyleriz.' },
    { id: 'gayn', ar: 'غ', name: 'Gayn', c: 'ğ', say: 'g', v: 'thick', join: true, tip: 'Gayn, Ayn\'a benzer ama üstünde bir nokta var. Kalın okunur.' },
    { id: 'fe', ar: 'ف', name: 'Fe', c: 'f', v: 'thin', join: true, tip: 'Fe\'nin küçük yuvarlak bir başı ve üstünde bir noktası var.' },
    { id: 'kaf', ar: 'ق', name: 'Kaf', c: 'k', v: 'thick', join: true, tip: 'Kaf\'ın üstünde iki nokta var, kuyruğu aşağı iner. Kalın okunur.' },
    { id: 'kef', ar: 'ك', name: 'Kef', c: 'k', v: 'thin', join: true, tip: 'Kef\'in içinde küçük bir işaret var. İnce okunur.' },
    { id: 'lam', ar: 'ل', name: 'Lam', c: 'l', v: 'thin', join: true, tip: 'Lam uzun bir kancaya benzer.' },
    { id: 'mim', ar: 'م', name: 'Mim', c: 'm', v: 'thin', join: true, tip: 'Mim küçük bir top ve bir kuyruktan oluşur.' },
    { id: 'nun', ar: 'ن', name: 'Nun', c: 'n', v: 'thin', join: true, tip: 'Nun bir kâseye benzer, içinde bir nokta var.' },
    { id: 'vav', ar: 'و', name: 'Vav', c: 'v', v: 'thin', join: false, tip: 'Vav\'ın küçük yuvarlak bir başı ve kıvrık bir kuyruğu var.' },
    { id: 'he', ar: 'ه', name: 'He', c: 'h', v: 'thin', join: true, tip: 'He yuvarlak bir halkaya benzer.' },
    { id: 'lamelif', ar: 'لا', name: 'Lamelif', c: '', v: 'thin', join: false, noHareke: true, tip: 'Lamelif, Lam ile Elif\'in el ele tutuşmuş hâlidir. "Lâ" diye okunur.' },
    { id: 'ye', ar: 'ي', name: 'Ye', c: 'y', v: 'thin', join: true, tip: 'Ye kıvrık bir kuyruğa benzer, altında iki nokta var.' },
  ];
  const BY = {}; LETTERS.forEach((l, i) => { l.idx = i; BY[l.id] = l; });
  const BY_AR = {}; LETTERS.forEach((l) => { if (l.ar.length === 1) BY_AR[l.ar] = l; });

  const HNAME = { u: 'üstün', e: 'esre', o: 'ötre' };
  const HMARK = { u: M.FATHA, e: M.KASRA, o: M.DAMMA };
  const TMARK = { u: M.FATHATAN, e: M.KASRATAN, o: M.DAMMATAN };

  function vowel(L, h) {
    const otre = (K.Store && K.Store.s.settings.otre) || 'ü';
    if (L.v === 'thick') return { u: 'a', e: 'ı', o: 'u' }[h];
    if (L.v === 'open') return { u: 'a', e: 'i', o: 'u' }[h];
    return { u: 'e', e: 'i', o: otre }[h];
  }
  const sayC = (L) => (L.say != null ? L.say : L.c);
  const base = (L) => (L.id === 'elif' ? 'ا' : L.ar);

  const I = {
    letter(L) {
      if (typeof L === 'string') L = BY[L];
      return { kind: 'letter', key: 'L_' + L.id, ar: L.ar, label: L.name, say: L.name, lid: L.id, tip: L.tip };
    },
    syl(L, h) {
      if (typeof L === 'string') L = BY[L];
      const v = vowel(L, h);
      const tr = L.c + v;
      return { kind: 'syl', key: `S_${L.id}_${h}`, ar: base(L) + HMARK[h], label: tr, say: sayC(L) + v, sayAr: base(L) + HMARK[h],
        lid: L.id, h, spell: `${L.name} ${HNAME[h]}, ${sayC(L) + v}` };
    },
    tenvin(L, h) {
      if (typeof L === 'string') L = BY[L];
      const v = vowel(L, h);
      const tr = L.c + v + 'n';
      const ar = base(L) + TMARK[h] + (h === 'u' && L.id !== 'elif' ? 'ا' : '');
      return { kind: 'syl', key: `T_${L.id}_${h}`, ar, label: tr, say: sayC(L) + v + 'n', sayAr: ar, lid: L.id, h,
        spell: `${L.name} iki ${HNAME[h]}, ${sayC(L) + v}n` };
    },
    cezm(L, h) {
      if (typeof L === 'string') L = BY[L];
      const v = vowel(L, h);
      const ar = 'ا' + HMARK[h] + L.ar + M.SUKUN;
      return { kind: 'syl', key: `C_${L.id}_${h}`, ar, label: v + L.c, say: v + sayC(L), sayAr: ar, lid: L.id, h,
        spell: `Elif ${HNAME[h]} ${L.name} cezm, ${v + sayC(L)}` };
    },
    shadda(L) {
      if (typeof L === 'string') L = BY[L];
      const v = vowel(L, 'u');
      const ar = 'ا' + M.FATHA + L.ar + M.SHADDA + M.FATHA;
      return { kind: 'syl', key: `D_${L.id}`, ar, label: v + L.c + '-' + L.c + v, say: v + sayC(L) + sayC(L) + v, sayAr: ar, lid: L.id,
        spell: `${L.name} şeddeli, ${v + sayC(L) + sayC(L) + v}` };
    },
    med(L, h) {
      if (typeof L === 'string') L = BY[L];
      const long = { u: 'â', e: 'î', o: 'û' }[h];
      const longSay = { u: 'aa', e: 'ii', o: 'uu' }[h];
      const ar = base(L) + HMARK[h] + { u: 'ا', e: 'ي', o: 'و' }[h];
      return { kind: 'syl', key: `M_${L.id}_${h}`, ar, label: L.c + long, say: sayC(L) + longSay, sayAr: ar, lid: L.id, h,
        spell: `${L.name} ${HNAME[h]} uzatılır, ${sayC(L) + longSay}` };
    },
    /** Elle yazılmış kelime. sylls=true ise harekeli harflere bölünür (her harf bir hece). */
    word(ar, tr, opts = {}) {
      const say = opts.say || tr.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u').replace(/[-'’]/g, '');
      const it = { kind: 'word', key: 'W_' + simpleKey(ar), ar, label: tr, say, sayAr: ar };
      if (opts.sylls) it.sylls = splitSyllables(ar);
      return it;
    },
    /** Görsel biçim (başta/ortada/sonda). */
    form(L, pos) {
      if (typeof L === 'string') L = BY[L];
      const T = M.TATWEEL;
      const ar = pos === 'ini' ? L.ar + T : pos === 'mid' ? T + L.ar + T : pos === 'fin' ? T + L.ar : L.ar;
      return { kind: 'form', key: 'L_' + L.id, ar, label: L.name, say: L.name, lid: L.id, pos };
    },
  };

  function simpleKey(ar) {
    let h = 0; for (let i = 0; i < ar.length; i++) h = (h * 31 + ar.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function splitSyllables(ar) {
    const out = [];
    const chars = [...ar];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const L = BY_AR[ch] || (ch === 'ا' ? BY.elif : null);
      if (!L) continue;
      const mark = chars[i + 1];
      const h = mark === M.FATHA ? 'u' : mark === M.KASRA ? 'e' : mark === M.DAMMA ? 'o' : null;
      if (h) out.push(I.syl(L, h));
    }
    return out;
  }
  function forms(L) {
    if (typeof L === 'string') L = BY[L];
    if (L.join) return ['iso', 'ini', 'mid', 'fin'].map((p) => I.form(L, p));
    return ['iso', 'fin'].map((p) => I.form(L, p));
  }
  const POSNAME = { iso: 'yalnız', ini: 'başta', mid: 'ortada', fin: 'sonda' };

  K.M = M;
  K.L = { LETTERS, BY, BY_AR, HNAME, HMARK, POSNAME, vowel, I, forms, splitSyllables,
    hareke: LETTERS.filter((l) => !l.noHareke) };
})();
