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

  // Kavram anlatımları: sesli satırlar Diyanet Elif-Ba CD'sindeki hocanın kendi cümleleridir (insan sesi).
  // { t, hv } → kayıtlı; düz metin → yalnız balonda gösterilir (ebeveyn isterse kendi sesiyle kaydedebilir).
  const CD = (hv) => ({ t: K.HV_TEXT ? K.HV_TEXT[hv] : '', hv });
  const CONCEPTS = {
    harfler: { title: 'Elif-Ba harfleri', demo: () => ['elif', 'be', 'te'].map((id) => I.letter(id)), lines: [CD('tr_harfler')] },
    forms: { title: 'Harfler el ele tutuşur', demo: () => K.L.forms('be'),
      lines: [CD('tr_sekil'), 'Harfler kelimede yan yana gelince el ele tutuşur. Bu yüzden başta, ortada ve sonda biraz farklı görünürler.'] },
    bitisme: { title: 'Utangaç harfler', demo: () => ['elif', 'dal', 'zel', 'ra', 'ze', 'vav'].map((id) => I.letter(id)),
      lines: ['Bu altı harf kendinden sonraki harfe bitişmez: Elif, Dal, Zel, Ra, Ze ve Vav. Bu yüzden sadece iki şekilleri vardır.'] },
    u: { title: 'Üstün', demo: () => [I.letter('be'), I.syl('be', 'u')], harekeAnim: 'u', lines: [CD('tr_hareke'), CD('tr_ustun')] },
    e: { title: 'Esre', demo: () => [I.letter('be'), I.syl('be', 'e')], harekeAnim: 'e', lines: [CD('tr_esre')] },
    o: { title: 'Ötre', demo: () => [I.letter('be'), I.syl('be', 'o')], harekeAnim: 'o', lines: [CD('tr_otre')] },
    mix: { title: 'Hareke karışık', demo: () => [I.syl('be', 'u'), I.syl('be', 'e'), I.syl('be', 'o')], lines: [CD('tr_hareke')] },
    hece: { title: 'Heceleri birleştir', demo: () => [K.C.autoWord('كَتَبَ', 'cd4_9')],
      lines: ['Harekeli harfleri yan yana okuyunca kelimeler ortaya çıkar. Sağdan sola doğru okuruz.'] },
    cezm: { title: 'Cezm', demo: () => [I.cezm('be', 'u'), I.cezm('be', 'e'), I.cezm('be', 'o')], lines: [CD('tr_cezm1'), CD('tr_cezm2')] },
    tenvin: { title: 'Tenvin', demo: () => TV1().slice(0, 3), lines: [CD('tr_tenvin_u')] },
    tenvin2: { title: 'İki esre, iki ötre', demo: () => [TV2()[0], TV2()[7]], lines: [CD('tr_tenvin_e'), CD('tr_tenvin_o')] },
    sedde: { title: 'Şedde', demo: () => [I.shadda('be', 'u'), I.shadda('be', 'e'), I.shadda('be', 'o')], lines: [CD('tr_sedde1'), CD('tr_sedde2')] },
    med: { title: 'Med harfleri', demo: () => [I.med('be', 'u'), I.med('be', 'e'), I.med('be', 'o')],
      lines: [CD('tr_med')] },
    medk: { title: 'Uzatma harfleri', demo: () => [MW()[0], MW()[8], MW()[12]], lines: [CD('tr_med_elif'), CD('tr_med_ya'), CD('tr_med_vav')] },
    ceker: { title: 'Çeker', demo: () => [W('هٰذَا', 'hâzâ', 'cd23_16')], lines: [CD('tr_ceker')] },
    elif_lam: { title: 'Elif-Lâm ve Allah lafzı', demo: () => [wordFrom(1, 2, 1), wordFrom(1, 2, 2)],
      lines: [CD('tr_el'), CD('tr_lafza')] },
  };

  // ------------------------------------------------------------ yardımcılar
  function otreFix(s) { return (K.Store && K.Store.s.settings.otre === 'u') ? s.replace(/ü/g, 'u').replace(/Ü/g, 'U') : s; }
  /** Kelime; hv: Diyanet Elif-Ba CD kaydının anahtarı ('cdDERS_SIRA'). */
  function W(ar, tr, hv) { return I.word(ar, otreFix(tr), { hv }); }
  /** Harekeli harflerden kendiliğinden okunuş üretir (kalın harf komşuluğunda üstün 'a' okunur). */
  function autoWord(ar, hv) {
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
    const it = I.word(ar, tr, { hv });
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
        ...(gi === 0 ? [{ t: 'concept', c: 'harfler' }] : []),
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

  // 4) Hece Köprüsü — kelimeler ve sesleri Diyanet Elif-Ba CD'sinden (ders 4, 7, 8)
  const D1 = [['أَدَبَ', 'cd4_1'], ['دَرَكَ', 'cd4_3'], ['وَرَدَ', 'cd4_6'], ['وَرَعَ', 'cd4_7'], ['وَزَنَ', 'cd4_8'], ['كَتَبَ', 'cd4_9'],
    ['نَزَلَ', 'cd4_11'], ['يَدَكَ', 'cd4_12'], ['حَسَدَ', 'cd4_13'], ['نَصَرَ', 'cd4_26'], ['فَسَدَ', 'cd4_24'], ['شَرَعَ', 'cd4_22']];
  const D2 = [['اَمِنَ', 'cd7_2'], ['اَزِفَ', 'cd7_4'], ['شَرِبَ', 'cd7_5'], ['لَبِسَ', 'cd7_6'], ['عَلِمَ', 'cd7_9'], ['حَمِدَ', 'cd7_10'],
    ['سَمِعَ', 'cd7_21'], ['حَسِبَ', 'cd7_23'], ['وَسِعَ', 'cd7_24'], ['لَهَبِ', 'cd7_15'], ['مَسَدِ', 'cd7_16'], ['مَلِكِ', 'cd7_17']];
  const D3 = [['رُزِقَ', 'cd8_1'], ['كُتِبَ', 'cd8_3'], ['ذُكِرَ', 'cd8_6'], ['خُلِقَ', 'cd8_11'], ['حُمِلَ', 'cd8_17'], ['رُفِعَ', 'cd8_18'],
    ['يَلِدُ', 'cd8_16'], ['يَرِثُ', 'cd8_14'], ['كُتُبُ', 'cd8_27'], ['رُسُلُ', 'cd8_25'], ['صَمَدُ', 'cd8_24'], ['مَثَلُ', 'cd8_22']];
  const AW = (list) => list.map(([ar, hv]) => autoWord(ar, hv));
  [[D1, 'Üstünlü kelimeler', true], [D2, 'Esreli kelimeler', false], [D3, 'Ötreli kelimeler', false]].forEach(([list, title, first], i) => {
    add({ id: 'hece' + (i + 1), island: 'hece', title, glyph: list[0][0],
      items: () => AW(list), review: () => [],
      steps: [
        ...(first ? [{ t: 'concept', c: 'hece' }] : []),
        { t: 'intro', mode: 'word', max: 6 },
        { t: 'read', lines: () => chunk(AW(list), 3), chant: true },
        { t: 'pick', rounds: 6, k: 3 },
        { t: 'memory', pairs: 3 },
      ] });
  });

  // 5) Cezm Kalesi — harf satırları CD ders 9, kelimeler CD ders 10
  const CZ = ['be', 'te', 'dal', 'ra', 'sin', 'kaf', 'lam', 'mim', 'nun'];
  add({ id: 'cezm1', island: 'cezm', title: 'Cezm ile tanış', glyph: 'اَبْ',
    items: () => CZ.map((id) => I.cezm(id, 'u')), review: () => CZ.flatMap((id) => ['u', 'e', 'o'].map((h) => I.cezm(id, h))),
    steps: [{ t: 'concept', c: 'cezm' }, { t: 'read', lines: () => CZ.slice(0, 6).map((id) => ['u', 'e', 'o'].map((h) => I.cezm(id, h))), chant: true }, { t: 'pick', rounds: 6, k: 3 }, { t: 'balloons', targets: 5 }] });
  const CW = () => [W('لَمْ', 'lem', 'cd10_2'), W('قُلْ', 'kul', 'cd10_3'), W('هُمْ', 'hüm', 'cd10_4'), W('مِنْ', 'min', 'cd10_5'), W('اِنْ', 'in', 'cd10_6'),
    W('لَكُمْ', 'leküm', 'cd10_9'), W('لَهُمْ', 'lehüm', 'cd10_10'), W('اَنْتُمْ', 'entüm', 'cd10_11'), W('كَيْفَ', 'keyfe', 'cd10_13'), W('يَوْمَ', 'yevme', 'cd10_14'),
    W('اَنْزَلَ', 'enzele', 'cd10_17'), W('اَرْسَلَ', 'ersele', 'cd10_18'), W('كُنْتُمْ', 'küntüm', 'cd10_21'), W('نَحْنُ', 'nahnü', 'cd10_22'),
    W('نَعْبُدُ', 'na\'büdü', 'cd10_23'), W('لَمْ يَلِدْ', 'lem yelid', 'cd10_25'), W('وَلَمْ يَكُنْ', 've lem yekün', 'cd10_26')];
  add({ id: 'cezm2', island: 'cezm', title: 'Cezmli kelimeler', glyph: 'قُلْ', items: CW, review: () => [],
    steps: [{ t: 'intro', mode: 'word', max: 6 }, { t: 'read', lines: () => chunk(CW(), 3) }, { t: 'pick', rounds: 6, k: 3 }, { t: 'memory', pairs: 3 }] });

  // 6) Tenvin Şelalesi — CD ders 20 (iki üstün), 21 (iki esre), 22 (iki ötre)
  function TV1() {
    return [W('اَبَدًا', 'ebeden', 'cd20_2'), W('مَثَلًا', 'meselen', 'cd20_3'), W('رَغَدًا', 'rağaden', 'cd20_4'), W('عَلِيمًا', 'alîmen', 'cd20_6'),
      W('رَحِيمًا', 'rahîmen', 'cd20_7'), W('كَبِيرًا', 'kebîran', 'cd20_8'), W('دِينًا', 'dînen', 'cd20_9'), W('نُورًا', 'nûran', 'cd20_10'),
      W('نَارًا', 'nâran', 'cd20_11'), W('كِتَابًا', 'kitâben', 'cd20_15'), W('قَلِيلًا', 'kalîlen', 'cd20_16'), W('كُفُوًا', 'küfüven', 'cd20_18')];
  }
  function TV2() {
    return [W('حَسَدٍ', 'hasedin', 'cd21_1'), W('اَحَدٍ', 'ehadin', 'cd21_2'), W('لَهَبٍ', 'lehebin', 'cd21_4'), W('بَيْتٍ', 'beytin', 'cd21_8'),
      W('نُورٍ', 'nûrin', 'cd21_9'), W('عَلِيمٍ', 'alîmin', 'cd21_14'), W('شَدِيدٍ', 'şedîdin', 'cd21_15'),
      W('اَحَدٌ', 'ehadün', 'cd22_1'), W('رُسُلٌ', 'rusülün', 'cd22_3'), W('عَذَابٌ', 'azâbün', 'cd22_5'), W('كِتَابٌ', 'kitâbün', 'cd22_6'),
      W('قَدِيرٌ', 'kadîrun', 'cd22_8'), W('رَحِيمٌ', 'rahîmün', 'cd22_9'), W('خَيْرٌ', 'hayrun', 'cd22_26')];
  }
  add({ id: 'tenvin1', island: 'tenvin', title: 'İki üstün', glyph: 'اَبَدًا', items: TV1, review: () => [],
    steps: [{ t: 'concept', c: 'tenvin' }, { t: 'intro', mode: 'word', max: 6 }, { t: 'read', lines: () => chunk(TV1(), 3), chant: true }, { t: 'pick', rounds: 6, k: 3 }, { t: 'balloons', targets: 5 }] });
  add({ id: 'tenvin2', island: 'tenvin', title: 'İki esre, iki ötre', glyph: 'اَحَدٌ', items: TV2, review: () => [],
    steps: [{ t: 'concept', c: 'tenvin2' }, { t: 'intro', mode: 'word', max: 6 }, { t: 'read', lines: () => chunk(TV2(), 3) }, { t: 'pick', rounds: 6, k: 3 }, { t: 'memory', pairs: 3 }] });

  // 7) Şedde Tepesi — harf satırları CD ders 17, kelimeler CD ders 18
  const SD = ['be', 'te', 'dal', 'ra', 'sin', 'sad', 'lam', 'mim', 'nun', 'kaf'];
  add({ id: 'sedde1', island: 'sedde', title: 'Şedde ile tanış', glyph: 'اَبَّ',
    items: () => SD.map((id) => I.shadda(id)), review: () => SD.flatMap((id) => ['u', 'e', 'o'].map((h) => I.shadda(id, h))),
    steps: [{ t: 'concept', c: 'sedde' }, { t: 'read', lines: () => SD.slice(0, 6).map((id) => ['u', 'e', 'o'].map((h) => I.shadda(id, h))), chant: true }, { t: 'pick', rounds: 6, k: 3 }, { t: 'balloons', targets: 5 }] });
  const SW = () => [W('اِنَّ', 'inne', 'cd18_5'), W('ثُمَّ', 'sümme', 'cd18_6'), W('تَبَّ', 'tebbe', 'cd18_3'), W('لَعَلَّ', 'le\'alle', 'cd18_8'),
    W('نَزَّلَ', 'nezzele', 'cd18_10'), W('عَلَّمَ', 'allema', 'cd18_11'), W('كَذَّبَ', 'kezzebe', 'cd18_12'), W('اِنَّكَ', 'inneke', 'cd18_17'),
    W('اِيَّاكَ', 'iyyâke', 'cd18_18'), W('اَلَّذِي', 'ellezî', 'cd18_19'), W('فَلَمَّا', 'felemmâ', 'cd18_21'), W('اِنَّمَا', 'innemâ', 'cd18_23'),
    W('رَبِّهِمْ', 'rabbihim', 'cd18_25'), W('اِلَّا', 'illâ', 'cd18_27'), W('اَيُّهَا', 'eyyühâ', 'cd18_28')];
  add({ id: 'sedde2', island: 'sedde', title: 'Şeddeli kelimeler', glyph: 'اِنَّ', items: SW, review: () => [],
    steps: [{ t: 'intro', mode: 'word', max: 6 }, { t: 'read', lines: () => chunk(SW(), 3) }, { t: 'pick', rounds: 6, k: 3 }, { t: 'memory', pairs: 3 }] });

  // 8) Uzatma Bahçesi — harf satırları CD ders 12, kelimeler CD ders 13-15, çeker ders 23
  const MD = ['be', 'te', 'kaf', 'lam', 'mim', 'nun', 'sin', 'ra'];
  add({ id: 'med1', island: 'med', title: 'Med harfleri', glyph: 'بَا',
    items: () => MD.map((id) => I.med(id, 'u')), review: () => MD.flatMap((id) => ['u', 'e', 'o'].map((h) => I.med(id, h))),
    steps: [{ t: 'concept', c: 'med' }, { t: 'read', lines: () => MD.slice(0, 6).map((id) => ['u', 'e', 'o'].map((h) => I.med(id, h))), chant: true }, { t: 'pick', rounds: 6, k: 3 }, { t: 'balloons', targets: 5 }] });
  function MW() { return [W('قَالَ', 'kâle', 'cd13_7'), W('كَانَ', 'kâne', 'cd13_8'), W('زَادَ', 'zâde', 'cd13_9'), W('اَرَادَ', 'erâde', 'cd13_11'),
    W('يَكَادُ', 'yekâdü', 'cd13_15'), W('مَالِكِ', 'mâliki', 'cd13_18'), W('عَلَيْنَا', 'aleynâ', 'cd13_22'), W('اِهْدِنَا', 'ihdinâ', 'cd13_23'),
    W('فِي', 'fî', 'cd14_3'), W('دِينِ', 'dîni', 'cd14_7'), W('عَالَمِينَ', 'âlemîne', 'cd14_21'), W('كَافِرِينَ', 'kâfirîne', 'cd14_24'),
    W('يَقُولُونَ', 'yekûlûne', 'cd15_13'), W('يَعْلَمُونَ', 'ya\'lemûne', 'cd15_15'), W('كَافِرُونَ', 'kâfirûne', 'cd15_22')]; }
  add({ id: 'med2', island: 'med', title: 'Uzatmalı kelimeler', glyph: 'قَالَ', items: MW, review: () => [],
    steps: [{ t: 'concept', c: 'medk' }, { t: 'intro', mode: 'word', max: 6 }, { t: 'read', lines: () => chunk(MW(), 3) }, { t: 'pick', rounds: 6, k: 3 }, { t: 'memory', pairs: 3 }] });
  const KW = () => [W('هٰذَا', 'hâzâ', 'cd23_16'), W('ذٰلِكَ', 'zâlike', 'cd23_6'), W('اٰدَمَ', 'âdeme', 'cd23_2'), W('لٰكِنْ', 'lâkin', 'cd23_9'),
    W('اِلٰهٌ', 'ilâhün', 'cd23_7'), W('اٰيَاتٌ', 'âyâtün', 'cd23_15'), W('قُرْاٰنٌ', 'kur\'ânün', 'cd23_18'), W('اٰتَيْنَا', 'âteynâ', 'cd23_19')];
  add({ id: 'med3', island: 'med', title: 'Çekerli kelimeler', glyph: 'هٰذَا', items: KW, review: () => [],
    steps: [{ t: 'concept', c: 'ceker' }, { t: 'intro', mode: 'word', max: 6 }, { t: 'read', lines: () => chunk(KW(), 3) }, { t: 'pick', rounds: 6, k: 3 }] });

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
