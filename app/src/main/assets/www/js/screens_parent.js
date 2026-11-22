/* Ebeveyn Paneli: rapor, seviye, ses ayarları, ses kayıt stüdyosu, çevrimdışı sesler, videolar, ekran süresi. */
window.K = window.K || {};
(function () {
  const { h, btn, iconBtn, R, topbar, toast } = K.UI;
  const S = K.Speech;
  const Screens = K.Screens = K.Screens || {};

  function card(title, ...kids) { return h('div', { class: 'card' }, h('h3', null, title), ...kids); }
  function field(label, control, small) { return h('div', { class: 'field' }, h('label', null, label, small ? h('small', null, small) : null), control); }
  function switchCtl(obj, key, onChange) {
    const i = h('input', { type: 'checkbox' }); i.checked = !!obj[key];
    i.addEventListener('change', () => { obj[key] = i.checked; K.Store.save(); onChange && onChange(i.checked); });
    return h('label', { class: 'switch' }, i, h('span'));
  }
  function selectCtl(obj, key, options, onChange) {
    const s = h('select', null, options.map(([v, l]) => h('option', { value: String(v) }, l)));
    s.value = String(obj[key]);
    s.addEventListener('change', () => { const raw = s.value; obj[key] = isNaN(+raw) || raw === '' ? raw : +raw; K.Store.save(); onChange && onChange(obj[key]); });
    return s;
  }
  const fmtMin = (sec) => Math.round(sec / 60) + ' dk';
  const fmtMB = (b) => (b / 1048576).toFixed(1) + ' MB';

  // ------------------------------------------------------------ kayıt satırı
  function recRow(key, ar, label, sub, fallback) {
    const status = h('span', { class: 'has' }, K.N.recHas(key) ? '✔' : '');
    let recording = false;
    const recB = btn('⏺️', 'red small', async () => {
      if (!recording) {
        if (!(await K.N.recStart(key))) { toast('Mikrofon izni gerekiyor'); return; }
        recording = true; recB.textContent = '⏹️'; recB.classList.add('pulse'); status.textContent = '● kayıt';
      } else {
        recording = false; recB.textContent = '⏺️'; recB.classList.remove('pulse');
        const r = await K.N.recStop(key);
        status.textContent = r === 'saved' ? '✔' : '✖';
        if (r === 'saved') K.N.play('rec:' + key);
      }
    }, { 'aria-label': 'Kaydet' });
    const playB = btn('▶️', 'blue small', () => { if (K.N.recHas(key)) K.N.play('rec:' + key); else if (fallback) fallback(); }, { 'aria-label': 'Dinle' });
    const delB = btn('🗑️', 'white small', async () => { if (!K.N.recHas(key)) return; if (await K.UI.confirm('Kaydı sil', 'Bu kayıt silinsin mi?', 'Sil')) { K.N.recDelete(key); status.textContent = ''; } }, { 'aria-label': 'Sil' });
    return h('div', { class: 'rec-row' }, h('div', { class: 'ar', style: ar.length > 12 ? { fontSize: '22px', maxWidth: '45%', textAlign: 'right' } : null }, ar), h('div', { class: 'rl' }, label, sub ? h('small', null, sub) : null), status, recB, playB, delB);
  }

  function studio() {
    const s = K.Store.s;
    const { I, hareke, LETTERS } = K.L;
    const cats = [
      ['Harfler', () => LETTERS.map((L) => I.letter(L))],
      ['Üstün', () => hareke.map((L) => I.syl(L, 'u'))],
      ['Esre', () => hareke.map((L) => I.syl(L, 'e'))],
      ['Ötre', () => hareke.map((L) => I.syl(L, 'o'))],
      ['Cezm', () => hareke.flatMap((L) => ['u', 'e', 'o'].map((hh) => I.cezm(L, hh)))],
      ['Tenvin', () => hareke.flatMap((L) => ['u', 'e', 'o'].map((hh) => I.tenvin(L, hh)))],
      ['Şedde', () => hareke.filter((L) => L.id !== 'elif').map((L) => I.shadda(L))],
      ['Med', () => hareke.filter((L) => L.id !== 'elif').flatMap((L) => ['u', 'e', 'o'].map((hh) => I.med(L, hh)))],
      ['Kelimeler', () => K.C.LEVELS.filter((l) => ['hece', 'cezm', 'tenvin', 'sedde', 'med'].includes(l.island)).flatMap((l) => l.items()).filter((x) => x.kind === 'word')],
      ['Dualar', null],
      ['Sûreler', null],
    ];
    let cur = 0, surahN = 1;
    const tabs = h('div', { class: 'cat-tabs' });
    const body = h('div');
    function render() {
      tabs.innerHTML = '';
      cats.forEach(([name], i) => tabs.append(h('button', { class: i === cur ? 'on' : '', onTap: () => { cur = i; render(); } }, name)));
      body.innerHTML = '';
      const [name, fn] = cats[cur];
      if (fn) {
        const seen = new Set();
        fn().forEach((it) => { if (seen.has(it.key)) return; seen.add(it.key); body.append(recRow(it.key, it.ar, it.label || '', it.spell || '', () => S.item(it))); });
      } else if (name === 'Dualar') {
        K.NZ.DUAS.forEach((d) => body.append(recRow('dua_' + d.id, K.NamazUI.duaText(d).split(' ').slice(0, 3).join(' ') + '…', d.title, d.lat.slice(0, 40) + '…', () => K.NamazUI.playDua(d))));
      } else {
        const sel = h('select', null, K.SURAHS.map((su) => h('option', { value: su.n }, su.tr)));
        sel.value = surahN;
        sel.addEventListener('change', () => { surahN = +sel.value; render(); });
        body.append(field('Sûre', sel));
        if (surahN !== 1) body.append(recRow(K.Q.ayahKey(1, 1), 'بِسْمِ اللّٰهِ…', 'Besmele', 'Tüm sûrelerin başında çalar', () => S.ayah(1, 1)));
        K.Q.surah(surahN).v.forEach((v) => body.append(recRow(K.Q.ayahKey(surahN, v.a), v.w.slice(0, 3).map((w) => K.Q.text(w)).join(' ') + (v.w.length > 3 ? '…' : ''), v.a + '. âyet', '', () => S.ayah(surahN, v.a))));
      }
    }
    render();
    const nameIn = h('input', { type: 'text', value: s.settings.teacherName || '' });
    nameIn.addEventListener('change', () => { s.settings.teacherName = nameIn.value.trim() || 'Hoca'; K.Store.save(); });
    return card('🎙️ Ses Kayıt Stüdyosu',
      h('p', { class: 'help' }, 'Musa Coşkun Hoca\'nın (veya sizin) sesinizle harfleri, heceleri, kelimeleri, duaları ve sûre âyetlerini kaydedin. Kayıtlar uygulamanın her yerinde öncelikli olarak çalınır — kurstaki öğretmenin okuyuşuyla birebir uyum sağlar.'),
      field('Kayıt sahibinin adı', nameIn, 'Sûre ekranında bu adla görünür'),
      field('Kayıtlı sesleri öncelikle kullan', switchCtl(s.settings, 'useRec')),
      tabs, body);
  }

  function offline() {
    const s = K.Store.s;
    const info = h('p', { class: 'help' }, 'Önbellek: ' + fmtMB(K.N.cacheSize()));
    const prog = h('div', { style: { fontWeight: 800, minHeight: '20px' } });
    let busy = false;
    async function run(list, label) {
      if (busy) return; if (!K.N.isOnline()) { toast('İnternet bağlantısı yok'); return; }
      busy = true; prog.textContent = label + ': başlıyor...';
      const r = await K.N.prefetch(list, (d, t, f) => { prog.textContent = `${label}: ${d} / ${t}` + (f ? ` (${f} hata)` : ''); });
      busy = false;
      prog.textContent = r.offline ? 'Bu özellik yalnızca Android uygulamasında çalışır.' : `${label}: ${r.ok} dosya hazır` + (r.fail ? `, ${r.fail} indirilemedi` : ' ✔️');
      info.textContent = 'Önbellek: ' + fmtMB(K.N.cacheSize());
    }
    const ayahList = () => { const l = [K.Q.ayahUrls(1, 1)]; K.SURAHS.forEach((su) => su.v.forEach((v) => l.push(K.Q.ayahUrls(su.n, v.a)))); Object.values(K.QURAN_EXTRA).forEach((v) => l.push(K.Q.ayahUrls(v.s, v.a))); return l; };
    const wordList = () => {
      const l = [];
      K.BASMALA.w.forEach((w) => l.push(K.Q.wordUrls(1, 1, w.i)));
      K.SURAHS.forEach((su) => su.v.forEach((v) => v.w.forEach((w) => l.push(K.Q.wordUrls(su.n, v.a, w.i)))));
      Object.values(K.QURAN_EXTRA).forEach((v) => v.w.forEach((w) => l.push(K.Q.wordUrls(v.s, v.a, w.i))));
      return l;
    };
    return card('📥 İnternetsiz Kullanım',
      h('p', { class: 'help' }, 'Kur\'an sesleri ilk çalındığında internetten indirilir ve saklanır. Aşağıdaki düğmelerle tüm sesleri önceden indirerek uygulamayı internetsiz kullanabilirsiniz.'),
      field('Kâri', selectCtl(s.settings, 'reciter', K.Q.RECITERS.map((r) => [r.id, r.name + ' – ' + r.sub]))),
      h('div', { class: 'action-row', style: { justifyContent: 'flex-start' } },
        btn('🎧 Sûre seslerini indir', 'green small', () => run(ayahList(), 'Âyetler')),
        btn('🔤 Kelime seslerini indir', 'purple small', () => run(wordList(), 'Kelimeler')),
        btn('🧹 Temizle', 'white small', async () => { if (await K.UI.confirm('Önbelleği temizle', 'İndirilen sesler silinsin mi?', 'Sil')) { K.N.clearCache(); info.textContent = 'Önbellek: ' + fmtMB(K.N.cacheSize()); } })),
      prog, info);
  }

  function videosCard() {
    const s = K.Store.s;
    const box = h('div');
    function render() {
      box.innerHTML = '';
      ['musa', 'namaz'].forEach((cat) => {
        box.append(h('div', { style: { fontWeight: 800, margin: '8px 0 2px' } }, cat === 'musa' ? 'Hocamızdan Dinle' : 'Namaz Videoları'));
        s.customVideos.filter((v) => v.cat === cat).forEach((v) => box.append(h('div', { class: 'field' }, h('label', null, '⭐ ' + v.title, h('small', null, v.id)),
          btn('Sil', 'white small', () => { s.customVideos = s.customVideos.filter((x) => x !== v); K.Store.save(); render(); }))));
        (K.Q.VIDEOS[cat] || []).forEach((v) => {
          const id = v.id || v.url;
          const shown = !s.hiddenVideos.includes(id);
          const i = h('input', { type: 'checkbox' }); i.checked = shown;
          i.addEventListener('change', () => { s.hiddenVideos = i.checked ? s.hiddenVideos.filter((x) => x !== id) : [...s.hiddenVideos, id]; K.Store.save(); });
          box.append(h('div', { class: 'field' }, h('label', null, v.title, h('small', null, v.sub || '')), h('label', { class: 'switch' }, i, h('span'))));
        });
      });
    }
    render();
    const tIn = h('input', { type: 'text', placeholder: 'Başlık (ör. Musa Coşkun – Fâtiha)' });
    const uIn = h('input', { type: 'text', placeholder: 'YouTube bağlantısı' });
    const cat = h('select', null, h('option', { value: 'musa' }, 'Hocamızdan Dinle'), h('option', { value: 'namaz' }, 'Namaz Videoları'));
    return card('🎬 Videolar',
      h('p', { class: 'help' }, 'Musa Coşkun Hoca\'nın web\'de bulunan tilavetleri ve Diyanet Çocuk\'un namaz videoları eklidir. Yeni bir YouTube videosu ekleyebilir ya da var olanları gizleyebilirsiniz.'),
      box,
      h('div', { style: { display: 'grid', gap: '8px', marginTop: '10px' } }, tIn, uIn, cat,
        btn('➕ Video ekle', 'green small', () => {
          const id = K.Q.parseYouTube(uIn.value);
          if (!id) { toast('Geçerli bir YouTube bağlantısı girin'); return; }
          s.customVideos.unshift({ id, title: tIn.value.trim() || 'Video', cat: cat.value, sub: 'Ebeveyn ekledi' });
          K.Store.save(true); tIn.value = ''; uIn.value = ''; render(); toast('Video eklendi ✔️');
        })));
  }

  function photosCard() {
    const s = K.Store.s;
    s.photos = s.photos || {};
    let g = s.settings.namazGender || 'm';
    const box = h('div');
    function render() {
      box.innerHTML = '';
      const have = new Set(K.N.imageList());
      const seg = h('div', { class: 'cat-tabs' }, [['m', '👦 Erkek'], ['f', '👧 Kadın']].map(([v, l]) => h('button', { class: g === v ? 'on' : '', onTap: () => { g = v; render(); } }, l)));
      box.append(seg);
      const row = (key, title, svg) => {
        const thumb = have.has(key) && s.photos[key]
          ? h('img', { src: K.N.imageUrl(key, s.photos[key]), style: { width: '64px', height: '64px', objectFit: 'cover', borderRadius: '12px' } })
          : h('div', { style: { width: '64px', height: '64px' }, html: svg.replace('<svg ', '<svg width="64" height="64" ') });
        return h('div', { class: 'rec-row' }, thumb, h('div', { class: 'rl' }, title, h('small', null, have.has(key) ? '📷 Fotoğraf kullanılıyor' : 'Çizim kullanılıyor')),
          btn('📷', 'blue small', async () => {
            const data = await K.UI.pickImage();
            if (!data) return;
            if (K.N.saveImage(key, data)) { s.photos[key] = Date.now(); K.Store.save(true); toast('Fotoğraf eklendi ✔️'); render(); } else toast('Kaydedilemedi');
          }, { 'aria-label': 'Fotoğraf seç' }),
          have.has(key) ? btn('🗑️', 'white small', () => { K.N.deleteImage(key); delete s.photos[key]; K.Store.save(); render(); }, { 'aria-label': 'Sil' }) : null);
      };
      box.append(h('div', { style: { fontWeight: 800, margin: '8px 0 2px' } }, '🧎 Namaz adımları'));
      K.NZ.NAMAZ.forEach((st, i) => box.append(row(`nz_${g}_${i}`, `${i + 1}. ${st.title}`, K.Fig.poseSvg(st.pose, { gender: g }))));
      box.append(h('div', { style: { fontWeight: 800, margin: '12px 0 2px' } }, '💧 Abdest adımları'));
      K.NZ.ABDEST.forEach((st, i) => box.append(row(`ab_${g}_${i}`, `${i + 1}. ${st.title}`, K.Fig.abdestSvg(i, g))));
    }
    const card0 = card('📷 Gerçek Fotoğraflar',
      h('p', { class: 'help' }, 'İsterseniz namaz ve abdest adımlarındaki çizimlerin yerine kendi çektiğiniz gerçek fotoğrafları koyabilirsiniz (örneğin Musa Hoca\'nın ya da aile büyüklerinin her duruşu gösterdiği fotoğraflar). Fotoğrafı önce telefonun kamerasıyla çekin, sonra buradan seçin.'),
      box);
    // ağır listeyi kart açıldığında çiz
    const open = btn('Fotoğrafları düzenle', 'white small', () => { open.remove(); render(); });
    card0.append(open);
    return card0;
  }

  function updateCard() {
    const box = h('div');
    const RES = { uptodate: '✔️ Güncel', installing: '⏳ Kuruluyor…', ready: '📦 Yeni sürüm indirildi; uygulama kapatılınca kurulacak',
      confirm: '👆 Onay bekleniyor — bildirime dokunun', installed: '✔️ Son güncelleme kuruldu', busy: '⏳ Denetleniyor…' };
    const resText = (r) => !r ? '—' : r.startsWith('error:') ? '⚠️ ' + r.slice(6) : (RES[r] || r);
    async function render(busyMsg) {
      const st = K.N.updStatus();
      box.innerHTML = '';
      if (!st) { box.append(h('p', { class: 'help' }, 'Bu bölüm yalnızca telefondaki Android uygulamasında çalışır.')); return; }
      const fmt = (t) => (t ? new Date(t).toLocaleString('tr-TR') : 'henüz denetlenmedi');
      const auto = h('input', { type: 'checkbox' }); auto.checked = !!st.auto;
      auto.addEventListener('change', () => { K.N.updSetAuto(auto.checked); toast(auto.checked ? 'Otomatik güncelleme açık' : 'Otomatik güncelleme kapalı'); });
      box.append(
        field('Yüklü sürüm', h('b', null, `${st.installedName} (${st.installedCode})`)),
        field('En son sürüm', h('b', null, st.latestCode ? `${st.latestName} (${st.latestCode})` : '—')),
        field('Son denetim', h('span', null, fmt(st.lastCheck))),
        field('Durum', h('span', null, busyMsg || resText(st.lastResult))),
        field('Her gün otomatik denetle ve kur', h('label', { class: 'switch' }, auto, h('span'))));
      if (st.notes) box.append(h('p', { class: 'help', style: { marginTop: '8px' } }, '🆕 ' + st.notes));
      if (!st.canInstall) box.append(h('div', { class: 'note' }, '⚠️ Güncellemelerin kurulabilmesi için bu uygulamaya "Bilinmeyen uygulamaları yükleme" izni verin.'),
        btn('🔓 Yükleme izni ver', 'orange small', () => K.N.openInstallPermission()));
      if (!st.notifOk) box.append(h('div', { class: 'note' }, 'Güncelleme onayı gerektiğinde haber verebilmemiz için bildirim izni verin.'),
        btn('🔔 Bildirim izni ver', 'white small', async () => { await K.N.requestNotif(); render(); }));
      box.append(h('div', { class: 'action-row', style: { justifyContent: 'flex-start' } },
        btn('🔄 Şimdi denetle', 'blue small', async () => { render('⏳ Denetleniyor…'); const r = await K.N.updCheck(); render(resText(r)); }),
        st.pending ? btn('⬇️ Şimdi kur', 'green small', async () => { await K.N.updInstall(); render(); }) : null));
    }
    render();
    const c = card('🔄 Otomatik Güncelleme',
      h('p', { class: 'help' }, 'Uygulama her gün github.com/abdurrahmancosk/kuran-yolculugum adresindeki yeni sürümü denetler. Yeni sürüm indirilip doğrulanır; çocuk oyunun ortasında kesilmesin diye uygulama kapatıldığında kurulur. Android 12 ve üzerinde ilk güncellemede bir kez onay istenir, sonrakiler kendiliğinden kurulur. Daha eski Android sürümlerinde her güncellemede bildirime dokunup onay vermek gerekir.'),
      box);
    c.id = 'update-card';
    return c;
  }

  function report() {
    const s = K.Store.s;
    const done = K.C.LEVELS.filter((l) => s.levels[l.id] && s.levels[l.id].done).length;
    const memo = Object.values(s.surahs).filter((x) => x.memo).length;
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); days.push([d.toLocaleDateString('tr-TR', { weekday: 'short' }), s.days[k] || 0]); }
    const max = Math.max(60, ...days.map((d) => d[1]));
    const weak = Object.entries(s.letterStats).map(([id, st]) => ({ id, st, rate: st.bad / Math.max(1, st.ok + st.bad) })).filter((x) => x.st.bad >= 2 && K.L.BY[x.id]).sort((a, b) => b.rate - a.rate).slice(0, 6);
    return card('📊 İlerleme Raporu',
      h('div', { class: 'stat-grid' },
        h('div', { class: 'stat' }, h('b', null, String(K.Store.totalStars())), h('span', null, 'yıldız')),
        h('div', { class: 'stat' }, h('b', null, `${done}/${K.C.LEVELS.length}`), h('span', null, 'ders')),
        h('div', { class: 'stat' }, h('b', null, String(s.stickers.length)), h('span', null, 'çıkartma')),
        h('div', { class: 'stat' }, h('b', null, fmtMin(K.Store.todaySecs())), h('span', null, 'bugün')),
        h('div', { class: 'stat' }, h('b', null, '🔥' + (s.streak.count || 0)), h('span', null, 'gün seri')),
        h('div', { class: 'stat' }, h('b', null, String(memo)), h('span', null, 'ezber sûre'))),
      h('div', { style: { fontWeight: 800, margin: '12px 0 0' } }, 'Son 7 gün (dakika)'),
      h('div', { class: 'bars' }, days.map(([l, v]) => h('div', null, h('small', null, v ? Math.round(v / 60) : ''), h('i', { style: { height: Math.max(2, v / max * 70) + 'px' } }), h('small', null, l)))),
      h('div', { style: { fontWeight: 800, margin: '12px 0 4px' } }, 'Bölümler'),
      ...K.C.ISLANDS.map((isl) => { const p = K.C.islandProgress(isl.id); return h('div', { class: 'isl-prog' }, h('span', { style: { width: '150px' } }, isl.icon + ' ' + isl.name), h('div', { class: 'bar' }, h('i', { style: { width: (p.done / p.total * 100) + '%' } })), h('span', null, `${p.done}/${p.total}`)); }),
      weak.length ? h('div', null, h('div', { style: { fontWeight: 800, margin: '12px 0 6px' } }, 'Zorlandığı harfler (tekrar önerilir)'),
        h('div', { class: 'weak-list' }, weak.map((x) => h('span', null, K.L.BY[x.id].ar, ' ', h('small', null, `%${Math.round(x.rate * 100)}`))))) : null);
  }

  function levelCard() {
    const s = K.Store.s;
    const jump = h('select', null, K.C.ISLANDS.map((i) => h('option', { value: i.id }, i.icon + ' ' + i.name)));
    return card('🎯 Kurs Seviyesi',
      h('p', { class: 'help' }, 'Çocuğunuz kursta ilerideyse, o bölüme kadar olan dersleri tamamlanmış sayabilir veya tüm dersleri açabilirsiniz.'),
      field('Tüm dersleri aç', switchCtl(s.settings, 'unlockAll')),
      field('Şu bölüme geç', h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, jump, btn('Geç', 'purple small', async () => {
        if (await K.UI.confirm('Bölüme geç', 'Seçilen bölümden önceki dersler tamamlanmış sayılacak.', 'Tamam')) { K.C.jumpTo(jump.value); toast('Tamamlandı ✔️'); }
      }))));
  }

  function soundCard() {
    const s = K.Store.s;
    const st = h('div', { class: 'help', style: { fontWeight: 700 } });
    const refresh = () => {
      const i = K.N.ttsInfo();
      if (!K.N.isAndroid) { st.textContent = 'Tarayıcı modu: sesler tarayıcının konuşma motoruyla çalışır.'; return; }
      const tr = K.N.ttsLangOk('tr'), ar = K.N.ttsLangOk('ar');
      st.innerHTML = '';
      st.append(`Türkçe ses: ${tr ? '✔️ hazır' : '❌ yok'} · Arapça ses: ${ar ? '✔️ hazır' : '❌ yok (isteğe bağlı)'}`, i.engine ? h('small', { style: { display: 'block' } }, 'Motor: ' + i.engine) : '');
    };
    refresh();
    const rate = h('input', { type: 'range', min: 0.6, max: 1.3, step: 0.05, value: s.settings.rate });
    rate.addEventListener('change', () => { s.settings.rate = +rate.value; K.Store.save(); S.say('Ses hızı böyle olacak.'); });
    // yedek (telefon) sesi seçimi
    const voices = K.N.ttsVoices('tr');
    const vSel = h('select', null, h('option', { value: '' }, 'Otomatik (erkek sesi tercih edilir)'), voices.map((v, i) => h('option', { value: v.name }, `Ses ${i + 1}${v.net ? ' (internet)' : ''}${v.ok ? '' : ' – yüklü değil'}`)));
    vSel.value = K.N.ttsGetVoice('tr') || '';
    vSel.addEventListener('change', () => { K.N.ttsSetVoice('tr', vSel.value); setTimeout(() => K.N.speakDevice('Merhaba, ben Hüdhüd. Sesim böyle olacak.', 'tr'), 400); });
    return card('🔊 Ses ve Okunuş',
      h('p', { class: 'help' }, 'Uygulamadaki anlatımlar, önceden kaydedilmiş doğal bir erkek sesiyle uygulamanın içinde hazır gelir (internet gerekmez). Telefonun kendi konuşma motoru yalnızca listede olmayan nadir cümleler için yedek olarak kullanılır.'),
      st,
      voices.length ? field('Yedek ses (telefonun sesi)', h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, vSel, btn('▶', 'blue small', () => K.N.speakDevice('Merhaba, ben Hüdhüd. Sesim böyle olacak.', 'tr'))), 'Erkek sesi olanı seçin') : null,
      h('div', { class: 'action-row', style: { justifyContent: 'flex-start' } },
        btn('🔈 Sesi test et', 'blue small', () => { S.say('Esselâmü aleyküm! Ben Hüdhüd.'); setTimeout(refresh, 1500); }),
        btn('⚙️ Ses ayarları', 'white small', () => K.N.openTtsSettings()),
        btn('⬇️ Ses paketi yükle', 'white small', () => K.N.installTtsData()),
        btn('🔄 Yenile', 'white small', () => { K.N.ttsReinit(); setTimeout(refresh, 2000); })),
      field('Konuşma hızı', rate),
      field('Hece seslendirme', selectCtl(s.settings, 'sylMode', [['tr', 'Kurs usulü (be, bi, bü)'], ['ar', 'Arapça ses motoru']]), 'Arapça seçilirse, Arapça ses paketi gerekir'),
      field('Ötre okunuşu (ince harflerde)', selectCtl(s.settings, 'otre', [['ü', 'ü (bü, tü)'], ['u', 'u (bu, tu)']]), 'Kurstaki öğretmenin okuttuğu gibi seçin'),
      field('Kur\'an yazımı', selectCtl(s.settings, 'script', [['tr', 'Türkiye mushafı usulü'], ['std', 'Standart (Tanzil)']]), 'Türkiye usulü: hemzesiz elif, "Allah" lafzında çeker'),
      field('Tilavet hızı', selectCtl(s.settings, 'speed', [[0.75, 'Yavaş'], [1, 'Normal']])),
      field('Efekt sesleri', switchCtl(s.settings, 'sfx')),
      field('Titreşim', switchCtl(s.settings, 'vibrate')));
  }

  Screens.parent = function (params = {}) {
    const s = K.Store.s;
    const nameIn = h('input', { type: 'text', value: s.profile.name || '', placeholder: 'Ad' });
    nameIn.addEventListener('change', () => { s.profile.name = nameIn.value.trim().slice(0, 24); K.Store.save(); });
    const el = h('div', { class: 'screen parent' }, topbar('Ebeveyn Paneli', { sub: 'Ayarlar ve rapor', hideStars: true }),
      h('div', { class: 'scroll' },
        card('👦 Çocuk', field('Adı', nameIn, 'Hüdhüd çocuğa adıyla seslenir')),
        report(),
        updateCard(),
        levelCard(),
        photosCard(),
        soundCard(),
        studio(),
        offline(),
        videosCard(),
        card('⏱️ Ekran Süresi', h('p', { class: 'help' }, 'Günlük süre dolunca Hüdhüd "uyur" ve uygulama mola ekranına geçer. Ebeveyn girişiyle 30 dakika ek süre verilebilir.'),
          field('Günlük sınır', selectCtl(s.settings, 'dailyLimit', [[0, 'Sınırsız'], [10, '10 dakika'], [15, '15 dakika'], [20, '20 dakika'], [30, '30 dakika'], [45, '45 dakika'], [60, '1 saat']])),
          field('Bugün kullanılan', h('b', null, fmtMin(K.Store.todaySecs())))),
        card('📚 Kaynaklar',
          h('p', { class: 'help' }, 'Müfredat: Diyanet İşleri Başkanlığı Kur\'an kursu Elif-Ba sırası (harfler, şekiller, harekeler, cezm, tenvin, şedde, med). Kur\'an metni: Tanzil projesi (değiştirilmeden; Türkiye usulü yazım yalnızca gösterim ayarıdır). Meal: Diyanet İşleri Başkanlığı. Tilavet sesleri: everyayah.com, islamic.network; kelime sesleri: quran.com. Namaz kılınışı: Diyanet İlmihali. Videolar: YouTube (Musa Coşkun Hoca tilavetleri, Diyanet Çocuk). Yazı tipleri: Scheherazade New, Amiri Quran, Baloo 2 (SIL OFL).'),
          h('p', { class: 'help' }, 'Sürüm ' + K.N.version())),
        card('⚠️ Sıfırla', h('p', { class: 'help' }, 'Tüm ilerleme, yıldız ve çıkartmalar silinir. Ayarlar ve ses kayıtları korunur.'),
          btn('İlerlemeyi sıfırla', 'red small', async () => { if (await K.UI.confirm('Emin misiniz?', 'Tüm ilerleme silinecek.', 'Sıfırla')) { K.Store.reset(); toast('Sıfırlandı'); R.home(); } }))));
    return {
      el,
      onEnter() {
        K.Speech.setCoach(null);
        if (params.focus === 'update') { const u = el.querySelector('#update-card'); if (u) u.scrollIntoView({ block: 'start' }); }
      },
    };
  };
})();
