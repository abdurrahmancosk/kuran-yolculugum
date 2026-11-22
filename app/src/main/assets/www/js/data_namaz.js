/* Namaz bölümü verisi: dualar, abdest ve namaz adımları, vakitler.
   Kılınış Diyanet İlmihali'ne (Hanefî) göre sadeleştirilmiştir. */
window.K = window.K || {};
(function () {
  // audio: {quran:'2:201', from:4} → âyetin 4. kelimesinden itibaren kelime kelime; {ayah:'14:41'} → tüm âyet
  const DUAS = [
    { id: 'tekbir', title: 'Tekbir', ar: 'اَللّٰهُ اَكْبَرُ', lat: 'Allâhü ekber', mean: 'Allah en büyüktür.' },
    { id: 'subhaneke', title: 'Sübhâneke', ar: 'سُبْحَانَكَ اللّٰهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالٰى جَدُّكَ وَلَا اِلٰهَ غَيْرُكَ',
      lat: 'Sübhânekellâhümme ve bi hamdik ve tebârakesmük ve teâlâ ceddük ve lâ ilâhe ğayruk.',
      mean: 'Allah\'ım! Seni her türlü eksiklikten uzak tutar, seni överim. Senin adın çok yücedir. Şanın çok üstündür. Senden başka ilah yoktur.' },
    { id: 'euzu', title: 'Eûzü', ar: 'اَعُوذُ بِاللّٰهِ مِنَ الشَّيْطَانِ الرَّجِيمِ', lat: 'Eûzü billâhi mineş-şeytânir-racîm.', mean: 'Kovulmuş şeytandan Allah\'a sığınırım.' },
    { id: 'besmele', title: 'Besmele', basmala: true, lat: 'Bismillâhirrahmânirrahîm.', mean: 'Rahmân ve Rahîm olan Allah\'ın adıyla.' },
    { id: 'ruku', title: 'Rükû tesbihi', ar: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ', lat: 'Sübhâne rabbiye\'l-azîm.', mean: 'Yüce Rabbimi her türlü eksiklikten uzak tutarım.' },
    { id: 'semiallah', title: 'Kavme', ar: 'سَمِعَ اللّٰهُ لِمَنْ حَمِدَهُ ‧ رَبَّنَا لَكَ الْحَمْدُ', lat: 'Semiallâhü limen hamideh. Rabbenâ leke\'l-hamd.', mean: 'Allah kendisine hamd edeni işitir. Rabbimiz! Hamd sana mahsustur.' },
    { id: 'secde', title: 'Secde tesbihi', ar: 'سُبْحَانَ رَبِّيَ الْاَعْلٰى', lat: 'Sübhâne rabbiye\'l-a\'lâ.', mean: 'En yüce olan Rabbimi her türlü eksiklikten uzak tutarım.' },
    { id: 'tahiyyat', title: 'Ettehiyyâtü', ar: 'اَلتَّحِيَّاتُ لِلّٰهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ اَلسَّلَامُ عَلَيْكَ اَيُّهَا النَّبِيُّ وَرَحْمَةُ اللّٰهِ وَبَرَكَاتُهُ اَلسَّلَامُ عَلَيْنَا وَعَلٰى عِبَادِ اللّٰهِ الصَّالِحِينَ اَشْهَدُ اَنْ لَا اِلٰهَ اِلَّا اللّٰهُ وَاَشْهَدُ اَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
      lat: 'Ettehiyyâtü lillâhi vessalevâtü vettayyibât. Esselâmü aleyke eyyühen-nebiyyü ve rahmetullâhi ve berekâtüh. Esselâmü aleynâ ve alâ ıbâdillâhis-sâlihîn. Eşhedü en lâ ilâhe illallâh ve eşhedü enne Muhammeden abdühû ve rasûlüh.',
      mean: 'Bütün ibadetler Allah\'a mahsustur. Ey Peygamber! Allah\'ın selamı, rahmeti ve bereketi senin üzerine olsun. Selam bizim ve Allah\'ın iyi kullarının üzerine olsun. Şahitlik ederim ki Allah\'tan başka ilah yoktur ve Muhammed O\'nun kulu ve elçisidir.' },
    { id: 'salli', title: 'Allâhümme Salli', ar: 'اَللّٰهُمَّ صَلِّ عَلٰى مُحَمَّدٍ وَعَلٰى اٰلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلٰى اِبْرَاهِيمَ وَعَلٰى اٰلِ اِبْرَاهِيمَ اِنَّكَ حَمِيدٌ مَجِيدٌ',
      lat: 'Allâhümme salli alâ Muhammedin ve alâ âli Muhammed. Kemâ salleyte alâ İbrâhîme ve alâ âli İbrâhîm. İnneke hamîdün mecîd.',
      mean: 'Allah\'ım! Muhammed\'e ve ailesine rahmet eyle; İbrahim\'e ve ailesine rahmet ettiğin gibi. Şüphesiz sen övülmeye layıksın, şanı yücesin.' },
    { id: 'barik', title: 'Allâhümme Bârik', ar: 'اَللّٰهُمَّ بَارِكْ عَلٰى مُحَمَّدٍ وَعَلٰى اٰلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلٰى اِبْرَاهِيمَ وَعَلٰى اٰلِ اِبْرَاهِيمَ اِنَّكَ حَمِيدٌ مَجِيدٌ',
      lat: 'Allâhümme bârik alâ Muhammedin ve alâ âli Muhammed. Kemâ bârekte alâ İbrâhîme ve alâ âli İbrâhîm. İnneke hamîdün mecîd.',
      mean: 'Allah\'ım! Muhammed\'e ve ailesine bereket ver; İbrahim\'e ve ailesine bereket verdiğin gibi. Şüphesiz sen övülmeye layıksın, şanı yücesin.' },
    { id: 'rabbena1', title: 'Rabbenâ Âtinâ', quran: '2:201', from: 4, lat: 'Rabbenâ âtinâ fi\'d-dünyâ haseneten ve fi\'l-âhirati haseneten ve kınâ azâbe\'n-nâr.',
      mean: 'Rabbimiz! Bize dünyada da iyilik ver, ahirette de iyilik ver. Bizi cehennem azabından koru. (Bakara, 201)' },
    { id: 'rabbena2', title: 'Rabbenağfirlî', quran: '14:41', from: 1, lat: 'Rabbenağfirlî ve li-vâlideyye ve li\'l-mü\'minîne yevme yekûmü\'l-hisâb.',
      mean: 'Rabbimiz! Hesap gününde beni, anamı, babamı ve bütün müminleri bağışla. (İbrâhîm, 41)' },
    { id: 'selam', title: 'Selam', ar: 'اَلسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللّٰهِ', lat: 'Esselâmü aleyküm ve rahmetullâh.', mean: 'Allah\'ın selamı ve rahmeti üzerinize olsun.' },
    { id: 'sehadet', title: 'Kelime-i Şehâdet', ar: 'اَشْهَدُ اَنْ لَا اِلٰهَ اِلَّا اللّٰهُ وَاَشْهَدُ اَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
      lat: 'Eşhedü en lâ ilâhe illallâh ve eşhedü enne Muhammeden abdühû ve rasûlüh.', mean: 'Şahitlik ederim ki Allah\'tan başka ilah yoktur. Yine şahitlik ederim ki Muhammed O\'nun kulu ve elçisidir.' },
  ];
  // Kur'an'dan olan duaların metni âyet verisinden alınır (doğruluk için).
  DUAS.forEach((d) => {
    if (d.quran) {
      const v = K.QURAN_EXTRA[d.quran];
      d.words = v.w.filter((w) => w.i >= d.from);
      d.s = v.s; d.a = v.a; // metin, ayardaki yazım usulüne göre kelimelerden üretilir
    } else if (d.basmala) {
      d.words = K.BASMALA.w; d.s = 1; d.a = 1;
    }
  });
  // Gerçek hafız kayıtları (Türk usulü okuyuş). Konuşma tanıma ile metne göre doğrulandı.
  const AUD = {
    subhaneke: () => K.Q.DUA_AUDIO('Subhaneke.mp3'),
    tahiyyat: () => K.Q.DUA_AUDIO('Ettehiyyatu.mp3'),
    salli: () => K.Q.DUA_AUDIO('AllahummeSalli.mp3'),
    barik: () => K.Q.DUA_AUDIO('AllahummeBarik.mp3'),
    rabbena1: () => K.Q.DUA_AUDIO('RabbenaAtina.mp3'),
    rabbena2: () => K.Q.ayahUrls(14, 41, 'danis'),
    sehadet: () => K.Q.DUA_AUDIO('Ettehiyyatu.mp3', '36.2'),
    euzu: () => K.Q.EUZU_URLS,
    besmele: () => K.Q.ayahUrls(1, 1, 'danis'),
  };
  DUAS.forEach((d) => { if (AUD[d.id]) d.audio = AUD[d.id]; });
  // Diyanet İşleri Başkanlığı Elif-Ba CD'sindeki gömülü insan sesi kayıtları (öncelikli, internetsiz)
  const HVD = { tekbir: ['du_tekbir'], subhaneke: ['du_subhaneke'], euzu: ['du_euzu'], besmele: ['du_besmele'], ruku: ['du_ruku'],
    semiallah: ['du_semiallah', 'du_rabbenalek'], secde: ['du_secde'], tahiyyat: ['du_tahiyyat'], salli: ['du_salli'], barik: ['du_barik'],
    rabbena1: ['du_rabbena1'], rabbena2: ['du_rabbena2'], selam: ['du_selam'], sehadet: ['du_sehadet'] };
  DUAS.forEach((d) => { if (HVD[d.id]) d.hv = HVD[d.id]; });
  const DUA = {}; DUAS.forEach((d) => { DUA[d.id] = d; });

  // Anlatım sesi: "Namaz Hocası" sesli dersi (insan sesi); text alanı kayıtta söylenenin aynısıdır (K.HV_TEXT).
  const ABDEST = [
    { icon: '🤲', title: 'Niyet ve Besmele', text: 'Abdest almaya niyet ederiz ve Bismillâhirrahmânirrahîm deriz.', dua: 'besmele' },
    { icon: '👐', title: 'Ellerimizi yıkarız', text: 'Ellerimizi bileklerimizle birlikte üç kere yıkarız. Parmak aralarını ovalarız, yüzük varsa oynatırız.', count: 3 },
    { icon: '👄', title: 'Ağzımıza su veririz', text: 'Sağ avucumuzla ağzımıza üç kere su verip her seferinde iyice çalkalarız.', count: 3 },
    { icon: '👃', title: 'Burnumuza su çekeriz', text: 'Sağ avucumuzla burnumuza üç kere su çeker, sol elimizle burnumuzu temizleriz.', count: 3 },
    { icon: '😊', title: 'Yüzümüzü yıkarız', text: 'Saçlarımızın bittiği yerden çenemizin altına, bir kulak yumuşağından diğerine kadar yüzümüzü üç kere yıkarız.', count: 3 },
    { icon: '💪', title: 'Sağ kolumuzu yıkarız', text: 'Sağ kolumuzu dirseğimizle birlikte üç kere yıkarız. Kuru yer kalmaması için iyice ovalarız.', count: 3 },
    { icon: '💪', flip: true, title: 'Sol kolumuzu yıkarız', text: 'Sol kolumuzu da dirseğimizle birlikte üç kere yıkarız.', count: 3 },
    { icon: '🙆', title: 'Başımızı mesh ederiz', text: 'Ellerimizi yeniden ıslatırız. Sağ elimizin içini başımızın üzerine koyarak mesh ederiz.' },
    { icon: '👂', title: 'Kulaklarımızı mesh ederiz', text: 'Şehadet parmaklarımızla kulaklarımızın içini, başparmaklarımızla kulaklarımızın arkasını mesh ederiz.' },
    { icon: '🙇', title: 'Boynumuzu mesh ederiz', text: 'Ellerimizi yeniden ıslatmadan, parmaklarımızın dış yüzüyle boynumuzu mesh ederiz.' },
    { icon: '🦶', title: 'Sağ ayağımızı yıkarız', text: 'Sağ ayağımızı parmak uçlarından başlayarak topuğumuzla birlikte üç kere yıkarız. Parmak aralarını sol elimizin serçe parmağıyla temizleriz.', count: 3 },
    { icon: '🦶', flip: true, title: 'Sol ayağımızı yıkarız', text: 'Sol ayağımızı da parmak uçlarından başlayarak topuğumuzla birlikte üç kere yıkarız.', count: 3 },
    { icon: '☝️', title: 'Kelime-i şehâdet', text: 'Abdestimizi bitirince kıbleye dönüp Kelime-i şehâdet getiririz. Artık namaz kılmaya hazırız!', dua: 'sehadet' },
  ];

  ABDEST.forEach((st, i) => { st.hv = 'nh_ab' + i; if (K.HV_TEXT && K.HV_TEXT[st.hv]) { st.kid = st.text; st.text = K.HV_TEXT[st.hv]; } });

  // pose: tekbir | kiyam | ruku | kavme | secde | kade | selamR | selamL | niyet
  const NAMAZ = [
    { pose: 'niyet', title: 'Niyet', text: 'Kıbleye döneriz. Kalbimizle niyet ederiz: Niyet ettim Allah rızası için sabah namazının farzını kılmaya.' },
    { pose: 'tekbir', title: 'İftitah tekbiri', text: 'Avuçlarımız kıbleye dönük olarak ellerimizi kaldırır, Allâhü ekber deriz. Namaz başladı!', dua: 'tekbir',
      m: 'Erkekler ellerini, başparmakları kulak memelerine değecek şekilde kaldırır.', f: 'Kadınlar ellerini omuz hizasına kadar kaldırır.' },
    { pose: 'kiyam', title: 'Kıyam: Sübhâneke', text: 'Ellerimizi bağlarız. Gözümüz secde yerine bakar. Sübhâneke duasını okuruz.', dua: 'subhaneke',
      m: 'Erkekler sağ elini sol elinin üzerine koyup göbeğinin altında bağlar.', f: 'Kadınlar sağ elini sol elinin üzerine koyup göğsünün üzerinde bağlar.' },
    { pose: 'kiyam', title: 'Eûzü ve Besmele', text: 'Eûzü besmele çekeriz.', dua: 'euzu', dua2: 'besmele' },
    { pose: 'kiyam', title: 'Fâtiha sûresi', text: 'Fâtiha sûresini okuruz.', surah: 1 },
    { pose: 'kiyam', title: 'Bir sûre okuruz', text: 'Fâtiha\'dan sonra kısa bir sûre okuruz. Mesela Kevser sûresi.', surah: 108 },
    { pose: 'ruku', title: 'Rükû', text: 'Allâhü ekber diyerek eğiliriz. Ellerimizi dizlerimize koyarız. Üç kere okuruz.', dua: 'ruku', times: 3,
      m: 'Erkekler sırtını ve başını dümdüz yapar, parmaklarını açarak dizlerini kavrar.', f: 'Kadınlar biraz daha az eğilir, ellerini dizlerinin üzerine koyar.' },
    { pose: 'kavme', title: 'Kavme', text: 'Semiallâhü limen hamideh diyerek doğruluruz. Ayakta Rabbenâ leke\'l-hamd deriz.', dua: 'semiallah' },
    { pose: 'secde', title: 'Secde', text: 'Allâhü ekber diyerek secdeye gideriz. Alnımız ve burnumuz yere değer, ellerimiz kulak hizasında yere konur. Üç kere okuruz.', dua: 'secde', times: 3,
      m: 'Erkekler kollarını yanlarından ayırır, dirseklerini yerden kaldırır, ayak parmaklarını kıbleye doğru diker.', f: 'Kadınlar kollarını yanlarına bitiştirir, dirseklerini yere koyar ve karınlarını uyluklarına yaklaştırır.' },
    { pose: 'kade', title: 'Celse', text: 'Allâhü ekber diyerek otururuz ve biraz bekleriz.', dua: 'tekbir',
      m: 'Erkekler sol ayağını yatırıp üzerine oturur, sağ ayağını diker.', f: 'Kadınlar ayaklarını sağ taraftan çıkararak yere oturur.' },
    { pose: 'secde', title: 'İkinci secde', text: 'Allâhü ekber diyerek tekrar secdeye gideriz ve yine üç kere okuruz.', dua: 'secde', times: 3 },
    { pose: 'kiyam', title: 'İkinci rekât', text: 'Allâhü ekber diyerek ayağa kalkarız. Besmele, Fâtiha ve bir sûre okuruz. Mesela İhlâs. Sonra yine rükû ve secdeleri yaparız.', surah: 112 },
    { pose: 'kade', title: 'Son oturuş', text: 'Otururuz, ellerimizi uyluklarımızın üzerine koyarız. Ettehiyyâtü, Allâhümme Salli, Allâhümme Bârik ve Rabbenâ dualarını okuruz.', dua: 'tahiyyat', more: ['salli', 'barik', 'rabbena1', 'rabbena2'],
      m: 'Erkekler sol ayağını yatırıp üzerine oturur, sağ ayağının parmaklarını kıbleye doğru diker.', f: 'Kadınlar ayaklarını sağ taraftan çıkararak yere oturur.' },
    { pose: 'selamR', title: 'Sağa selam', text: 'Başımızı sağ omzumuza doğru çevirip Esselâmü aleyküm ve rahmetullâh deriz.', dua: 'selam' },
    { pose: 'selamL', title: 'Sola selam', text: 'Sonra başımızı sol omzumuza çevirip yine selam veririz. Namazımız bitti. Allah kabul etsin!', dua: 'selam' },
  ];

  const VAKITLER = [
    { icon: '🌅', name: 'Sabah', parts: [['2 sünnet', 's'], ['2 farz', 'f']], text: 'Sabah namazı güneş doğmadan önce kılınır. İki rekât sünnet, iki rekât farzdır.' },
    { icon: '☀️', name: 'Öğle', parts: [['4 sünnet', 's'], ['4 farz', 'f'], ['2 son sünnet', 's']], text: 'Öğle namazı dört rekât sünnet, dört rekât farz ve iki rekât son sünnettir.' },
    { icon: '🌤️', name: 'İkindi', parts: [['4 sünnet', 's'], ['4 farz', 'f']], text: 'İkindi namazı dört rekât sünnet ve dört rekât farzdır.' },
    { icon: '🌇', name: 'Akşam', parts: [['3 farz', 'f'], ['2 sünnet', 's']], text: 'Akşam namazı güneş batınca kılınır. Üç rekât farz ve iki rekât sünnettir.' },
    { icon: '🌙', name: 'Yatsı', parts: [['4 sünnet', 's'], ['4 farz', 'f'], ['2 son sünnet', 's'], ['3 vitir', 'v']], text: 'Yatsı namazı dört rekât sünnet, dört rekât farz, iki rekât son sünnet ve üç rekât vitir namazıdır.' },
  ];

  const ORDER_GAME = ['tekbir', 'kiyam', 'ruku', 'kavme', 'secde', 'kade'];
  const POSE_NAMES = { niyet: 'Niyet', tekbir: 'Tekbir', kiyam: 'Kıyam', ruku: 'Rükû', kavme: 'Kavme', secde: 'Secde', kade: 'Oturuş', selamR: 'Sağa selam', selamL: 'Sola selam' };

  // Namaz Hocası sesli dersinden cümleler (insan sesi). Cinsiyete göre farklı olan cümleler ayrı kayıttır.
  const NHV = [
    { a: ['nh_n_kible', 'nh_n_niyet'] },
    { m: ['nh_n_tekbir', 'nh_n_tekbir_m', 'nh_n_avuc'], f: ['nh_n_tekbir', 'nh_n_tekbir_f', 'nh_n_avuc'] },
    { m: ['nh_n_bag_m', 'nh_n_subhaneke'], f: ['nh_n_bag_f', 'nh_n_subhaneke'] },
    { a: ['nh_n_fatiha'] },
    { a: [] },
    { a: ['nh_n_sure'] },
    { m: ['nh_n_ruku', 'nh_n_ruku_m', 'nh_n_goz', 'nh_n_ruku3'], f: ['nh_n_ruku', 'nh_n_ruku_f', 'nh_n_goz', 'nh_n_ruku3'] },
    { a: ['nh_n_kavme', 'nh_n_kavme2'] },
    { a: ['nh_n_secde'], note: true },
    { a: ['nh_n_celse'], note: true },
    { a: ['nh_n_secde2'] },
    { a: ['nh_n_kalk', 'nh_n_rekat2'] },
    { a: ['nh_n_otur', 'nh_n_tahiyyat'], note: true },
    { a: ['nh_n_selam', 'nh_n_selam2'] },
    { a: ['nh_n_son'] },
  ];
  NAMAZ.forEach((st, i) => { st.nh = NHV[i]; });
  const gender = () => (K.Store && K.Store.s.settings.namazGender) || 'm';

  /** Adımın sesli anlatım kayıtları (cinsiyete göre). */
  function stepHv(st) {
    const v = st.nh || {};
    return (v.a || v[gender()] || []).filter((k) => K.HV_TEXT && K.HV_TEXT[k]);
  }
  /** Adımın anlatımı: kayıtta söylenenler; kayıt yoksa yazılı metin. */
  function stepText(st) {
    const hv = stepHv(st);
    if (hv.length) return hv.map((k) => K.HV_TEXT[k]).join(' ');
    const g = gender();
    return st.text + (st[g] ? ' ' + st[g] : '');
  }
  /** Kayıtta geçmeyen, cinsiyete özgü ek bilgi (yalnız yazılı gösterilir). */
  function stepNote(st) { return st.nh && st.nh.note ? st[gender()] || '' : ''; }

  K.NZ = { stepText, stepHv, stepNote, DUAS, DUA, ABDEST, NAMAZ, VAKITLER, ORDER_GAME, POSE_NAMES };
})();
