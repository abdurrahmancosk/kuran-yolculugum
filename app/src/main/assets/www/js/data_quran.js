/* Kur'an sesleri (kâriler), kelime sesleri ve video kaynakları. */
window.K = window.K || {};
(function () {
  const pad = (n) => String(n).padStart(3, '0');
  // İshak Danış (Türk hafız) — "Âyet Âyet Kur'an-ı Kerim", İHL öğrencilerine eğitim amaçlı kayıtlar (archive.org).
  // Her dosya konuşma tanıma ile Kur'an metnine göre doğrulandı: f[0] = Eûzü (Fâtiha) / Besmele (diğerleri), f[a] = a. âyet.
  const DANIS = {"1": {"id": "1.Ayet-AyetFatihaSuresishakDan", "f": ["001_Fatiha_000.mp3", "001_Fatiha_001.mp3", "001_Fatiha_002.mp3", "001_Fatiha_003.mp3", "001_Fatiha_004.mp3", "001_Fatiha_005.mp3", "001_Fatiha_006.mp3", "001_Fatiha_007.mp3"]}, "103": {"id": "103.Ayet-AyetAsrSuresishakDan", "f": ["103_Asr_00.mp3", "103_Asr_01.mp3", "103_Asr_02.mp3", "103_Asr_03.mp3"]}, "104": {"id": "104.Ayet-AyetHumezeSuresishakDan", "f": ["104_Humeze_00.mp3", "104_Humeze_01.mp3", "104_Humeze_02.mp3", "104_Humeze_03.mp3", "104_Humeze_04.mp3", "104_Humeze_05.mp3", "104_Humeze_06.mp3", "104_Humeze_07.mp3", "104_Humeze_08.mp3", "104_Humeze_09.mp3"]}, "105": {"id": "105.Ayet-AyetFilSuresishakDan", "f": ["105_Fil_00.mp3", "105_Fil_01.mp3", "105_Fil_02.mp3", "105_Fil_03.mp3", "105_Fil_04.mp3", "105_Fil_05.mp3"]}, "106": {"id": "106.Ayet-AyetKureysSuresishakDan", "f": ["106_Kureys_00.mp3", "106_Kureys_01.mp3", "106_Kureys_02.mp3", "106_Kureys_03.mp3", "106_Kureys_04.mp3"]}, "107": {"id": "107.Ayet-AyetMaunSuresishakDan", "f": ["107_Maun_00.mp3", "107_Maun_01.mp3", "107_Maun_02.mp3", "107_Maun_03.mp3", "107_Maun_04.mp3", "107_Maun_05.mp3", "107_Maun_06.mp3", "107_Maun_07.mp3"]}, "108": {"id": "108.Ayet-AyetKevserSuresishakDan", "f": ["108_Kevser_00.mp3", "108_Kevser_01.mp3", "108_Kevser_02.mp3", "108_Kevser_03.mp3"]}, "109": {"id": "109.Ayet-AyetKafirunSuresishakDan", "f": ["109_Kafirun_00.mp3", "109_Kafirun_01.mp3", "109_Kafirun_02.mp3", "109_Kafirun_03.mp3", "109_Kafirun_04.mp3", "109_Kafirun_05.mp3", "109_Kafirun_06.mp3"]}, "110": {"id": "110.Ayet-AyetNasrSuresishakDan", "f": ["110_Nasr_00.mp3", "110_Nasr_01.mp3", "110_Nasr_02.mp3", "110_Nasr_03.mp3"]}, "111": {"id": "111.Ayet-AyetTebbetSuresishakDan", "f": ["111_Tebbet_00.mp3", "111_Tebbet_01.mp3", "111_Tebbet_02.mp3", "111_Tebbet_03.mp3", "111_Tebbet_04.mp3", "111_Tebbet_05.mp3"]}, "112": {"id": "112.Ayet-AyetIhlasSuresishakDan", "f": ["112_Ihlas_00.mp3", "112_Ihlas_01.mp3", "112_Ihlas_02.mp3", "112_Ihlas_03.mp3", "112_Ihlas_04.mp3"]}, "113": {"id": "113.Ayet-AyetFelakSuresishakDan", "f": ["113_Felak_00.mp3", "113_Felak_01.mp3", "113_Felak_02.mp3", "113_Felak_03.mp3", "113_Felak_04.mp3", "113_Felak_05.mp3"]}, "114": {"id": "114.Ayet-AyetNasSuresishakDan", "f": ["114_00.mp3", "114_01.mp3", "114_02.mp3", "114_03.mp3", "114_04.mp3", "114_05.mp3", "114_06.mp3"]}};
  const DANIS_EXTRA = {"2:201": ["2.Ayet-AyetBakaraSuresishakDan", "002_Bakara_201.mp3"], "14:41": ["14.Ayet-AyetIbrahimSuresishakDan", "014_Ibrahim_41.mp3"]};
  const AR = (id, f) => `https://archive.org/download/${id}/${encodeURIComponent(f)}`;
  const RECITERS = [
    { id: 'danis', name: 'İshak Danış', sub: 'Türk hafız · âyet âyet', ea: 'Husary_Muallim_128kbps', isl: 'ar.husary', turk: true },
    { id: 'husary_m', name: 'Husarî', sub: 'Öğretici, yavaş', ea: 'Husary_Muallim_128kbps', isl: 'ar.husary' },
    { id: 'minshawi_m', name: 'Minşâvî', sub: 'Çocuklarla tekrar', ea: 'Minshawy_Teacher_128kbps', isl: 'ar.minshawi' },
    { id: 'alafasy', name: 'Afâsî', sub: 'Mişârî Râşid', ea: 'Alafasy_128kbps', isl: 'ar.alafasy' },
    { id: 'abdulbasit', name: 'Abdülbâsıt', sub: 'Mürettel', ea: 'Abdul_Basit_Murattal_192kbps', isl: 'ar.abdulbasitmurattal' },
  ];

  function reciter(id) {
    id = id || (K.Store && K.Store.s.settings.reciter);
    return RECITERS.find((r) => r.id === id) || RECITERS[0];
  }
  function globalNum(s, a) {
    let g = 0; for (let i = 0; i < s - 1; i++) g += K.AYAH_COUNTS[i]; return g + a;
  }
  /** Bir âyetin ses adresleri (birincil + yedekler). */
  function ayahUrls(s, a, rid) {
    const r = reciter(rid);
    const g = globalNum(s, a);
    const first = [];
    if (r.id === 'danis') {
      const d = DANIS[s];
      if (d && d.f[a]) first.push(AR(d.id, d.f[a]));
      else if (DANIS_EXTRA[s + ':' + a]) first.push(AR(...DANIS_EXTRA[s + ':' + a]));
    }
    return [...first,
      `https://everyayah.com/data/${r.ea}/${pad(s)}${pad(a)}.mp3`,
      `https://cdn.islamic.network/quran/audio/128/${r.isl}/${g}.mp3`,
      `https://cdn.islamic.network/quran/audio/64/${r.isl}/${g}.mp3`,
      `https://everyayah.com/data/Husary_128kbps/${pad(s)}${pad(a)}.mp3`,
    ];
  }
  /** Sûrenin başındaki besmele (İshak Danış'ta her sûrenin kendi besmele kaydı vardır). */
  function basmalaUrls(s, rid) {
    const r = reciter(rid);
    if (r.id === 'danis' && DANIS[s] && +s !== 1) return [AR(DANIS[s].id, DANIS[s].f[0]), ...ayahUrls(1, 1, 'husary_m')];
    return ayahUrls(1, 1, rid);
  }
  /** İshak Danış Eûzü kaydı. */
  const EUZU_URLS = [AR(DANIS['1'].id, DANIS['1'].f[0])];
  /** Namaz duaları: Türk usulü hafız okuyuşu (archive.org "Namaz Sureleri ve Duaları"), doğrulanmış metin. */
  const DUA_AUDIO = (f, t) => [`https://archive.org/download/NamazSreleriVeDualari/${f}${t ? '#t=' + t : ''}`];
  /** Kelime kelime ses (quran.com kelime kayıtları). */
  function wordUrls(s, a, i) {
    const f = `${pad(s)}_${pad(a)}_${pad(i)}.mp3`;
    return [`https://audio.qurancdn.com/wbw/${f}`, `https://verses.quran.com/wbw/${f}`];
  }
  function surah(n) { return K.SURAHS.find((x) => x.n === +n); }
  function text(w) { return (K.Store && K.Store.s.settings.script === 'std') ? w.s : w.t; }
  function wordItem(s, a, w) {
    return { kind: 'qword', key: `Q_${s}_${a}_${w.i}`, ar: text(w), sayAr: w.s, label: '', audio: wordUrls(s, a, w.i), s, a, i: w.i, mark: w.m || '' };
  }
  function ayahKey(s, a) { return `A_${s}_${a}`; }
  const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

  // ------------------------------------------------------------ videolar
  // Musa Coşkun (Diyanet Mushafları İnceleme ve Kıraat Kurulu Üyesi) tilavetleri — web aramasıyla bulunanlar.
  const VIDEOS = {
    musa: [
      { id: 'iHHpWzh327c', title: 'Mâide-i Kur\'an tilaveti', sub: 'Musa Coşkun · Kütahya Müftülüğü' },
      { id: 'VVSDm99hCiI', title: 'Hüvallâhüllezî (Haşr sûresi son âyetler)', sub: 'Musa Coşkun Hoca' },
      { id: 'oz7OL0gF6WU', title: 'Kur\'an-ı Kerim tilaveti', sub: 'Musa Coşkun · Tahrîm sûresi' },
      { id: 'ZyA3rBWTbmI', title: 'İnegöl OSB Camii tilaveti', sub: 'Musa Coşkun · 26.01.2013' },
      { id: 'dFPcrKua-hw', title: 'Musa Coşkun Hocaefendi tilaveti', sub: 'Mushafları İnceleme ve Kıraat Kurulu Üyesi' },
      { url: 'https://www.diyanet.tv/mukabele-30-cuz-30-hafiz/video/mukabele-30-cuz-30-hafiz--1-cuz', title: 'Mukabele: 1. Cüz (Fâtiha ve Bakara 1-141)', sub: 'Diyanet TV · 30 Cüz 30 Hâfız · Musa Coşkun', ext: true },
    ],
    // Diyanet Çocuk / Diyanet TV — "Namaz Kılmayı Öğreniyorum" çizgi dizisi ve anlatımlar
    namaz: [
      { id: 'vnUCPvWZLS8', title: 'Abdest Almak', sub: 'Namaz Kılmayı Öğreniyorum · 1. Bölüm' },
      { id: 'z58mDpu52oI', title: 'Sabah Namazı Nasıl Kılınır?', sub: 'Diyanet Çocuk' },
      { id: 'CxnBsT_L3Kw', title: 'Öğle Namazı', sub: 'Namaz Kılmayı Öğreniyorum · 3. Bölüm' },
      { id: 'U6LYvYqfAOU', title: 'Öğle Namazı Nasıl Kılınır?', sub: 'Diyanet Çocuk' },
      { id: 'lyy3sP5AlWE', title: 'İkindi Namazı', sub: 'Namaz Kılmayı Öğreniyorum · 4. Bölüm' },
      { id: 'RKyl090YILc', title: 'Yatsı Namazı', sub: 'Namaz Kılmayı Öğreniyorum · 6. Bölüm' },
    ],
  };
  const SURAH_VIDEO = { 1: VIDEOS.musa[5] };

  function videos(cat) {
    const s = K.Store.s;
    const base = (VIDEOS[cat] || []).filter((v) => !s.hiddenVideos.includes(v.id || v.url));
    const custom = s.customVideos.filter((v) => v.cat === cat);
    return [...custom, ...base];
  }
  function parseYouTube(url) {
    const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(String(url).trim())) return String(url).trim();
    return null;
  }

  K.Q = { DANIS, basmalaUrls, EUZU_URLS, DUA_AUDIO, RECITERS, reciter, ayahUrls, wordUrls, surah, text, wordItem, ayahKey, globalNum, toArabicDigits, VIDEOS, SURAH_VIDEO, videos, parseYouTube, pad };
})();
