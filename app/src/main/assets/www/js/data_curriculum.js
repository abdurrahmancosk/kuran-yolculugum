/* Elif-Ba müfredatı: adalar (bölümler), dersler ve adımlar.
   Sıralama Diyanet Kur'an kursu Elif-Ba düzenini izler:
   harfler → harf şekilleri → üstün/esre/ötre → heceler → cezm → tenvin → şedde → med → Kur'an kelimeleri → sûreler. */
window.K = window.K || {};
(function () {
  const { I, BY, BY_AR, LETTERS } = K.L;
  const M = K.M;

  const ISLANDS = [
    { id: 'harf', name: 'Harfler Adası', icon: '🏝️', color: '#F7E3B5', node: '#2BB3A3', desc: 'Elif-Ba harfleriyle tanışalım' },
    { id: 'sekil', name: 'Şekil Ormanı', icon: '🌳', color: '#CDEFC4', node: '#3DAE5C', desc: 'Harflerin başta, ortada, sonda hâlleri' },
    { id: 'hareke', name: 'Hareke Vadisi', icon: '🌄', color: '#FFE0C2', node: '#FF9F43', desc: 'Üstün, esre ve ötre' },
    { id: 'hece', name: 'Hece Köprüsü', icon: '🌉', color: '#E3DDFF', node: '#8E7CFF', desc: 'Harfleri birleştirip okuyalım' },
    { id: 'cezm', name: 'Cezm Kalesi', icon: '🏰', color: '#FFD9E4', node: '#FF6B9A', desc: 'Harfi durduran işaret' },
    { id: 'tenvin', name: 'Tenvin Şelalesi', icon: '💦', color: '#D3EEFF', node: '#4AA8FF', desc: 'İki üstün, iki esre, iki ötre' },
    { id: 'sedde', name: 'Şedde Tepesi', icon: '⛰️', color: '#F1E4D3', node: '#C27C3E', desc: 'Harfi iki kere okutan işaret' },
    { id: 'med', name: 'Uzatma Bahçesi', icon: '🌷', color: '#FFE6F2', node: '#E05BA0', desc: 'Med harfleri ve çeker' },
    { id: 'kelime', name: 'Kur\'an Kelimeleri', icon: '📖', color: '#DFF5EE', node: '#1D8A7D', desc: 'Sûrelerden gerçek kelimeler' },
    { id: 'sure', name: 'Sûre Okuma Yolu', icon: '🌟', color: '#FFF1B8', node: '#E0AE10', desc: 'Artık Kur\'an okuyorum!' },
  ];

  const CONCEPTS = {
    forms: { title: 'Harfler el ele tutuşur', demo: () => K.L.forms('be'),
      lines: ['Harfler kelimede yan yana gelince el ele tutuşur.', 'Bu yüzden başta, ortada ve sonda biraz farklı görünürler.', 'Bak! Be harfi yalnızken, başta, ortada ve sonda böyle yazılır.'] },
    bitisme: { title: 'Utangaç harfler', demo: () => ['elif', 'dal', 'zel', 'ra', 'ze', 'vav'].map((id) => I.letter(id)),
      lines: ['Bu altı harf biraz utangaçtır: Elif, Dal, Zel, Ra, Ze ve Vav.', 'Önlerindeki harfle el ele tutuşurlar, ama arkalarındaki harfe ellerini vermezler.', 'Bu yüzden sadece iki şekilleri vardır.'] },
    u: { title: 'Üstün', demo: () => [I.letter('be'), I.syl('be', 'u')], harekeAnim: 'u',
      lines: ['Harfin üstüne konan bu küçük eğik çizgiye üstün denir.', 'Üstün, harfi e ya da a sesiyle okutur.', 'Dinle: Be üstün, be!'] },
    e: { title: 'Esre', demo: () => [I.letter('be'), I.syl('be', 'e')], harekeAnim: 'e',
      lines: ['Harfin altına konan bu küçük eğik çizgiye esre denir.', 'Esre, harfi i ya da ı sesiyle okutur.', 'Dinle: Be esre, bi!'] },
    o: { title: 'Ötre', demo: () => [I.letter('be'), I.syl('be', 'o')], harekeAnim: 'o',
      lines: ['Harfin üstüne konan bu küçük vav şekline ötre denir.', 'Ötre, harfi ü ya da u sesiyle okutur.', () => 'Dinle: Be ötre, ' + I.syl('be', 'o').say + '!'] },
    mix: { title: 'Hareke karışık', demo: () => [I.syl('be', 'u'), I.syl('be', 'e'), I.syl('be', 'o')],
      lines: ['Şimdi üç harekeyi birlikte kullanacağız!', 'Üstün yukarıda, esre aşağıda, ötre yine yukarıda ama küçük bir vav gibi.', 'Dikkatle dinle ve doğru harekeyi seç!'] },
    hece: { title: 'Heceleri birleştir', demo: () => [K.C.autoWord('كَتَبَ')],
      lines: ['Harekeli harfleri yan yana okuyunca kelimeler ortaya çıkar.', 'Sağdan sola doğru okuruz.', 'Dinle: ke, te, be... ketebe!'] },
    cezm: { title: 'Cezm', demo: () => [I.cezm('be', 'u')],
      lines: ['Harfin üstündeki bu küçük yuvarlağa cezm denir.', 'Cezmli harf durur ve kendinden önceki harfe bağlanarak okunur.', 'Dinle: Elif üstün, Be cezm... eb!'] },
    tenvin: { title: 'Tenvin', demo: () => [I.tenvin('be', 'u'), I.tenvin('be', 'e'), I.tenvin('be', 'o')],
      lines: ['İki üstün, iki esre ve iki ötreye tenvin denir.', 'Tenvin, okuduğumuz sesin sonuna bir n sesi ekler.', () => 'Dinle: ben, bin, ' + I.tenvin('be', 'o').say + '!'] },
    sedde: { title: 'Şedde', demo: () => [I.shadda('be')],
      lines: ['Harfin üstündeki bu küçük işarete şedde denir. Küçük dişlere benzer.', 'Şeddeli harf iki kere okunur.', 'Dinle: eb... be! Ebbe!'] },
    med: { title: 'Med harfleri', demo: () => [I.med('be', 'u'), I.med('be', 'e'), I.med('be', 'o')],
      lines: ['Elif, Vav ve Ye bazen sesi uzatır. Bunlara med harfleri denir.', 'Üstünden sonra elif gelirse a sesini uzatırız: bâ!', 'Esreden sonra ye gelirse bî, ötreden sonra vav gelirse bû diye uzatırız.'] },
    ceker: { title: 'Çeker', demo: () => [I.word('هٰذَا', 'hâzâ')],
      lines: ['Harfin üstündeki bu küçük dik çizgiye çeker denir.', 'Çeker de sesi bir elif kadar uzatır.', 'Dinle: hâzâ!'] },
    elif_lam: { title: 'Elif-Lâm ve Allah lafzı', demo: () => [wordFrom(1, 2, 1), wordFrom(1, 2, 2)],
      lines: ['Kelimenin başındaki Elif ile Lâm\'a elif-lâm denir.', 'Elif-lâm ile başlayan kelimeleri el diye okumaya başlarız: el-hamdü!', 'Bu kelimeleri gerçek Kur\'an okuyucusundan dinleyeceğiz.'] },
  };

  // ------------------------------------------------------------ yardımcılar
  function otreFix(s) { return (K.Store && K.Store.s.settings.otre === 'u') ? s.replace(/ü/g, 'u').replace(/Ü/g, 'U') : s; }
  function W(ar, tr) { return I.word(ar, otreFix(tr)); }
  /** Harekeli harflerden kendiliğinden okunuş üretir (kalın harf komşuluğunda üstün 'a' okunur). */
  function autoWord(ar) {
    const syl = K.L.splitSyllables(ar);
    const parts = syl.map((s, i) => {
      let lab = s.label;
      const L = BY[s.lid];
      if (s.h === 'u' && L.v === 'thin') {
        const prev = syl[i - 1] && BY[syl[i - 1].lid], next = syl[i + 1] && BY[syl[i + 1].lid];
        if ((prev && prev.v === 'thick') || (next && next.v === 'thick')) lab = lab.replace(/e$/, 'a');
      }
      return lab;
    });
    const tr = parts.join('');
    const it = I.word(ar, tr);
    it.sylls = syl;
    return it;
  }
  function wordFrom(s, a, i) {
    const su = K.Q.surah(s);
    const v = su.v.find((x) => x.a === a);
    return K.Q.wordItem(s, a, v.w.find((w) => w.i === i));
  }
  function surahWords(s, ayahs) {
    const su = K.Q.surah(s);
    const seen = new Set(), out = [];
    su.v.filter((v) => !ayahs || ayahs.includes(v.a)).forEach((v) => v.w.forEach((w) => {
      if (seen.has(w.s)) return; seen.add(w.s); out.push(K.Q.wordItem(s, v.a, w));
    }));
    return out;
  }
  function ayahLines(s, ayahs) {
    const su = K.Q.surah(s);
    return su.v.filter((v) => ayahs.includes(v.a)).map((v) => v.w.map((w) => K.Q.wordItem(s, v.a, w)));
  }
  const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

  // ------------------------------------------------------------ dersler
  const LEVELS = [];
  const add = (lv) => { lv.n = LEVELS.length; LEVELS.push(lv); };

  // 1) Harfler Adası
  const HG = [['elif', 'be', 'te', 'se'], ['cim', 'ha', 'hi'], ['dal', 'zel', 'ra', 'ze'], ['sin', 'shin', 'sad', 'dad'],
    ['ti', 'zi', 'ayn', 'gayn'], ['fe', 'kaf', 'kef', 'lam'], ['mim', 'nun', 'vav', 'he'], ['lamelif', 'ye']];
  HG.forEach((g, gi) => {
    const prev = HG.slice(0, gi).flat();
    add({ id: 'harf' + (gi + 1), island: 'harf', title: g.map((id) => BY[id].name).join(', '), glyph: BY[g[0]].ar,
      items: () => g.map((id) => I.letter(id)),
      review: () => prev.map((id) => I.letter(id)),
      steps: [
        { t: 'intro' }, { t: 'trace' },
        { t: 'pick', rounds: 6, k: gi < 2 ? 3 : 4 },
        { t: 'balloons', targets: 5 },
        { t: 'memory', pairs: Math.min(g.length, gi < 1 ? 3 : 4) },
      ] });
  });
  add({ id: 'harf9', island: 'harf', title: 'Harf Şenliği', glyph: '🎉', items: () => LETTERS.map((l) => I.letter(l)), review: () => [],
    steps: [{ t: 'pick', rounds: 10, k: 4 }, { t: 'balloons', targets: 6 }, { t: 'memory', pairs: 4 }, { t: 'trace', count: 3 }] });

  // 2) Şekil Ormanı
  const SG = [['be', 'te', 'se', 'nun', 'ye'], ['cim', 'ha', 'hi', 'ayn', 'gayn'], ['sin', 'shin', 'sad', 'dad', 'ti', 'zi'], ['fe', 'kaf', 'kef', 'lam', 'mim', 'he'], ['elif', 'dal', 'zel', 'ra', 'ze', 'vav']];
  const SGT = ['Dişli harfler', 'Cim ailesi', 'Sin ve Sad ailesi', 'Fe, Kaf, Lam, Mim, He', 'Utangaç harfler'];
  SG.forEach((g, gi) => {
    add({ id: 'sekil' + (gi + 1), island: 'sekil', title: SGT[gi], glyph: g[0] === 'elif' ? 'ـا' : BY[g[0]].ar + M.TATWEEL,
      items: () => g.map((id) => I.letter(id)), review: () => [],
      steps: [
        ...(gi === 0 ? [{ t: 'concept', c: 'forms' }] : gi === 4 ? [{ t: 'concept', c: 'bitisme' }] : []),
        { t: 'intro', mode: 'forms' },
        { t: 'formpick', rounds: 6, k: 3 },
        { t: 'memory', pairs: 4, mode: 'form' },
      ] });
  });

  // 3) Hareke Vadisi
  const HK = [['elif', 'be', 'te', 'se', 'cim', 'ha', 'hi', 'dal', 'zel'], ['ra', 'ze', 'sin', 'shin', 'sad', 'dad', 'ti', 'zi', 'ayn'], ['gayn', 'fe', 'kaf', 'kef', 'lam', 'mim', 'nun', 'vav', 'he', 'ye']];
  const HN = { u: 'Üstün', e: 'Esre', o: 'Ötre' };
  ['u', 'e', 'o'].forEach((h, hi) => {
    HK.forEach((g, gi) => {
      const known = ['u', 'e', 'o'].slice(0, hi + 1);
      add({ id: `hareke_${h}${gi + 1}`, island: 'hareke', title: `${HN[h]} ${gi + 1}`, glyph: I.syl(g[1] || g[0], h).ar,
        items: () => g.map((id) => I.syl(id, h)),
        review: () => known.flatMap((kh) => HK.flat().map((id) => I.syl(id, kh))),
        steps: [
          ...(gi === 0 ? [{ t: 'concept', c: h }] : []),
          { t: 'read', lines: () => chunk(g.map((id) => I.syl(id, h)), 3), chant: true },
          { t: 'pick', rounds: 6, k: 3 },
          ...(hi > 0 ? [{ t: 'hareke', rounds: 5, harekes: known }] : []),
          { t: 'balloons', targets: 5 },
        ] });
    });
  });
  add({ id: 'hareke_mix', island: 'hareke', title: 'Hareke Şenliği', glyph: 'بَبِبُ',
    items: () => HK.flat().flatMap((id) => ['u', 'e', 'o'].map((h) => I.syl(id, h))), review: () => [],
    steps: [{ t: 'concept', c: 'mix' }, { t: 'hareke', rounds: 8, harekes: ['u', 'e', 'o'] }, { t: 'pick', rounds: 8, k: 3, minimal: true }, { t: 'memory', pairs: 4 }] });

  // 4) Hece Köprüsü
  const D1 = ['بَتَ', 'تَبَ', 'بَدَ', 'دَبَ', 'كَتَ', 'تَكَ', 'لَمَ', 'مَلَ', 'نَزَ', 'سَبَ', 'جَعَ', 'فَتَ'];
  const D2 = ['كَتَبَ', 'خَلَقَ', 'ذَهَبَ', 'جَعَلَ', 'نَصَرَ', 'فَتَحَ', 'رَزَقَ', 'صَدَقَ', 'دَخَلَ', 'خَرَجَ', 'نَظَرَ', 'سَجَدَ'];
  const D3 = ['عَلِمَ', 'سَمِعَ', 'حَسِبَ', 'شَرِبَ', 'كُتِبَ', 'خُلِقَ', 'فُتِحَ', 'جُعِلَ', 'نُصِرَ', 'رُزِقَ', 'ذُكِرَ', 'حَمَلَ'];
  [[D1, 'İki heceli okuma', true], [D2, 'Üstünlü kelimeler', false], [D3, 'Karışık harekeli kelimeler', false]].forEach(([list, title, first], i) => {
    add({ id: 'hece' + (i + 1), island: 'hece', title, glyph: list[0],
      items: () => list.map(autoWord), review: () => [],
      steps: [
        ...(first ? [{ t: 'concept', c: 'hece' }] : []),
        { t: 'intro', mode: 'word', max: 6 },
        { t: 'read', lines: () => chunk(list.map(autoWord), 3), chant: true },
        { t: 'pick', rounds: 6, k: 3 },
        { t: 'memory', pairs: 3 },
      ] });
  });

  // 5) Cezm Kalesi
  const CZ = ['be', 'te', 'dal', 'ra', 'sin', 'kaf', 'lam', 'mim', 'nun'];
  add({ id: 'cezm1', island: 'cezm', title: 'Cezm ile tanış', glyph: 'اَبْ',
    items: () => CZ.map((id) => I.cezm(id, 'u')), review: () => CZ.flatMap((id) => ['u', 'e', 'o'].map((h) => I.cezm(id, h))),
    steps: [{ t: 'concept', c: 'cezm' }, { t: 'read', lines: () => CZ.slice(0, 6).map((id) => ['u', 'e', 'o'].map((h) => I.cezm(id, h))), chant: true }, { t: 'pick', rounds: 6, k: 3 }, { t: 'balloons', targets: 5 }] });
  const CW = () => [W('قُلْ', 'kul'), W('لَمْ', 'lem'), W('مِنْ', 'min'), W('عَنْ', 'an'), W('هَلْ', 'hel'), W('بَلْ', 'bel'), W('قَدْ', 'kad'), W('لَنْ', 'len'),
    W('كَمْ', 'kem'), W('هُمْ', 'hüm'), W('يَلِدْ', 'yelid'), W('اَنْعَمْتَ', 'en\'amte'), W('نَعْبُدُ', 'na\'büdü'), W('اَلْحَمْدُ', 'elhamdü')];
  add({ id: 'cezm2', island: 'cezm', title: 'Cezmli kelimeler', glyph: 'قُلْ', items: CW, review: () => [],
    steps: [{ t: 'intro', mode: 'word', max: 6 }, { t: 'read', lines: () => chunk(CW(), 3) }, { t: 'pick', rounds: 6, k: 3 }, { t: 'memory', pairs: 3 }] });

  // 6) Tenvin Şelalesi
  const TV = ['be', 'te', 'dal', 'ra', 'kaf', 'lam', 'mim', 'nun', 'he'];
  add({ id: 'tenvin1', island: 'tenvin', title: 'Tenvin ile tanış', glyph: 'بٌ',
    items: () => TV.map((id) => I.tenvin(id, 'u')), review: () => TV.flatMap((id) => ['u', 'e', 'o'].map((h) => I.tenvin(id, h))),
    steps: [{ t: 'concept', c: 'tenvin' }, { t: 'read', lines: () => TV.slice(0, 6).map((id) => ['u', 'e', 'o'].map((h) => I.tenvin(id, h))), chant: true }, { t: 'pick', rounds: 6, k: 3 }, { t: 'balloons', targets: 5 }] });
  const TW = () => [W('اَحَدٌ', 'ehadün'), W('كُفُوًا', 'küfüven'), W('حَسَنٌ', 'hasenün'), W('قَلَمٌ', 'kalemün'), W('وَلَدٌ', 'veledün'), W('جَبَلٌ', 'cebelün'),
    W('لَهَبٍ', 'lehebin'), W('مَسَدٍ', 'mesedin'), W('رَجُلٌ', 'racülün'), W('عَمَلٌ', 'amelün')];
  add({ id: 'tenvin2', island: 'tenvin', title: 'Tenvinli kelimeler', glyph: 'اَحَدٌ', items: TW, review: () => [],
    steps: [{ t: 'intro', mode: 'word', max: 6 }, { t: 'read', lines: () => chunk(TW(), 3) }, { t: 'pick', rounds: 6, k: 3 }, { t: 'memory', pairs: 3 }] });

  // 7) Şedde Tepesi
  const SD = ['be', 'te', 'dal', 'ra', 'sin', 'sad', 'lam', 'mim', 'nun', 'kaf'];
  add({ id: 'sedde1', island: 'sedde', title: 'Şedde ile tanış', glyph: 'اَبَّ',
    items: () => SD.map((id) => I.shadda(id)), review: () => [],
    steps: [{ t: 'concept', c: 'sedde' }, { t: 'read', lines: () => chunk(SD.map((id) => I.shadda(id)), 3), chant: true }, { t: 'pick', rounds: 6, k: 3 }, { t: 'balloons', targets: 5 }] });
  const SW = () => [W('رَبِّ', 'rabbi'), W('اِنَّ', 'inne'), W('ثُمَّ', 'sümme'), W('تَبَّ', 'tebbe'), W('مَدَّ', 'medde'), W('حَقَّ', 'hakka'), W('عَمَّ', 'amme'), W('شَدَّ', 'şedde'), W('كُلُّ', 'küllü')];
  add({ id: 'sedde2', island: 'sedde', title: 'Şeddeli kelimeler', glyph: 'رَبِّ', items: SW, review: () => [],
    steps: [{ t: 'intro', mode: 'word', max: 6 }, { t: 'read', lines: () => chunk(SW(), 3) }, { t: 'pick', rounds: 6, k: 3 }, { t: 'memory', pairs: 3 }] });

  // 8) Uzatma Bahçesi
  const MD = ['be', 'te', 'kaf', 'lam', 'mim', 'nun', 'sin', 'ra'];
  add({ id: 'med1', island: 'med', title: 'Med harfleri', glyph: 'بَا',
    items: () => MD.map((id) => I.med(id, 'u')), review: () => MD.flatMap((id) => ['u', 'e', 'o'].map((h) => I.med(id, h))),
    steps: [{ t: 'concept', c: 'med' }, { t: 'read', lines: () => MD.slice(0, 6).map((id) => ['u', 'e', 'o'].map((h) => I.med(id, h))), chant: true }, { t: 'pick', rounds: 6, k: 3 }, { t: 'balloons', targets: 5 }] });
  const MW = () => [W('قَالَ', 'kâle'), W('قِيلَ', 'kîle'), W('يَقُولُ', 'yekûlü'), W('نُورٌ', 'nûrun'), W('دِينٌ', 'dînün'), W('كِتَابٌ', 'kitâbün'),
    W('نَارٌ', 'nârun'), W('رَسُولٌ', 'rasûlün'), W('هٰذَا', 'hâzâ'), W('ذٰلِكَ', 'zâlike')];
  add({ id: 'med2', island: 'med', title: 'Uzatmalı kelimeler', glyph: 'قَالَ', items: MW, review: () => [],
    steps: [{ t: 'concept', c: 'ceker' }, { t: 'intro', mode: 'word', max: 6 }, { t: 'read', lines: () => chunk(MW(), 3) }, { t: 'pick', rounds: 6, k: 3 }] });

  // 9) Kur'an Kelimeleri (gerçek kâri sesleriyle)
  add({ id: 'kelime1', island: 'kelime', title: 'Fâtiha kelimeleri 1', glyph: 'اَلْحَمْدُ',
    items: () => surahWords(1, [1, 2, 3, 4]), review: () => [],
    steps: [{ t: 'concept', c: 'elif_lam' }, { t: 'intro', mode: 'word', max: 8 }, { t: 'pick', rounds: 6, k: 3 }, { t: 'read', lines: () => ayahLines(1, [1, 2, 3, 4]) }] });
  add({ id: 'kelime2', island: 'kelime', title: 'Fâtiha kelimeleri 2', glyph: 'اِيَّاكَ',
    items: () => surahWords(1, [5, 6, 7]), review: () => [],
    steps: [{ t: 'intro', mode: 'word', max: 8 }, { t: 'pick', rounds: 6, k: 3 }, { t: 'read', lines: () => ayahLines(1, [5, 6, 7]) }] });
  add({ id: 'kelime3', island: 'kelime', title: 'İhlâs ve Kevser kelimeleri', glyph: 'اَحَدٌ',
    items: () => [...surahWords(112), ...surahWords(108)], review: () => [],
    steps: [{ t: 'intro', mode: 'word', max: 8 }, { t: 'pick', rounds: 6, k: 3 }, { t: 'read', lines: () => [...ayahLines(112, [1, 2, 3, 4]), ...ayahLines(108, [1, 2, 3])] }] });

  // 10) Sûre Okuma Yolu
  K.SURAHS.forEach((s) => {
    add({ id: 'sure' + s.n, island: 'sure', title: s.tr + ' sûresi', glyph: s.ar, surah: s.n, items: () => [], review: () => [],
      steps: [{ t: 'surahread', surah: s.n }] });
  });

  const STICKERS = ['🦁', '🐼', '🐰', '🦊', '🐻', '🐨', '🐯', '🐸', '🐵', '🦄', '🐳', '🐬', '🐢', '🦋', '🐞', '🐝', '🌸', '🌻', '🌈', '⭐', '🌙', '☀️', '🍎', '🍓',
    '🍉', '🍇', '🍌', '🥕', '🚀', '✈️', '🚂', '⛵', '🎈', '🎁', '📚', '✏️', '🕌', '🌴', '⛰️', '🌊', '💎', '👑', '🏆', '🥇', '🧸', '🪁', '🦒', '🐘', '🦓', '🐧',
    '🦉', '🐿️', '🦔', '🐟', '🐙', '🦀', '🌷', '🍀', '🍄', '🌵', '🐪', '🦜', '🐑', '🐄', '🐓', '🕋', '📖', '🤲'];
  LEVELS.forEach((l, i) => { l.sticker = STICKERS[i % STICKERS.length]; });
  const EXTRA_STICKERS = { surahMemo: '🏅', namaz: '🧎', abdest: '💧', diploma: '🎓' };

  function levelById(id) { return LEVELS.find((l) => l.id === id); }
  function isUnlocked(lv) {
    const s = K.Store.s;
    if (s.settings.unlockAll) return true;
    if (lv.n === 0) return true;
    const prev = LEVELS[lv.n - 1];
    return !!(s.levels[prev.id] && s.levels[prev.id].done);
  }
  function currentLevel() {
    const s = K.Store.s;
    return LEVELS.find((l) => !(s.levels[l.id] && s.levels[l.id].done)) || LEVELS[LEVELS.length - 1];
  }
  function islandProgress(isl) {
    const ls = LEVELS.filter((l) => l.island === isl);
    const done = ls.filter((l) => K.Store.s.levels[l.id] && K.Store.s.levels[l.id].done).length;
    return { done, total: ls.length };
  }
  /** Ebeveyn: belirtilen adaya kadar olan tüm dersleri tamamlanmış say. */
  function jumpTo(islandId) {
    const idx = LEVELS.findIndex((l) => l.island === islandId);
    LEVELS.slice(0, idx).forEach((l) => { const st = K.Store.level(l.id); if (!st.done) { st.done = true; st.stars = Math.max(st.stars, 1); } });
    K.Store.save(true);
  }

  K.C = { ISLANDS, LEVELS, CONCEPTS, STICKERS, EXTRA_STICKERS, levelById, isUnlocked, currentLevel, islandProgress, jumpTo, autoWord, surahWords, ayahLines, chunk, otreFix };
})();
