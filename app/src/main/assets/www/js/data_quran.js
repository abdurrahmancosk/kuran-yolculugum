/* Kur'an sesleri (kâriler), kelime sesleri ve video kaynakları. */
window.K = window.K || {};
(function () {
  const pad = (n) => String(n).padStart(3, '0');
  const RECITERS = [
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
    return [
      `https://everyayah.com/data/${r.ea}/${pad(s)}${pad(a)}.mp3`,
      `https://cdn.islamic.network/quran/audio/128/${r.isl}/${g}.mp3`,
      `https://cdn.islamic.network/quran/audio/64/${r.isl}/${g}.mp3`,
      `https://everyayah.com/data/Husary_128kbps/${pad(s)}${pad(a)}.mp3`,
    ];
  }
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

  K.Q = { RECITERS, reciter, ayahUrls, wordUrls, surah, text, wordItem, ayahKey, globalNum, toArabicDigits, VIDEOS, SURAH_VIDEO, videos, parseYouTube, pad };
})();
