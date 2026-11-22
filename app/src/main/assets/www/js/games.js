/* Ders motoru ve oyunlar: tanışma, çizim, dinle-bul, balon, hafıza, hareke giydir, okuma şeridi, kutlama. */
window.K = window.K || {};
(function () {
  const { h, sleep, shuffle, pick, btn, iconBtn, R } = K.UI;
  const S = K.Speech;
  const stripMarks = (s) => (s || '').replace(/[ً-ْٰـۖ-ۜ\s]/g, '');
  function sizeClass(ar) {
    const n = stripMarks(ar).length;
    return n <= 1 ? '' : n <= 3 ? ' medium' : n <= 6 ? ' small' : ' tiny';
  }
  const unique = (arr, f = (x) => x.ar) => { const s = new Set(); return arr.filter((x) => { const k = f(x); if (s.has(k)) return false; s.add(k); return true; }); };
  const showLabel = (it) => it.kind === 'letter' || it.kind === 'form' || K.Store.s.settings.showLatin;

  /** Çocuğun kendi sesini kaydedip dinlemesi için mikrofon düğmesi. */
  function micButton(opts = {}) {
    const key = opts.key || 'child_tmp';
    let rec = false, timer = null, autoStop = null;
    const meter = h('div', { class: 'level-meter hidden' }, ...Array.from({ length: 7 }, () => h('i')));
    const b = btn('🎤', 'pink icon-btn rec-btn', async () => {
      if (rec) return stop();
      const ok = await K.N.recStart(key);
      if (!ok) { K.UI.toast('Kayıt için mikrofon izni gerekiyor 🎤'); return; }
      rec = true; b.classList.add('recording'); b.textContent = '⏹️'; K.Sfx.recOn(); meter.classList.remove('hidden');
      timer = setInterval(() => {
        const l = K.N.recLevel();
        [...meter.children].forEach((i, idx) => { i.style.height = Math.max(4, l * 30 - Math.abs(idx - 3) * 5) + 'px'; });
      }, 90);
      autoStop = setTimeout(stop, opts.max || 8000);
      opts.onStart && opts.onStart();
    }, { 'aria-label': 'Kaydet' });
    async function stop() {
      if (!rec) return;
      rec = false; clearInterval(timer); clearTimeout(autoStop);
      meter.classList.add('hidden'); b.classList.remove('recording'); b.textContent = '🎤';
      const r = await K.N.recStop(key);
      K.Sfx.recOff();
      if (r === 'saved') {
        opts.onSaved && opts.onSaved();
        if (opts.playBack !== false) { await K.N.play('rec:' + key); }
        opts.afterPlay && opts.afterPlay();
      }
    }
    const wrap = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' } }, b, meter);
    wrap.stop = stop;
    wrap.isRecording = () => rec;
    return wrap;
  }

  function waitTap(el) { return new Promise((res) => el.addEventListener('click', () => res(), { once: true })); }
  function row(...kids) { return h('div', { class: 'action-row' }, ...kids); }

  // ============================================================ etkinlikler
  const ACT = {};

  // ---------- kavram anlatımı
  ACT.concept = async (c) => {
    const C = K.C.CONCEPTS[c.step.c];
    const demo = C.demo();
    let body, glyph = null;
    const cells = [];
    if (C.harekeAnim) {
      glyph = h('div', { class: 'glyph', onTap: () => S.item(demo[1]) }, demo[0].ar);
      body = glyph;
    } else if (demo[0].kind === 'form') {
      body = h('div', { class: 'forms-row' }, demo.map((f) => { const cl = h('div', { class: 'fcell' }, h('span', { class: 'ar' }, f.ar), h('small', null, K.L.POSNAME[f.pos])); cells.push(cl); return cl; }));
    } else {
      body = h('div', { class: 'readline', style: { boxShadow: 'none' } }, demo.map((d) => { const ch = h('button', { class: 'chip md', onTap: () => S.item(d) }, d.ar); cells.push(ch); return ch; }));
    }
    const card = h('div', { class: 'bigcard pop-in' }, h('div', { class: 'name', style: { marginTop: '4px' } }, C.title), body);
    let goRes; const goP = new Promise((r) => (goRes = r));
    const next = btn('İleri ➡️', 'green big', () => goRes(), { disabled: true });
    const replay = iconBtn('🔊', () => narrate(), 'sm', 'Tekrar dinle');
    c.stage.append(card, row(replay, next));
    async function narrate() {
      for (let i = 0; i < C.lines.length; i++) {
        const ln = typeof C.lines[i] === 'function' ? C.lines[i]() : C.lines[i];
        const line = typeof ln === 'string' ? ln : ln.t;
        if (glyph && i === 0) { glyph.textContent = demo[1].ar; glyph.classList.remove('bounce'); void glyph.offsetWidth; glyph.classList.add('bounce'); }
        await S.say(line, { hv: typeof ln === 'string' ? undefined : ln.hv }); c.chk();
      }
      // Örnekleri Diyanet hocasının sesinden dinlet
      if (C.harekeAnim) { await S.item(demo[0]); c.chk(); await sleep(200); await S.item(demo[1]); c.chk(); return; }
      for (let j = 0; j < demo.length; j++) { cells[j] && cells[j].classList.add('hl'); await S.item(demo[j]); c.chk(); cells[j] && cells[j].classList.remove('hl'); await sleep(250); }
    }
    await narrate();
    next.disabled = false; next.classList.add('pulse');
    await goP;
  };

  // ---------- tanışma kartları
  ACT.intro = async (c) => {
    const mode = c.step.mode || 'letter';
    const list = c.step.max ? c.items.slice(0, c.step.max) : c.items;
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      c.stage.innerHTML = '';
      const glyph = h('div', { class: 'glyph' + sizeClass(it.ar) }, it.ar);
      const parts = [glyph];
      if (it.label && showLabel(it)) parts.push(h('div', { class: 'name' }, it.label));
      else if (it.label && it.kind === 'word') parts.push(h('div', { class: 'sub' }, ' '));
      const cells = [];
      if (mode === 'forms') {
        parts.push(h('div', { class: 'forms-row' }, K.L.forms(it.lid).map((f) => { const cl = h('div', { class: 'fcell' }, h('span', { class: 'ar' }, f.ar), h('small', null, K.L.POSNAME[f.pos])); cells.push(cl); return cl; })));
      } else if (it.sylls && it.sylls.length > 1) {
        parts.push(h('div', { class: 'syl-row' }, it.sylls.map((s) => { const ch = h('button', { class: 'chip', onTap: () => S.item(s) }, s.ar); cells.push(ch); return ch; })));
      }
      parts.push(h('div', { class: 'sub' }, `${i + 1} / ${list.length}`));
      const card = h('div', { class: 'bigcard pop-in' }, ...parts);
      glyph.addEventListener('click', () => { glyph.classList.remove('bounce'); void glyph.offsetWidth; glyph.classList.add('bounce'); S.item(it); });
      let goRes; const goP = new Promise((r) => (goRes = r));
      const next = btn(i === list.length - 1 ? 'Tamam ✔️' : 'İleri ➡️', 'green big', () => { mic.stop(); goRes(); });
      const replay = iconBtn('🔊', () => narrate(true), 'sm', 'Tekrar dinle');
      const mic = micButton({});
      c.stage.append(card, row(replay, mic, next));
      c.onCleanup(() => mic.stop());
      const first = i === 0;
      async function narrate(again) {
        const bounce = () => { glyph.classList.remove('bounce'); void glyph.offsetWidth; glyph.classList.add('bounce'); };
        if (mode === 'letter' && it.kind === 'letter') {
          await S.say(`Bu harfin adı ${it.label}.`); c.chk(); bounce();
          await S.item(it); c.chk();
          if (it.tip) { await S.say(it.tip); c.chk(); }
          await S.say(`Haydi sen de söyle: ${it.label}!`);
        } else if (mode === 'forms') {
          await S.say(`${it.label} harfi.`, { item: it }); c.chk();
          const forms = K.L.forms(it.lid);
          for (let j = 0; j < forms.length; j++) {
            cells[j].style.background = '#FFE58A';
            await S.say(K.L.POSNAME[forms[j].pos] + (j === 0 ? 'ken böyle.' : ' böyle.'), { rate: 1.05 }); c.chk();
            cells[j].style.background = '';
          }
        } else if (it.sylls && it.sylls.length > 1) {
          if (first || again) { await S.say('Bu kelimeyi heceleyelim.'); c.chk(); }
          for (let j = 0; j < it.sylls.length; j++) { cells[j].classList.add('hl'); await S.item(it.sylls[j]); c.chk(); cells[j].classList.remove('hl'); await sleep(150); }
          await S.say('Hepsi birlikte:'); c.chk(); bounce();
          await S.item(it); c.chk();
          await S.say('Haydi sen de oku!');
        } else if (it.kind === 'qword') {
          if (first && !again) { await S.say('Bu kelimeyi Kur\'an okuyucusundan dinle.'); c.chk(); }
          bounce(); await S.item(it); c.chk();
          await S.say('Sen de tekrar et!');
        } else {
          if (first || again) { await S.say('Dinle!'); c.chk(); }
          bounce(); await S.item(it); c.chk();
          await S.say(first ? 'Şimdi sen oku!' : 'Sen de oku!');
        }
      }
      await narrate();
      next.classList.add('pulse');
      await goP;
      c.chk();
    }
  };

  // ---------- harf çizme
  ACT.trace = async (c) => {
    let letters = unique(c.items.filter((it) => it.kind === 'letter'));
    letters = c.step.count ? shuffle(letters).slice(0, c.step.count) : letters.slice(0, 4);
    await document.fonts.load('100px "Scheherazade New"', 'ب').catch(() => {});
    for (let i = 0; i < letters.length; i++) {
      const it = letters[i];
      c.stage.innerHTML = '';
      const wrap = h('div', { class: 'trace-wrap pop-in' });
      const guide = h('canvas'), paint = h('canvas');
      wrap.append(guide, paint);
      const meter = h('div', { class: 'trace-meter' }, h('i'));
      let doneRes; const doneP = new Promise((r) => (doneRes = r));
      let finished = false, attempts = 0;
      const clear = iconBtn('🧽', () => { reset(); }, 'sm', 'Sil');
      const hear = iconBtn('🔊', () => S.item(it), 'sm', 'Dinle');
      const skip = btn('Geç ⏭️', 'white small', () => { finished = true; doneRes(); });
      c.stage.append(h('div', { class: 'name', style: { textAlign: 'center', fontSize: '26px', fontWeight: 800 } }, it.label), wrap, meter, row(hear, clear, skip));
      await sleep(30);
      const dpr = window.devicePixelRatio || 1;
      const W = wrap.clientWidth, H = wrap.clientHeight;
      [guide, paint].forEach((cv) => { cv.width = W * dpr; cv.height = H * dpr; cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); });
      const fs = Math.min(W * 0.75, H * 0.62);
      const font = `${fs}px "Scheherazade New"`;
      const g = guide.getContext('2d');
      g.font = font; g.textAlign = 'center'; g.direction = 'rtl';
      const m = g.measureText(it.ar);
      const asc = m.actualBoundingBoxAscent || fs * 0.5, desc = m.actualBoundingBoxDescent || fs * 0.2;
      const y = H / 2 + (asc - desc) / 2;
      g.fillStyle = '#EEE6FF'; g.fillText(it.ar, W / 2, y);
      g.setLineDash([6, 8]); g.lineWidth = 3; g.strokeStyle = '#B9A6FF'; g.strokeText(it.ar, W / 2, y);
      // maske örnekleri
      const mc = document.createElement('canvas'); mc.width = W; mc.height = H;
      const mx = mc.getContext('2d', { willReadFrequently: true }); mx.font = font; mx.textAlign = 'center'; mx.direction = 'rtl'; mx.fillStyle = '#000'; mx.fillText(it.ar, W / 2, y);
      const md = mx.getImageData(0, 0, W, H).data;
      // harf pikselleri ızgarası ve bileşenler (gövde + noktalar ayrı ayrı)
      const stepPx = 4, gw = Math.ceil(W / stepPx), gh = Math.ceil(H / stepPx);
      const gridIdx = new Int32Array(gw * gh).fill(-1);
      const samples = [];
      for (let yy = 0; yy < H; yy += stepPx) for (let xx = 0; xx < W; xx += stepPx) {
        if (md[(yy * W + xx) * 4 + 3] > 128) { gridIdx[(yy / stepPx) * gw + xx / stepPx] = samples.length; samples.push([xx, yy]); }
      }
      const comp = new Int32Array(samples.length).fill(-1);
      const sizes = [];
      for (let k0 = 0; k0 < samples.length; k0++) {
        if (comp[k0] >= 0) continue;
        const id = sizes.length; let cnt = 0; const st = [k0]; comp[k0] = id;
        while (st.length) {
          const k = st.pop(); cnt++;
          const gx = samples[k][0] / stepPx, gy = samples[k][1] / stepPx;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = gx + dx, ny = gy + dy;
            if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
            const j = gridIdx[ny * gw + nx];
            if (j >= 0 && comp[j] < 0) { comp[j] = id; st.push(j); }
          }
        }
        sizes.push(cnt);
      }
      const maxSize = Math.max(1, ...sizes);
      const isDot = sizes.map((z) => z < maxSize * 0.3);
      const dotIds = sizes.map((_, k) => k).filter((k) => isDot[k] && sizes[k] >= 3);
      const hit = new Uint8Array(samples.length);
      const brush = Math.max(18, fs * 0.13);
      const p = paint.getContext('2d');
      p.lineCap = 'round'; p.lineJoin = 'round'; p.lineWidth = brush;
      let drawing = false, last = null, hue = Math.random() * 360, dotHint = false;
      function cover(x, y) {
        const r2 = (brush * 0.75) ** 2;
        for (let k = 0; k < samples.length; k++) { if (hit[k]) continue; const dx = samples[k][0] - x, dy = samples[k][1] - y; if (dx * dx + dy * dy <= r2) hit[k] = 1; }
      }
      function evaluate() {
        const got = new Array(sizes.length).fill(0);
        for (let k = 0; k < samples.length; k++) if (hit[k]) got[comp[k]]++;
        const cv = got.map((g2, k) => g2 / sizes[k]);
        let bodySum = 0, bodyTot = 0;
        sizes.forEach((z, k) => { if (!isDot[k]) { bodySum += Math.min(cv[k], 1) * z; bodyTot += z; } });
        const body = bodyTot ? bodySum / bodyTot : 1;
        const bodyOk = sizes.every((z, k) => isDot[k] || cv[k] >= 0.6);
        const missing = dotIds.filter((k) => cv[k] < 0.45);
        const prog = Math.min(1, body / 0.6) * (dotIds.length ? 0.75 : 1) + (dotIds.length ? 0.25 * (dotIds.length - missing.length) / dotIds.length : 0);
        return { bodyOk, missing, prog };
      }
      // eksik noktaları gösteren yanıp sönen halkalar
      const centroid = (id) => { let sx = 0, sy = 0, n = 0; for (let k = 0; k < samples.length; k++) if (comp[k] === id) { sx += samples[k][0]; sy += samples[k][1]; n++; } return [sx / n, sy / n]; };
      const rings = {};
      function showDots(missing) {
        Object.keys(rings).forEach((k) => { if (!missing.includes(+k)) { rings[k].remove(); delete rings[k]; } });
        missing.forEach((k) => {
          if (rings[k]) return;
          const [cx2, cy2] = centroid(k);
          const r = h('div', { class: 'dot-ring', style: { left: cx2 + 'px', top: cy2 + 'px' } });
          wrap.append(r); rings[k] = r;
        });
      }
      function reset() { p.clearRect(0, 0, W, H); hit.fill(0); meter.firstChild.style.width = '0%'; showDots([]); dotHint = false; }
      const pos = (e) => { const r = paint.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      paint.addEventListener('pointerdown', (e) => { if (finished) return; drawing = true; paint.setPointerCapture(e.pointerId); last = pos(e); cover(...last); p.beginPath(); p.arc(last[0], last[1], brush / 2, 0, 7); p.fillStyle = `hsl(${hue},85%,60%)`; p.fill(); });
      paint.addEventListener('pointermove', (e) => {
        if (!drawing) return;
        const pt2 = pos(e); hue = (hue + 2) % 360;
        p.strokeStyle = `hsl(${hue},85%,60%)`; p.beginPath(); p.moveTo(last[0], last[1]); p.lineTo(pt2[0], pt2[1]); p.stroke();
        const steps = Math.ceil(Math.hypot(pt2[0] - last[0], pt2[1] - last[1]) / 5);
        for (let s2 = 1; s2 <= steps; s2++) cover(last[0] + (pt2[0] - last[0]) * s2 / steps, last[1] + (pt2[1] - last[1]) * s2 / steps);
        last = pt2;
        meter.firstChild.style.width = Math.round(evaluate().prog * 100) + '%';
      });
      const up = async () => {
        if (!drawing) return; drawing = false; attempts++;
        const ev = evaluate();
        meter.firstChild.style.width = Math.round(ev.prog * 100) + '%';
        if (ev.bodyOk && ev.missing.length) {
          // gövde tamam ama noktalar eksik: bölüm bitmez, noktalar gösterilir
          showDots(ev.missing);
          if (!dotHint) {
            dotHint = true; K.Sfx.soft();
            const nd = { te: 2, se: 3, shin: 3, kaf: 2, ye: 2 }[it.lid] || 1;
            S.say(it.lid === 'kef' ? 'Şimdi içindeki küçük işareti de boya!' : nd > 1 ? 'Şimdi noktalarını da boya!' : 'Şimdi noktasını da boya!');
          }
          return;
        }
        showDots([]);
        if (ev.bodyOk && !finished) {
          finished = true; K.Sfx.star(); c.coach.happy(); K.UI.confetti(60, { x: innerWidth / 2, y: innerHeight * 0.45 });
          await S.praise(); doneRes();
        } else if (attempts === 4 && ev.prog < 0.4) { S.say('Harfin içini renklerle boyamaya devam et!'); }
      };
      paint.addEventListener('pointerup', up); paint.addEventListener('pointercancel', up);
      await S.say(i === 0 ? `Parmağınla ${it.label} harfinin içini boya!` : `Şimdi ${it.label} harfi!`, { item: it });
      await doneP; c.chk();
    }
  };

  // ---------- dinle ve bul (ve şekil bul)
  ACT.pick = async (c) => {
    const visual = c.step.t === 'formpick';
    const rounds = c.step.rounds || 6, k = c.step.k || 3;
    const base = unique(c.items);
    const pool = unique([...base, ...shuffle(c.review).slice(0, 8)]);
    let order = [];
    while (order.length < rounds) order.push(...shuffle(base));
    order = order.slice(0, rounds);
    for (let r = 0; r < rounds; r++) {
      const target = order[r];
      let cands = pool.filter((p) => p.ar !== target.ar && p.say !== target.say && p.label !== target.label);
      if (c.step.minimal && target.kind === 'syl') {
        const mins = c.items.filter((p) => p.lid === target.lid && p.h !== target.h);
        cands = [...shuffle(mins), ...shuffle(cands)];
      } else cands = shuffle(cands);
      const opts = shuffle([target, ...unique(cands).slice(0, k - 1)]);
      c.stage.innerHTML = '';
      let promptEl, form = null;
      if (visual) {
        const L = K.L.BY[target.lid];
        form = K.L.I.form(L, pick(L.join ? ['ini', 'mid', 'fin'] : ['fin']));
        promptEl = h('div', { class: 'prompt-card pop-in' }, h('span', { class: 'ar' }, form.ar));
      } else {
        promptEl = btn('🔊', 'yellow listen-btn pulse', () => ask(true), { 'aria-label': 'Dinle' });
      }
      const counter = h('div', { class: 'sub', style: { textAlign: 'center', fontWeight: 800, color: 'var(--ink2)' } }, `${r + 1} / ${rounds}`);
      const grid = h('div', { class: 'choices' + (opts.length === 3 ? ' three' : '') });
      let solved = false, wrongs = 0, resRound;
      const roundP = new Promise((res) => (resRound = res));
      opts.forEach((o) => {
        const long = stripMarks(o.ar).length > 2;
        const b = h('button', { class: 'choice pop-in' + (long ? ' smallar' : ''), 'data-ok': o === target ? '1' : null }, o.ar);
        b.addEventListener('click', async () => {
          if (solved) return;
          K.Sfx.unlock();
          if (o === target) {
            solved = true; b.classList.add('ok'); K.Sfx.ok(); c.coach.happy(); c.good(target.lid);
            grid.querySelectorAll('.choice').forEach((x) => { if (x !== b) x.classList.add('dim'); });
            if (visual) await S.item(target); else if (r % 2 === 0) await S.item(target);
            await S.praise(); resRound();
          } else {
            wrongs++; c.mistake(target.lid); K.Sfx.soft(); c.coach.sad(); K.N.vibrate(40);
            b.classList.add('bad', 'shake'); setTimeout(() => b.classList.remove('shake'), 500);
            await S.say(o.kind === 'letter' ? `Bu ${o.label}.` : 'Bu farklı.', { rate: 1.05, item: o.kind === 'letter' ? o : null });
            if (!solved) {
              if (wrongs >= 2) grid.querySelectorAll('.choice').forEach((x, ix) => { if (opts[ix] === target) x.classList.add('glow'); });
              ask();
            }
          }
        });
        grid.append(b);
      });
      c.stage.append(counter, promptEl, grid);
      async function ask(replayOnly) {
        if (visual) { await S.say('Bu şekil hangi harfin?'); return; }
        if (!replayOnly) {
          if (target.kind === 'letter') { await S.say(`Hangisi ${target.label}?`, { item: target }); return; }
          await S.say(r === 0 ? 'Dinle ve doğru olanı bul!' : 'Hangisi?'); c.chk();
        }
        await S.item(target);
      }
      ask();
      await roundP; c.chk();
    }
  };
  ACT.formpick = ACT.pick;

  // ---------- balon patlatma
  ACT.balloons = async (c) => {
    const total = c.step.targets || 5;
    const base = unique(c.items);
    const targetsList = base.length > 1 && total >= 4 ? shuffle(base).slice(0, 2) : [pick(base)];
    let tIdx = 0, target = targetsList[0], count = 0;
    const others = unique([...base, ...c.review]).filter((x) => x.ar !== target.ar);
    const strip = h('div', { class: 'score-strip' }, ...Array.from({ length: total }, () => h('span', null, '🎈')));
    const mini = h('button', { class: 'chip md bal-target', onTap: () => announce() }, target.ar);
    const head = h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' } }, h('span', { style: { fontWeight: 800, fontSize: '18px' } }, 'Bul:'), mini, iconBtn('🔊', () => announce(), 'sm'));
    const field = h('div', { class: 'balloon-field' });
    c.stage.append(head, strip, field);
    const colors = ['#FF6B9A', '#4AA8FF', '#FFB020', '#4CC26B', '#8E7CFF', '#FF7A45', '#2BB3A3'];
    let alive = true, resAll;
    const allP = new Promise((r) => (resAll = r));
    c.onCleanup(() => { alive = false; });
    function announce() {
      return target.kind === 'letter' ? S.say(`${target.label} harfi olan balonları patlat!`, { item: target }) : S.say('Bu sesi taşıyan balonları patlat!').then(() => S.item(target));
    }
    function spawn() {
      if (!alive || !field.isConnected) return;
      const isT = Math.random() < 0.45;
      const it = isT ? target : (others.length ? pick(others) : target);
      const fw = field.clientWidth, fh = field.clientHeight;
      const x = 6 + Math.random() * Math.max(10, fw - 116);
      const col = pick(colors);
      const b = h('button', { class: 'balloon', 'data-ar': it.ar, style: { left: x + 'px', '--bc': col } },
        h('div', { class: 'bb' + (stripMarks(it.ar).length > 1 ? ' smallar' : ''), style: { '--bc': col } }, it.ar), h('div', { class: 'bk', style: { '--bc': col } }), h('div', { class: 'bs' }));
      b.style.setProperty('--bc', col);
      field.append(b);
      const dur = 6500 + Math.random() * 2500;
      const anim = b.animate([{ transform: 'translateY(0)' }, { transform: `translateY(-${fh + 200}px)` }], { duration: dur, easing: 'linear' });
      anim.onfinish = () => b.remove();
      b.addEventListener('pointerdown', async () => {
        if (b.classList.contains('popped')) return;
        if (it.ar === target.ar) {
          b.classList.add('popped'); anim.pause(); K.Sfx.pop(); K.N.vibrate(20);
          setTimeout(() => b.remove(), 260);
          count++; strip.children[count - 1] && strip.children[count - 1].classList.add('on');
          c.good(target.lid);
          if (count >= total) { alive = false; K.Sfx.tada(); c.coach.happy(); K.UI.confetti(90); field.querySelectorAll('.balloon').forEach((x) => x.remove()); await S.praise(); resAll(); return; }
          if (targetsList.length > 1 && count === Math.ceil(total / 2) && tIdx === 0) {
            tIdx = 1; target = targetsList[1]; mini.textContent = target.ar;
            others.splice(0, others.length, ...unique([...base, ...c.review]).filter((x) => x.ar !== target.ar));
            await S.say('Süper! Şimdi başka bir tane.'); announce();
          } else if (count % 2 === 0) S.say(pick(['Pat!', 'Harika!', 'Bir tane daha!', 'Süper!']), { rate: 1.1 });
        } else {
          b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 450); K.Sfx.soft();
          c.mistake(target.lid, 0.5);
          if (it.kind === 'letter') S.say(`Bu ${it.label}.`, { rate: 1.1, item: it });
        }
      });
    }
    await announce(); c.chk();
    const iv = setInterval(() => { if (!alive) clearInterval(iv); else spawn(); }, 950);
    c.onCleanup(() => clearInterval(iv));
    spawn();
    await allP; clearInterval(iv); c.chk();
  };

  // ---------- hafıza kartları
  ACT.memory = async (c) => {
    const pairs = c.step.pairs || 3;
    let chosen = shuffle(unique(c.items)).slice(0, pairs);
    if (chosen.length < pairs) chosen = [...chosen, ...shuffle(unique(c.review)).filter((x) => !chosen.some((y) => y.ar === x.ar)).slice(0, pairs - chosen.length)];
    const cards = shuffle(chosen.flatMap((it, i) => {
      let face2 = it.ar;
      if (c.step.mode === 'form' && it.lid) { const L = K.L.BY[it.lid]; face2 = K.L.I.form(L, pick(L.join ? ['ini', 'mid', 'fin'] : ['fin'])).ar; }
      return [{ it, pair: i, face: it.ar }, { it, pair: i, face: face2 }];
    }));
    const grid = h('div', { class: 'memory' + (cards.length > 6 ? ' c4' : '') });
    let open = [], lock = false, matched = 0, resAll;
    const allP = new Promise((r) => (resAll = r));
    cards.forEach((cd) => {
      const long = stripMarks(cd.face).length > 2;
      const el = h('button', { class: 'mcard pop-in', 'data-pair': String(cd.pair) }, h('div', { class: 'in' }, h('div', { class: 'b' }), h('div', { class: 'f' + (long ? ' smallar' : '') }, cd.face)));
      cd.el = el;
      el.addEventListener('click', async () => {
        if (lock || el.classList.contains('open')) return;
        K.Sfx.flip(); el.classList.add('open'); open.push(cd);
        if (open.length === 2) {
          lock = true;
          const [a, b] = open;
          if (a.pair === b.pair) {
            a.el.classList.add('matched'); b.el.classList.add('matched'); K.Sfx.ok(); c.coach.happy(); c.good(a.it.lid);
            matched++; open = []; lock = false;
            S.item(a.it);
            if (matched === chosen.length) { await sleep(900); K.Sfx.tada(); K.UI.confetti(80); await S.praise(); resAll(); }
          } else {
            await sleep(950); a.el.classList.remove('open'); b.el.classList.remove('open'); open = []; lock = false;
          }
        }
      });
      grid.append(el);
    });
    c.stage.append(grid);
    await S.say(c.step.mode === 'form' ? 'Harfi ve şeklini eşleştir!' : 'Aynı kartları bul!');
    await allP; c.chk();
  };

  // ---------- hareke giydir
  ACT.hareke = async (c) => {
    const rounds = c.step.rounds || 6;
    const hs = c.step.harekes || ['u', 'e', 'o'];
    const lids = [...new Set(c.items.map((x) => x.lid).filter(Boolean))].filter((id) => !K.L.BY[id].noHareke);
    for (let r = 0; r < rounds; r++) {
      const L = K.L.BY[pick(lids)];
      const th = pick(hs);
      const target = K.L.I.syl(L, th);
      c.stage.innerHTML = '';
      const glyph = h('div', { class: 'glyph medium' }, L.id === 'elif' ? 'ا' : L.ar);
      const card = h('div', { class: 'bigcard pop-in' }, h('div', { class: 'sub', style: { fontWeight: 800 } }, `${r + 1} / ${rounds}`), glyph,
        btn('🔊', 'yellow icon-btn', () => S.item(target)));
      const box = h('div', { class: 'hareke-btns', style: { gridTemplateColumns: `repeat(${hs.length}, 1fr)` } });
      let solved = false, resR, wrongs = 0;
      const p = new Promise((res) => (resR = res));
      hs.forEach((hh) => {
        const made = K.L.I.syl(L, hh);
        const b = h('button', { class: 'hareke-btn pop-in', 'data-ok': hh === th ? '1' : null }, h('span', { class: 'ar' }, made.ar), h('small', null, K.L.HNAME[hh]));
        b.addEventListener('click', async () => {
          if (solved) return;
          K.Sfx.unlock();
          glyph.textContent = made.ar; glyph.classList.remove('bounce'); void glyph.offsetWidth; glyph.classList.add('bounce');
          if (hh === th) {
            solved = true; b.classList.add('ok'); K.Sfx.ok(); c.coach.happy(); c.good(L.id);
            await S.item(made); await S.praise(); resR();
          } else {
            wrongs++; b.classList.add('bad'); K.Sfx.soft(); c.mistake(L.id); c.coach.sad();
            await S.say('Bu oldu:', { rate: 1.1 }); await S.item(made);
            await S.say('Biz bunu istiyoruz:', { rate: 1.1 }); await S.item(target);
            glyph.textContent = L.id === 'elif' ? 'ا' : L.ar;
            setTimeout(() => b.classList.remove('bad'), 300);
          }
        });
        box.append(b);
      });
      c.stage.append(card, box);
      if (r === 0) { await S.say('Harfe doğru harekeyi giydir! Dinle:'); c.chk(); }
      await S.item(target);
      await p; c.chk();
    }
  };

  // ---------- okuma şeridi
  ACT.read = async (c) => {
    const lines = c.step.lines();
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      c.stage.innerHTML = '';
      const sizeCls = line.length > 5 || line.some((x) => stripMarks(x.ar).length > 4) ? ' sm' : line.some((x) => stripMarks(x.ar).length > 2) ? ' md' : '';
      const chips = line.map((it) => {
        const ch = h('button', { class: 'chip' + sizeCls, onTap: () => { S.item(it); } }, it.ar + (it.mark ? ' ' + it.mark : ''), it.label && showLabel(it) ? h('span', { class: 'chip-tr' }, it.label) : null);
        return ch;
      });
      const strip = h('div', { class: 'readline pop-in' }, chips);
      let listened = false, playing = false;
      let goRes; const goP = new Promise((r) => (goRes = r));
      const done = btn('Okudum ✔️', 'green big', () => { mic.stop(); goRes(); });
      const listen = btn('▶️ Dinle', 'blue', () => listenAll(false));
      const spellB = c.step.chant ? btn('🗣️ Hecele', 'purple', () => listenAll(true)) : null;
      const mic = micButton({ afterPlay: () => { done.classList.add('pulse'); } });
      c.onCleanup(() => mic.stop());
      c.stage.append(h('div', { class: 'sub', style: { textAlign: 'center', fontWeight: 800, color: 'var(--ink2)' } }, `Satır ${li + 1} / ${lines.length}`), strip,
        row(listen, spellB, mic), row(done));
      async function listenAll(spell) {
        if (playing) { S.cancelAll(); playing = false; return; }
        playing = true;
        const g = S.gen;
        for (let i = 0; i < line.length; i++) {
          if (g !== S.gen) break;
          chips[i].classList.add('hl');
          await S.item(line[i], { spell, warn: i === 0 });
          chips[i].classList.remove('hl');
          if (g !== S.gen) break;
          await sleep(spell ? 250 : 120);
        }
        playing = false;
        listened = true;
        done.classList.add('pulse');
      }
      if (li === 0) { await S.say(c.step.chant ? 'Önce dinle, sonra sen oku! Hecele düğmesiyle tek tek de dinleyebilirsin.' : 'Önce dinle, sonra sen oku!'); c.chk(); }
      await listenAll(false); c.chk();
      if (!listened) done.classList.add('pulse');
      await S.say(li === 0 ? 'Şimdi sen oku! Mikrofona basarsan sesini kaydedip dinleyebilirsin.' : 'Şimdi sen oku!');
      await goP; c.chk();
      chips.forEach((x) => x.classList.add('read'));
      K.Sfx.ok(); c.coach.happy();
      if (li < lines.length - 1) await S.praise();
    }
  };

  // ---------- sûre okuma (sûre ekranını ders içinde kullanır)
  ACT.surahread = async (c) => {
    await K.SurahUI.readLesson(c);
  };

  // ============================================================ ders ekranı
  function lessonScreen(params) {
    const free = params.free || null;
    const lv = free || K.C.levelById(params.levelId);
    const st = free ? { step: 0 } : K.Store.level(lv.id);
    const items = lv.items();
    const review = lv.review ? lv.review() : [];
    let stepIdx = (!free && !st.done && st.step > 0 && st.step < lv.steps.length) ? st.step : 0;
    let mistakes = 0;
    let alive = true;
    const cleanups = [];
    const dots = h('div', { class: 'stepdots' }, lv.steps.map(() => h('i')));
    const starPill = h('div', { class: 'pill' }, '⭐ ', String(K.Store.totalStars()));
    const top = h('div', { class: 'topbar' }, iconBtn('✖️', () => R.back(), '', 'Çık'), dots, starPill);
    const stage = h('div', { class: 'stage' });
    const coach = K.makeCoach();
    const el = h('div', { class: 'screen lesson' }, top, stage, coach.el);

    const ctx = {
      lv, items, review, stage, coach, free,
      alive: () => alive,
      chk() { if (!alive) throw 'abort'; },
      mistake(lid, w = 1) { mistakes += w; if (lid && !free) K.Store.addLetterStat(lid, false); },
      good(lid) { if (lid && !free) K.Store.addLetterStat(lid, true); },
      onCleanup(fn) { cleanups.push(fn); },
    };
    function updateDots() {
      [...dots.children].forEach((d, i) => { d.className = i < stepIdx ? 'done' : i === stepIdx ? 'on' : ''; });
    }
    function runCleanups() { while (cleanups.length) { try { cleanups.pop()(); } catch (e) {} } }
    async function run() {
      K.N.keepScreenOn(true);
      while (alive && stepIdx < lv.steps.length) {
        updateDots();
        runCleanups();
        stage.innerHTML = '';
        ctx.step = lv.steps[stepIdx];
        try { await ACT[ctx.step.t](ctx); } catch (e) { if (e !== 'abort') console.error(e); return; }
        if (!alive) return;
        stepIdx++;
        if (!free) { st.step = stepIdx; K.Store.save(); }
      }
      if (alive) { runCleanups(); updateDots(); celebrate(); }
    }
    function celebrate() {
      const stars = mistakes <= 2 ? 3 : mistakes <= 6 ? 2 : 1;
      let newSticker = false;
      if (!free) {
        st.done = true; st.stars = Math.max(st.stars || 0, stars); st.step = 0; st.plays = (st.plays || 0) + 1;
        newSticker = K.Store.addSticker(lv.sticker);
        K.Store.save(true);
      }
      starPill.lastChild.textContent = String(K.Store.totalStars());
      stage.innerHTML = '';
      const m = K.Mascot.el('happy');
      const starRow = h('div', { class: 'big-stars' }, [0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '', style: { animationDelay: (0.2 + i * 0.25) + 's' } }, '⭐')));
      const next = !free && K.C.LEVELS[lv.n + 1];
      const allSure = K.C.LEVELS.filter((l) => l.island === 'sure').every((l) => K.Store.s.levels[l.id] && K.Store.s.levels[l.id].done);
      const diplomaNow = !free && lv.island === 'sure' && allSure && !K.Store.s.diploma;
      const btns = row(
        btn('🗺️ Harita', 'white', () => R.back()),
        btn('🔁 Tekrar', 'orange', () => R.go(lessonScreen, params, { replace: true })),
        diplomaNow ? btn('🎓 Belgem', 'yellow big pulse', () => { K.Store.s.diploma = true; K.Store.addSticker(K.C.EXTRA_STICKERS.diploma); K.Store.save(true); R.go(K.Screens.diploma, {}, { replace: true }); })
          : next && !free ? btn('Sıradaki ▶️', 'green big pulse', () => R.go(lessonScreen, { levelId: next.id }, { replace: true })) : null);
      if (free) btns.firstChild.textContent = '🎮 Oyun Parkı';
      stage.append(h('div', { class: 'celebrate' }, m, starRow, h('h2', null, free ? 'Harika oynadın!' : 'Ders tamam!'),
        newSticker ? h('div', null, h('div', { class: 'sticker-reveal' }, lv.sticker), h('p', null, 'Yeni çıkartma!')) : h('p', null, lv.title), btns));
      K.Sfx.tada(); K.UI.confetti(160);
      setTimeout(() => K.Sfx.star(), 700);
      const n = K.Store.s.profile.name;
      (async () => {
        const msg = `Maşallah! ${free ? 'Çok güzel oynadın!' : 'Bu dersi bitirdin!'} ${stars} yıldız kazandın!`;
        await S.say(msg, { show: n ? msg.replace('Maşallah!', `Maşallah ${n}!`) : msg });
        if (newSticker) await S.say('Bir de yeni çıkartma kazandın!');
        if (diplomaNow) await S.say('Bütün sûreleri okudun! Belgeni almaya hazır mısın?');
      })();
    }
    return {
      el,
      onEnter() { run(); },
      onLeave() { alive = false; runCleanups(); K.N.keepScreenOn(false); },
    };
  }

  // ============================================================ serbest oyunlar (Oyun Parkı)
  function learnedLetters() {
    const s = K.Store.s;
    if (s.settings.unlockAll) return K.L.LETTERS.map((l) => K.L.I.letter(l));
    const done = K.C.LEVELS.filter((l) => l.island === 'harf' && l.id !== 'harf9' && s.levels[l.id] && s.levels[l.id].done);
    const items = unique(done.flatMap((l) => l.items()));
    return items.length >= 3 ? items : K.C.LEVELS[0].items();
  }
  function learnedSyllables() {
    const s = K.Store.s;
    const known = ['u', 'e', 'o'].filter((h1, i) => s.settings.unlockAll || K.C.LEVELS.some((l) => l.id === `hareke_${h1}1` && s.levels[l.id] && s.levels[l.id].done));
    if (!known.length) return null;
    return K.L.hareke.flatMap((L) => known.map((hh) => K.L.I.syl(L, hh)));
  }
  const FREE = {
    balloons: () => ({ id: 'free_balloons', title: 'Balon Patlat', items: () => shuffle(learnedLetters()).slice(0, 6), review: () => learnedLetters(), steps: [{ t: 'balloons', targets: 6 }] }),
    memory: () => ({ id: 'free_memory', title: 'Hafıza Kartları', items: () => learnedLetters(), review: () => [], steps: [{ t: 'memory', pairs: 4 }] }),
    pick: () => ({ id: 'free_pick', title: 'Harf Avı', items: () => learnedLetters(), review: () => [], steps: [{ t: 'pick', rounds: 8, k: 4 }] }),
    trace: (lid) => ({ id: 'free_trace', title: 'Çizim Defteri', items: () => lid ? [K.L.I.letter(lid)] : shuffle(learnedLetters()).slice(0, 3), review: () => [], steps: [{ t: 'trace', count: lid ? 1 : 3 }] }),
    hareke: () => { const syl = learnedSyllables(); return { id: 'free_hareke', title: 'Hareke Giydir', items: () => syl || [], review: () => [], steps: [{ t: 'hareke', rounds: 6, harekes: [...new Set(syl.map((x) => x.h))] }] }; },
    sylpick: () => { const syl = learnedSyllables(); return { id: 'free_sylpick', title: 'Hece Avı', items: () => shuffle(syl).slice(0, 12), review: () => syl, steps: [{ t: 'pick', rounds: 8, k: 3 }] }; },
  };

  K.Games = { ACT, lessonScreen, micButton, FREE, learnedLetters, learnedSyllables, sizeClass, stripMarks,
    start(levelId) { R.go(lessonScreen, { levelId }); },
    play(kind, arg) { const lv = FREE[kind](arg); R.go(lessonScreen, { free: lv }); },
  };
})();
