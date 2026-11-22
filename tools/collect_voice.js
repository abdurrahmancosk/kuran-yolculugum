// Uygulamanın söyleyebileceği tüm cümleleri toplar → tools/voice_inventory.json
// Kullanım: (cd app/src/main/assets/www && python3 -m http.server 8765) & ; node tools/collect_voice.js tools/voice_inventory.json
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 412, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  await p.addInitScript(() => { localStorage.setItem('ky_state', JSON.stringify({ onboarded: true, profile: { name: '' }, settings: { unlockAll: true } })); });
  await p.goto('http://localhost:8765/index.html');
  await p.waitForTimeout(1000);
  await p.evaluate(() => {
    window.__said = new Set();
    K.onSpeak = (t, l) => window.__said.add(l + '\u0001' + t);
    K.VOICE = { has: () => true };
    K.N.play = () => new Promise((r) => setTimeout(() => r('end'), 5));
    K.N.recStart = async () => true; K.N.recStop = async () => 'saved';
  });
  const autoplay = async (id) => {
    await p.evaluate((id) => K.Games.start(id), id);
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      await p.waitForTimeout(60);
      const r = await p.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const vis = (e) => e && e.offsetParent !== null;
        if (q('.celebrate')) return 'celebrate';
        let e;
        // yanlış seçenekleri de dene (geri bildirim cümleleri için)
        const wrong = q('.choice:not([data-ok="1"]):not(.bad)');
        if (wrong && !q('.choice.ok') && Math.random() < 0.3) { wrong.click(); return 'w'; }
        if ((e = q('.choice[data-ok="1"]')) && !q('.choice.ok')) { e.click(); return 'pick'; }
        const hw = q('.hareke-btn:not([data-ok="1"]):not(.bad)');
        if (hw && !q('.hareke-btn.ok') && Math.random() < 0.3) { hw.click(); return 'w'; }
        if ((e = q('.hareke-btn[data-ok="1"]')) && !q('.hareke-btn.ok')) { e.click(); return 'hareke'; }
        const tgt = q('.bal-target');
        if (tgt) { const all = [...document.querySelectorAll('.balloon:not(.popped)')]; const bs = all.filter(x => x.dataset.ar === tgt.textContent); const wr = all.filter(x => x.dataset.ar !== tgt.textContent); if (wr[0] && Math.random() < 0.2) wr[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); if (bs[0]) bs[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'balloons'; }
        const mc = [...document.querySelectorAll('.mcard:not(.matched):not(.open)')];
        if (mc.length && !document.querySelector('.mcard.open:not(.matched)')) { const a = mc[0]; const bb = mc.find(x => x !== a && x.dataset.pair === a.dataset.pair); a.click(); setTimeout(() => bb.click(), 40); return 'memory'; }
        if (mc.length) return 'mw';
        if ((e = q('.trace-wrap'))) { const s = [...document.querySelectorAll('button')].find(x => /Geç/.test(x.textContent)); s && s.click(); return 'trace'; }
        const hecele = [...document.querySelectorAll('button')].find(x => /Hecele/.test(x.textContent) && !x.dataset.done);
        if (hecele) { hecele.dataset.done = 1; hecele.click(); return 'hecele'; }
        const okBtns = [...document.querySelectorAll('button')].filter(x => /Okudum ✔️/.test(x.textContent) && vis(x));
        if (okBtns.length) { okBtns[0].click(); return 'read'; }
        const nx = [...document.querySelectorAll('button.btn.green.big')].find(x => /İleri|Tamam/.test(x.textContent) && !x.disabled);
        if (nx) { nx.click(); return 'next'; }
        return 'wait';
      });
      if (r === 'celebrate') { await p.waitForTimeout(150); break; }
    }
    await p.evaluate(() => K.UI.R.home());
  };
  const levels = await p.evaluate(() => K.C.LEVELS.map((l) => l.id));
  for (const otre of ['ü', 'u']) {
    await p.evaluate((o) => { K.Store.s.settings.otre = o; }, otre);
    for (const id of levels) { if (otre === 'u' && !/^(hareke|hece|cezm|tenvin|sedde|med|harf1$)/.test(id)) continue; await autoplay(id); }
  }
  await p.evaluate(() => { K.Store.s.settings.otre = 'ü'; });
  // ekranlar
  const screens = ['home', 'map', 'garden', 'namaz', 'playground', 'chart', 'stickers', 'hoca', 'diploma', 'rest', 'duas', 'vakitler', 'namazVideos', 'namazOrder'];
  for (const s of screens) { await p.evaluate((s) => K.UI.R.go(K.Screens[s]), s); await p.waitForTimeout(150); }
  await p.evaluate(() => { K.Store.s.greetedDay = ''; K.UI.R.go(K.Screens.home); }); await p.waitForTimeout(500);
  await p.evaluate(() => K.UI.R.go(K.Screens.chart, { trace: true })); await p.waitForTimeout(150);
  // namaz ve abdest adımları (iki cinsiyet)
  for (const g of ['m', 'f']) {
    await p.evaluate((g) => { K.Store.s.settings.namazGender = g; K.UI.R.go(K.Screens.namazSteps, { auto: false }); }, g);
    for (let i = 0; i < 16; i++) { await p.waitForTimeout(80); await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Sonraki|Bitti/.test(x.textContent)); b && b.click(); }); }
    await p.evaluate(() => K.UI.R.go(K.Screens.abdest));
    for (let i = 0; i < 14; i++) { await p.waitForTimeout(80); await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Sonraki|Bitti/.test(x.textContent)); b && b.click(); }); }
    await p.waitForTimeout(200);
  }
  // sûreler: her sûre, üç sekme
  const surahs = await p.evaluate(() => K.SURAHS.map((s) => s.n));
  for (const n of surahs) {
    await p.evaluate((n) => K.UI.R.go(K.Screens.surah, { n }), n); await p.waitForTimeout(80);
    for (const tab of ['🧠 Ezberle', '📖 Oku', '🎧 Dinle']) { await p.evaluate((t) => { const b = [...document.querySelectorAll('.tab')].find(x => x.textContent === t); b && b.click(); }, tab); await p.waitForTimeout(60); }
  }
  // programla sayılan kalıplar
  await p.evaluate(() => {
    const add = (t, l = 'tr') => window.__said.add(l + '\u0001' + t);
    const L = K.L, I = L.I;
    for (const otre of ['ü', 'u']) {
      K.Store.s.settings.otre = otre;
      L.LETTERS.forEach((Le) => {
        const it = I.letter(Le); add(it.say);
        [`Bu harfin adı ${it.label}.`, `Haydi sen de söyle: ${it.label}!`, `Hangisi ${it.label}?`, `Bu ${it.label}.`, `${it.label} harfi olan balonları patlat!`, `${it.label} harfi.`, `Parmağınla ${it.label} harfinin içini boya!`, `Şimdi ${it.label} harfi!`, it.tip].forEach((t) => add(t));
        if (!Le.noHareke) ['u', 'e', 'o'].forEach((h) => { [I.syl(Le, h), I.tenvin(Le, h), I.cezm(Le, h), I.med(Le, h)].forEach((x) => { add(x.say); add(x.spell); }); });
        if (!Le.noHareke && Le.id !== 'elif') { const x = I.shadda(Le); add(x.say); add(x.spell); }
      });
      K.C.LEVELS.forEach((lv) => { try { lv.items().forEach((x) => { if (x.say) add(x.say); if (x.spell) add(x.spell); (x.sylls || []).forEach((y) => { add(y.say); add(y.spell); }); }); } catch (e) {} });
      Object.values(K.C.CONCEPTS).forEach((c) => c.lines.forEach((l) => add(typeof l === 'function' ? l() : l)));
    }
    K.Store.s.settings.otre = 'ü';
    ['Aferin!', 'Harikasın!', 'Maşallah!', 'Çok güzel!', 'Süpersin!', 'Bravo!', 'Tebrikler!', 'Çok iyi!', 'Hımm, bir daha dinle.', 'Olsun, tekrar deneyelim.', 'Az kaldı! Bir daha dene.', 'Tekrar bakalım.',
      'Pat!', 'Harika!', 'Bir tane daha!', 'Süper!', 'Süper! Şimdi başka bir tane.', 'Bu sesi taşıyan balonları patlat!', 'Bu farklı.', 'Bu oldu:', 'Biz bunu istiyoruz:',
      'Bu ders kilitli. Önce önceki dersleri bitirelim!', 'Haydi, parlayan derse dokun!', 'Hangi dersi tekrar edelim?', 'Bu oyun hareke derslerinden sonra açılacak!',
      'Ben Hüdhüd! Seninle Kur\'an okumayı öğreneceğiz.', 'Haydi bir ders yapalım!', 'Bugün çok güzel bir gün!', 'Esselâmü aleyküm! Ben Hüdhüd.', 'Ses hızı böyle olacak.',
      'Bütün sûreleri okudun! Belgeni almaya hazır mısın?', 'Bir de yeni çıkartma kazandın!', 'Harfin içini renklerle boyamaya devam et!', 'Annene ya da babana ezberini dinlet!',
      'Maşallah! Bütün sûreyi okudun!', 'Maşallah! Sûreyi baştan sona dinledin.', 'Tekrar dinle.', 'Şimdi sen söyle!', 'Şimdi sen oku!', 'Ne güzel çıkartmaların var! Dersleri bitirdikçe yenilerini kazanırsın.', 'Dersleri bitirdikçe burada çıkartmalar toplayacaksın!',
      'Maşallah! Abdestini aldın. Artık namaz kılmaya hazırsın!', 'Maşallah! Abdestini aldın. Artık namaz kılmaya hazırsın! Su damlası çıkartması kazandın!',
      'Maşallah! Namazı baştan sona öğrendin. Allah kabul etsin!', 'Maşallah! Namazı baştan sona öğrendin. Allah kabul etsin! Yeni bir çıkartma kazandın!',
      'Maşallah! Namazın sırasını çok iyi biliyorsun!', 'Şimdi noktalarını da boya!', 'Şimdi noktasını da boya!', 'Şimdi içindeki küçük işareti de boya!', 'Aferin! Sırayı tamamladın!', 'Namaz tekbirle başlar!', 'Bugün ne yapmak istersin?', 'Esselâmü aleyküm! Ben Hüdhüd. Bugün ne yapmak istersin?'
    ].forEach((t) => add(t));
    K.NZ.ORDER_GAME.forEach((p, i) => { add(K.NZ.POSE_NAMES[p] + '!'); if (i) add(`${K.NZ.POSE_NAMES[K.NZ.ORDER_GAME[i - 1]]} sonrası ne gelir? Bir düşün.`); });
    for (const stars of [1, 2, 3]) for (const free of [true, false]) add(`Maşallah! ${free ? 'Çok güzel oynadın!' : 'Bu dersi bitirdin!'} ${stars} yıldız kazandın!`);
    K.SURAHS.forEach((su) => {
      add(`${su.tr} sûresi. ${su.desc} Dinlemek için yeşil düğmeye bas.`);
      add(`${su.tr} sûresini okuyalım! Her âyeti önce dinle, sonra sen oku ve Okudum düğmesine bas.`);
      add(`Maşallah! ${su.tr} sûresini ezberledin!`); add(`Maşallah! ${su.tr} sûresini ezberledin! Madalya çıkartması kazandın!`);
    });
    for (const g of ['m', 'f']) { K.Store.s.settings.namazGender = g; K.NZ.NAMAZ.forEach((st) => add(st.title + '. ' + K.NZ.stepText(st))); }
    K.NZ.ABDEST.forEach((st) => add(st.title + '. ' + st.text));
    K.NZ.VAKITLER.forEach((v) => add(v.text));
    K.NZ.DUAS.forEach((d) => { add(d.lat); add(d.mean); });
  });
  const said = await p.evaluate(() => [...window.__said].map((x) => { const [l, t] = x.split('\u0001'); return { lang: l, text: t }; }));
  const clean = said.filter((x) => x.text && x.text.trim() && !(x.lang === 'ar' && /[ً-ْ]/.test(x.text) === false && x.text.length < 2));
  fs.writeFileSync(OUT, JSON.stringify(clean, null, 0));
  console.log('collected', clean.length, 'tr', clean.filter(x => x.lang === 'tr').length, 'ar', clean.filter(x => x.lang === 'ar').length, 'chars', clean.reduce((a, x) => a + x.text.length, 0));
  console.log(errs.slice(0, 5).join('\n') || 'NO ERRORS');
  await b.close();
})();
