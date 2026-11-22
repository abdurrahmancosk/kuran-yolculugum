/* Namaz ve abdest çizimleri: insan oranlarına uygun, iskelet tabanlı SVG figürler.
   Erkek (takke, gömlek, pantolon) ve kadın (başörtüsü, uzun elbise) için ayrı duruşlar.
   Duruş farkları Diyanet İlmihali'ne (Hanefî) göredir. */
window.K = window.K || {};
(function () {
  // ------------------------------------------------------------ vektör yardımcıları
  const P = (x, y) => ({ x, y });
  const add = (a, b) => P(a.x + b.x, a.y + b.y), sub = (a, b) => P(a.x - b.x, a.y - b.y), mul = (a, k) => P(a.x * k, a.y * k);
  const len = (a) => Math.hypot(a.x, a.y), norm = (a) => { const l = len(a) || 1; return P(a.x / l, a.y / l); };
  const perp = (u) => P(-u.y, u.x);
  const lerp = (a, b, t) => P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  const dir = (deg) => P(Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180));
  const f1 = (n) => Math.round(n * 10) / 10;
  const pt = (p) => `${f1(p.x)} ${f1(p.y)}`;
  const deg = (u) => Math.atan2(u.y, u.x) * 180 / Math.PI;

  /** İki kemikli ters kinematik: A'dan B'ye, ara eklem (dirsek/diz) döner. */
  function ik(A, B, l1, l2, bend) {
    const d = sub(B, A);
    let dist = len(d);
    dist = Math.min(Math.max(dist, Math.abs(l1 - l2) + 0.1), l1 + l2 - 0.1);
    const u = norm(d);
    const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return add(add(A, mul(u, a)), mul(perp(u), h * bend));
  }
  /** Uçları yuvarlak, kalınlığı değişen uzuv. */
  function limb(A, B, wa, wb) {
    const u = norm(sub(B, A)), n = perp(u);
    const a1 = add(A, mul(n, wa / 2)), a2 = sub(A, mul(n, wa / 2)), b1 = add(B, mul(n, wb / 2)), b2 = sub(B, mul(n, wb / 2));
    return `M${pt(a1)} L${pt(b1)} A${f1(wb / 2)} ${f1(wb / 2)} 0 0 0 ${pt(b2)} L${pt(a2)} A${f1(wa / 2)} ${f1(wa / 2)} 0 0 0 ${pt(a1)} Z`;
  }
  /** Noktalardan yumuşak kapalı eğri (Catmull-Rom). */
  function smooth(pts, closed = true, k = 0.18) {
    const n = pts.length;
    const g = (i) => pts[(i + n) % n];
    let d = `M${pt(pts[0])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = closed ? g(i - 1) : pts[Math.max(0, i - 1)], p1 = g(i), p2 = g(i + 1), p3 = closed ? g(i + 2) : pts[Math.min(n - 1, i + 2)];
      const c1 = add(p1, mul(sub(p2, p0), k)), c2 = sub(p2, mul(sub(p3, p1), k));
      d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
    }
    return d + (closed ? ' Z' : '');
  }
  function ellipse(c, rx, ry, rotDeg) {
    return { d: `M${f1(c.x - rx)} ${f1(c.y)} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`, tr: `rotate(${f1(rotDeg)} ${f1(c.x)} ${f1(c.y)})` };
  }
  /** Katman: önce kalın kontur, sonra dolgu — üst üste binen parçalar tek siluet olur. */
  function layer(shapes, ow = 2.4) {
    const s = shapes.filter(Boolean);
    const one = (x, stroke) => `<path d="${x.d}"${x.tr ? ` transform="${x.tr}"` : ''} fill="${stroke ? x.o : x.f}"${stroke ? ` stroke="${x.o}" stroke-width="${x.ow || ow}" stroke-linejoin="round"` : ''}/>`;
    return `<g>${s.map((x) => one(x, true)).join('')}${s.map((x) => one(x, false)).join('')}</g>`;
  }
  const line = (d, c, w = 1.3, op = 0.55) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;

  // ------------------------------------------------------------ renkler
  const PAL = {
    m: { skin: '#EDC2A2', skinO: '#B5826A', skinS: '#DDAE8E', top: '#F6F3EC', topO: '#AFA796', topS: '#E3DDD0', bot: '#55647A', botO: '#36404E', botS: '#47546A',
      cap: '#FFFFFF', capO: '#BDBDBD', hair: '#3A2A20', fold: '#A99F8D' },
    f: { skin: '#EDC2A2', skinO: '#B5826A', skinS: '#DDAE8E', top: '#7B66B3', topO: '#4C3C7E', topS: '#6A56A2', bot: '#7B66B3', botO: '#4C3C7E', botS: '#6A56A2',
      scarf: '#E8C6BA', scarfO: '#AE877B', scarfS: '#D9B2A5', fold: '#4C3C7E' },
  };
  const L = { UA: 40, FA: 34, TH: 50, SH: 47, HEAD: 13 };

  // ------------------------------------------------------------ parçalar
  function footShape(A, angle, c, shade) {
    const local = 'M-5 -2 C-5 -6 -1 -8 3 -7 C9 -6 15 -3 21 -1 C24 0 24 4 21 5 L-3 5 C-7 5 -7 1 -5 -2 Z';
    return { d: local, tr: `translate(${f1(A.x)} ${f1(A.y)}) rotate(${f1(angle)})`, f: shade ? c.skinS : c.skin, o: c.skinO };
  }
  function handShape(W, angle, kind, c, shade) {
    const f = shade ? c.skinS : c.skin;
    const u = dir(angle);
    if (kind === 'up') { // avuç kıbleye dönük, parmaklar yukarı (yandan ince görünür)
      const e = ellipse(add(W, mul(u, 8)), 9, 4.2, angle);
      const th = ellipse(add(add(W, mul(u, 3)), mul(perp(u), -4)), 4, 2.2, angle - 35);
      return [{ ...e, f, o: c.skinO }, { ...th, f, o: c.skinO }];
    }
    if (kind === 'flat') { // yere ya da dize düz konmuş el
      const e = ellipse(add(W, mul(u, 8)), 9.5, 3.6, angle);
      return [{ ...e, f, o: c.skinO }];
    }
    // tutan/bağlı el
    const e = ellipse(add(W, mul(u, 6)), 7.5, 5, angle);
    const th = ellipse(add(add(W, mul(u, 3)), mul(perp(u), -4.5)), 3.5, 2.2, angle + 30);
    return [{ ...e, f, o: c.skinO }, { ...th, f, o: c.skinO }];
  }

  /** Baş: yerel koordinatta yüz +x yönüne bakar; ha açısıyla döndürülür. */
  function headSvg(C, ha, g, c) {
    const tr = `translate(${f1(C.x)} ${f1(C.y)}) rotate(${f1(ha)})`;
    const headD = 'M-12 -2 C-12 -14 -2 -16 4 -14 C10 -12 13 -7 13 -2 L15.5 3.2 C15.8 4 15 4.6 14 4.8 L12.8 5.2 C13.2 7.6 12.6 9.6 11.4 11 C9.4 13.8 5.6 15 2 14.2 C-4 13 -8 10.4 -10.2 6.4 C-12 3.6 -12 1 -12 -2 Z';
    const face = `<ellipse cx="6.8" cy="-3" rx="1.5" ry="1.9" fill="#2E2420"/><path d="M4.2 -6.4 Q7 -7.8 9.6 -6.4" fill="none" stroke="#5A4033" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M10.2 8.4 Q11.6 9 12.4 8.3" fill="none" stroke="#A55B4B" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="6" cy="4.5" rx="3" ry="2" fill="#F2A1A1" opacity=".35"/>`;
    if (g === 'm') {
      const hair = 'M-12.6 -1 C-13.4 -10 -7 -15 0 -14.5 L-1 -6 C-6 -6 -8 -2 -9.5 3 C-11.2 2.6 -12.4 1 -12.6 -1 Z';
      return `<g transform="${tr}">
        ${layer([{ d: headD, f: c.skin, o: c.skinO }], 2)}
        <path d="${hair}" fill="${c.hair}"/>
        ${layer([{ d: 'M-3.6 1 C-3.6 -2.6 0.8 -2.6 0.8 1 C0.8 4.4 -3.6 4.6 -3.6 1 Z', f: c.skinS, o: c.skinO }], 1.4)}
        ${face}
        ${layer([{ d: 'M-13 -4.2 C-13 -15.6 0 -18.6 8.4 -13.8 C11 -12.4 12.4 -10 12.8 -7.6 L-13 -4.2 Z', f: c.cap, o: c.capO }], 1.6)}
        ${line('M-11 -6.8 L11 -9.6', '#CFCFCF', 1, 0.9)}${line('M-9 -10 L8 -12.4', '#DADADA', 1, 0.8)}
      </g>`;
    }
    const wrap = 'M7 -13.6 C2 -20 -14 -19.6 -16.6 -6 C-18.4 4 -14.6 13 -8.6 18.6 L-4 25 L6 22 C3 18 1.4 16.6 0.6 14 C-1.6 6 -0.6 -4 7 -13.6 Z';
    const faceD = 'M5 -12.4 C10.6 -11 13 -7 13 -2 L15.5 3.2 C15.8 4 15 4.6 14 4.8 L12.8 5.2 C13.2 7.6 12.6 9.6 11.4 11 C9.6 13.6 6.4 14.8 2.6 14.4 C0.4 8 0.6 -4 5 -12.4 Z';
    return `<g transform="${tr}">
      ${layer([{ d: wrap, f: c.scarf, o: c.scarfO }], 2)}
      ${layer([{ d: faceD, f: c.skin, o: c.skinO }], 1.6)}
      ${face}
      ${line('M5.4 -12.6 C0.6 -4 0 6 2.4 14.6', c.scarfO, 1.4, 0.8)}
      ${line('M-6 -14 C-11 -9 -12.6 0 -9 10', c.scarfO, 1, 0.45)}
    </g>`;
  }

  // ------------------------------------------------------------ yandan figür
  /**
   * q: { H, N, ha, arm:{W, E?, bend, ha, hk}, arm2?, leg:{A, K?, bend, fa}, leg2?, stand?, sit? }
   */
  function sideFigure(q, g) {
    const c = PAL[g];
    const d = norm(sub(q.H, q.N));               // omurga yönü (aşağı)
    const fr = P(d.y, -d.x);                      // göğüs (ön) yönü
    const S = add(add(q.N, mul(d, 7)), mul(fr, 1));
    const C = add(q.N, mul(dir(q.ha - 90), 20));
    const out = [];

    // bacak hesapları
    function legJ(spec, hip) {
      const K = spec.K || ik(hip, spec.A, L.TH, L.SH, spec.bend == null ? -1 : spec.bend);
      const A = spec.K ? spec.A : add(K, mul(norm(sub(spec.A, K)), L.SH));
      return { K, A };
    }
    function armJ(spec, sh) {
      const E = spec.E || ik(sh, spec.W, L.UA, L.FA, spec.bend == null ? 1 : spec.bend);
      const W = spec.E ? spec.W : add(E, mul(norm(sub(spec.W, E)), L.FA));
      return { E, W };
    }
    const leg = legJ(q.leg, q.H);
    const leg2 = legJ(q.leg2 || { ...q.leg, A: add(q.leg.A, P(-7, 0)), K: q.leg.K && add(q.leg.K, P(-5, -2)) }, add(q.H, P(-3, 0)));
    const arm = armJ(q.arm, S);
    const S2 = add(S, mul(fr, -3));
    const arm2spec = q.arm2 || { ...q.arm, W: add(q.arm.W, P(-4, -2)), E: q.arm.E && add(q.arm.E, P(-4, -2)) };
    const arm2 = armJ(arm2spec, S2);
    const fem = g === 'f';
    const thW = fem ? [36, 33] : [24, 20], shW = fem ? [33, 36] : [19, 16];

    // arka bacak
    out.push(layer([
      footShape(leg2.A, q.leg2 ? q.leg2.fa : q.leg.fa, c, true),
      { d: limb(add(q.H, P(-3, 0)), leg2.K, thW[0], thW[1]), f: c.botS, o: c.botO },
      { d: limb(leg2.K, leg2.A, shW[0], shW[1]), f: c.botS, o: c.botO },
    ]));
    // arka kol
    out.push(layer([
      { d: limb(S2, arm2.E, 13, 11), f: c.topS, o: c.topO },
      { d: limb(arm2.E, arm2.W, 11, 9), f: c.topS, o: c.topO },
      ...handShape(arm2.W, arm2spec.ha, arm2spec.hk, c, true),
    ]));
    // gövde
    const fo = fem ? [10, 17, 15, 15, 18] : [10, 16, 15, 14, 15];
    const bo = fem ? [11, 14, 12, 13, 18] : [12, 15, 13, 13, 16];
    const ts = [0, 0.2, 0.45, 0.75, 1];
    const front = ts.map((t, i) => add(lerp(q.N, q.H, t), mul(fr, fo[i])));
    const back = ts.map((t, i) => add(lerp(q.N, q.H, t), mul(fr, -bo[i]))).reverse();
    const torsoParts = [{ d: smooth([...front, ...back]), f: c.top, o: c.topO }];
    if (!fem) torsoParts.push({ d: limb(q.H, lerp(q.H, leg.K, 0.5), 34, 28), f: c.top, o: c.topO });
    // ön bacak (+ kadınlarda etek)
    const legParts = [
      footShape(leg.A, q.leg.fa, c, false),
      { d: limb(q.H, leg.K, thW[0], thW[1]), f: c.bot, o: c.botO },
      { d: limb(leg.K, leg.A, shW[0], shW[1]), f: c.bot, o: c.botO },
    ];
    if (fem && q.stand) {
      const gy = Math.max(leg.A.y, leg2.A.y) + 1;
      legParts.push({ d: smooth([add(q.H, mul(fr, -18)), add(q.H, mul(fr, 16)), P(leg.A.x + 25, gy - 4), P(leg.A.x + 18, gy + 2), P(leg2.A.x - 16, gy + 2), P(leg2.A.x - 22, gy - 4)]), f: c.bot, o: c.botO });
    }
    if (fem && q.sit) {
      legParts.push({ d: smooth([add(lerp(q.N, q.H, 0.6), mul(fr, 15)), add(leg.K, P(4, -15)), add(leg.K, P(17, 2)), P(leg.K.x + 6, 216), P(q.H.x - 24, 216), add(q.H, P(-22, -12))]), f: c.bot, o: c.botO });
    }
    if (fem) out.push(layer(legParts));
    out.push(layer(torsoParts));
    if (!fem) out.push(layer(legParts));
    // kıvrımlar
    if (!fem) {
      out.push(line(`M${pt(add(lerp(q.N, q.H, 0.82), mul(fr, 13)))} Q${pt(add(lerp(q.N, q.H, 0.86), mul(fr, 2)))} ${pt(add(lerp(q.N, q.H, 0.8), mul(fr, -12)))}`, c.fold, 1.2, 0.5));
      out.push(line(`M${pt(add(q.N, mul(fr, 9)))} L${pt(add(lerp(q.N, q.H, 0.35), mul(fr, 8)))}`, c.fold, 1.1, 0.6));
    } else {
      out.push(line(`M${pt(add(lerp(q.N, q.H, 0.9), mul(fr, 6)))} Q${pt(add(lerp(q.N, q.H, 0.95), mul(fr, -4)))} ${pt(add(lerp(q.N, q.H, 0.88), mul(fr, -12)))}`, '#3A2D66', 1.1, 0.4));
    }
    // boyun / başörtüsü dökümü
    if (!fem) out.push(layer([{ d: limb(add(q.N, mul(d, 2)), add(C, mul(dir(q.ha + 90), 6)), 11, 10), f: c.skin, o: c.skinO }], 2));
    else {
      const dp = [add(add(q.N, mul(fr, -13)), mul(d, -4)), add(add(q.N, mul(fr, -18)), mul(d, 16)), add(add(q.N, mul(fr, -6)), mul(d, 30)),
        add(add(q.N, mul(fr, 8)), mul(d, 34)), add(add(q.N, mul(fr, 17)), mul(d, 18)), add(add(q.N, mul(fr, 11)), mul(d, -3))];
      out.push(layer([{ d: smooth(dp), f: c.scarf, o: c.scarfO }]));
      out.push(line(`M${pt(add(add(q.N, mul(fr, -4)), mul(d, 4)))} Q${pt(add(add(q.N, mul(fr, 2)), mul(d, 20)))} ${pt(add(add(q.N, mul(fr, 2)), mul(d, 31)))}`, c.scarfO, 1.1, 0.5));
    }
    out.push(headSvg(C, q.ha, g, c));
    // ön kol
    out.push(layer([
      { d: limb(S, arm.E, 14, 12), f: c.top, o: c.topO },
      { d: limb(arm.E, arm.W, 12, 9.5), f: c.top, o: c.topO },
      ...handShape(arm.W, q.arm.ha, q.arm.hk, c, false),
    ]));
    out.push(line(`M${pt(add(arm.E, mul(perp(norm(sub(arm.W, arm.E))), 3)))} L${pt(lerp(arm.E, arm.W, 0.5))}`, c.fold, 1, 0.45));
    return out.join('');
  }

  // ------------------------------------------------------------ önden oturan figür (selam)
  function frontSeated(g, side) {
    const c = PAL[g];
    const fem = g === 'f';
    const cx = 120;
    const out = [];
    // dizler ve bacaklar
    if (fem) {
      out.push(layer([{ d: smooth([P(64, 218), P(70, 190), P(92, 176), P(148, 176), P(170, 190), P(176, 218)]), f: c.bot, o: c.botO }]));
    } else {
      out.push(layer([
        { d: smooth([P(66, 219), P(68, 196), P(86, 184), P(112, 186), P(116, 212), P(110, 220)]), f: c.bot, o: c.botO },
        { d: smooth([P(174, 219), P(172, 196), P(154, 184), P(128, 186), P(124, 212), P(130, 220)]), f: c.bot, o: c.botO },
      ]));
    }
    // gövde
    const torso = smooth([P(cx - 38, 116), P(cx + 38, 116), P(cx + 32, 150), P(cx + 30, 184), P(cx, 190), P(cx - 30, 184), P(cx - 32, 150)]);
    out.push(layer([{ d: torso, f: c.top, o: c.topO }]));
    if (!fem) {
      out.push(line(`M${cx} 116 L${cx} 142`, c.fold, 1.2, 0.6));
      out.push(line(`M${cx - 24} 176 Q${cx} 182 ${cx + 24} 176`, c.fold, 1.2, 0.45));
    }
    // kollar ve eller (dizlerde)
    const arms = [];
    [[-1, P(cx - 36, 122)], [1, P(cx + 36, 122)]].forEach(([s, Sh]) => {
      const W = P(cx + s * 30, 196);
      const E = P(cx + s * 44, 160);
      arms.push({ d: limb(Sh, E, 15, 12), f: c.top, o: c.topO }, { d: limb(E, W, 12, 10), f: c.top, o: c.topO },
        { ...ellipse(P(cx + s * 26, 202), 8, 5.5, s * 15), f: c.skin, o: c.skinO });
    });
    out.push(layer(arms));
    // baş
    const hx = cx + side * 2, hy = 88;
    const rotA = side * 6;
    const faceShift = side * 5;
    const eyes = `<ellipse cx="${hx + faceShift - 6}" cy="${hy - 1}" rx="1.6" ry="2" fill="#2E2420"/><ellipse cx="${hx + faceShift + 6}" cy="${hy - 1}" rx="1.6" ry="2" fill="#2E2420"/>
      <path d="M${hx + faceShift - 9} ${hy - 6} Q${hx + faceShift - 6} ${hy - 8} ${hx + faceShift - 3} ${hy - 6} M${hx + faceShift + 3} ${hy - 6} Q${hx + faceShift + 6} ${hy - 8} ${hx + faceShift + 9} ${hy - 6}" fill="none" stroke="#5A4033" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M${hx + faceShift + side * 2} ${hy + 1} L${hx + faceShift + side * 5} ${hy + 7} L${hx + faceShift} ${hy + 8}" fill="none" stroke="${c.skinO}" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M${hx + faceShift - 4} ${hy + 12} Q${hx + faceShift} ${hy + 14} ${hx + faceShift + 4} ${hy + 12}" fill="none" stroke="#A55B4B" stroke-width="1.3" stroke-linecap="round"/>
      <ellipse cx="${hx + faceShift - 9}" cy="${hy + 6}" rx="3" ry="2" fill="#F2A1A1" opacity=".35"/><ellipse cx="${hx + faceShift + 9}" cy="${hy + 6}" rx="3" ry="2" fill="#F2A1A1" opacity=".35"/>`;
    if (!fem) {
      out.push(layer([{ d: limb(P(cx, 118), P(cx, 100), 16, 15), f: c.skin, o: c.skinO }]));
      out.push(`<g transform="rotate(${rotA} ${hx} ${hy})">
        ${layer([{ d: smooth([P(hx - 16, hy - 4), P(hx, hy - 22), P(hx + 16, hy - 4), P(hx + 13, hy + 12), P(hx, hy + 20), P(hx - 13, hy + 12)]), f: c.skin, o: c.skinO },
          { ...ellipse(P(hx - side * 16, hy + 1), 3.4, 5.5, 0), f: c.skinS, o: c.skinO }], 2)}
        <path d="M${hx - 16} ${hy - 4} C${hx - 15} ${hy - 12} ${hx - 8} ${hy - 16} ${hx} ${hy - 16} C${hx + 8} ${hy - 16} ${hx + 15} ${hy - 12} ${hx + 16} ${hy - 4} C${hx + 12} ${hy - 9} ${hx - 12} ${hy - 9} ${hx - 16} ${hy - 4} Z" fill="${c.hair}"/>
        ${eyes}
        ${layer([{ d: `M${hx - 16} ${hy - 8} C${hx - 15} ${hy - 25} ${hx + 15} ${hy - 25} ${hx + 16} ${hy - 8} Q${hx} ${hy - 13} ${hx - 16} ${hy - 8} Z`, f: c.cap, o: c.capO }], 1.6)}
      </g>`);
    } else {
      out.push(layer([{ d: smooth([P(cx - 30, 118), P(cx - 20, 108), P(cx, 100), P(cx + 20, 108), P(cx + 30, 118), P(cx + 16, 140), P(cx, 150), P(cx - 16, 140)]), f: c.scarf, o: c.scarfO }]));
      out.push(`<g transform="rotate(${rotA} ${hx} ${hy})">
        ${layer([{ d: smooth([P(hx - 21, hy), P(hx - 14, hy - 22), P(hx + 14, hy - 22), P(hx + 21, hy), P(hx + 17, hy + 22), P(hx, hy + 30), P(hx - 17, hy + 22)]), f: c.scarf, o: c.scarfO }], 2)}
        ${layer([{ d: smooth([P(hx + faceShift - 13, hy - 2), P(hx + faceShift, hy - 16), P(hx + faceShift + 13, hy - 2), P(hx + faceShift + 10, hy + 12), P(hx + faceShift, hy + 19), P(hx + faceShift - 10, hy + 12)]), f: c.skin, o: c.skinO }], 1.6)}
        ${eyes}
      </g>`);
    }
    // ok
    const ax = cx + side * 42, ay = 52;
    out.push(`<path d="M${cx - side * 4} ${ay + 4} Q${cx + side * 22} ${ay - 12} ${ax} ${ay}" fill="none" stroke="#FF9F43" stroke-width="5" stroke-linecap="round"/>
      <path d="M${ax - side * 10} ${ay - 9} L${ax} ${ay} L${ax - side * 12} ${ay + 5}" fill="none" stroke="#FF9F43" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="${cx + side * 50}" y="${ay - 16}" font-size="14" font-weight="800" fill="#E07B1A" text-anchor="middle" font-family="Baloo 2, sans-serif">${side < 0 ? 'Sağ omuz' : 'Sol omuz'}</text>`);
    return out.join('');
  }

  // ------------------------------------------------------------ duruşlar
  const STAND = (g) => {
    const f = g === 'f';
    return { H: P(108, 117), N: P(111, 59), ha: 0, stand: true, leg: { A: P(112, 213), bend: -1, fa: 0 }, leg2: { A: P(104, 213), bend: -1, fa: 0 } };
  };
  const POSES = {
    kavme: (g) => ({ ...STAND(g), arm: { W: P(115, 140), bend: 1, ha: 92, hk: 'flat' } }),
    niyet: (g) => ({ ...STAND(g), arm: { W: P(115, 140), bend: 1, ha: 92, hk: 'flat' } }),
    tekbir: (g) => g === 'm'
      ? { ...STAND(g), arm: { E: P(145, 88), W: P(125, 60), ha: -84, hk: 'up' }, arm2: { E: P(141, 86), W: P(121, 58), ha: -84, hk: 'up' } }
      : { ...STAND(g), arm: { E: P(140, 102), W: P(127, 80), ha: -84, hk: 'up' }, arm2: { E: P(136, 100), W: P(123, 78), ha: -84, hk: 'up' } },
    kiyam: (g) => g === 'm'
      ? { ...STAND(g), arm: { W: P(122, 108), bend: 1, ha: 5, hk: 'grip' }, arm2: { W: P(124, 105), bend: 1, ha: 5, hk: 'grip' } }
      : { ...STAND(g), arm: { W: P(122, 84), bend: 1, ha: 10, hk: 'grip' }, arm2: { W: P(124, 81), bend: 1, ha: 10, hk: 'grip' } },
    ruku: (g) => g === 'm'
      ? { H: P(90, 120), N: P(149, 118), ha: 82, leg: { A: P(94, 213), bend: -1, fa: 0 }, leg2: { A: P(87, 213), bend: -1, fa: 0 }, arm: { W: P(103, 161), bend: 1, ha: 100, hk: 'grip' } }
      : { H: P(92, 121), N: P(145, 96), ha: 62, stand: true, leg: { A: P(96, 213), bend: -1, fa: 0 }, leg2: { A: P(89, 213), bend: -1, fa: 0 }, arm: { W: P(110, 164), bend: 1, ha: 92, hk: 'flat' } },
    secde: (g) => g === 'm'
      ? { H: P(98, 166), N: P(148, 196), ha: 108, leg: { K: P(104, 211), A: P(60, 198), fa: 72 }, leg2: { K: P(98, 210), A: P(54, 198), fa: 72 },
        arm: { W: P(166, 217), bend: -1, ha: 2, hk: 'flat' }, arm2: { W: P(160, 216), bend: -1, ha: 2, hk: 'flat' } }
      : { H: P(90, 188), N: P(141, 202), ha: 106, leg: { K: P(112, 212), A: P(66, 210), fa: 12 }, leg2: { K: P(106, 212), A: P(60, 210), fa: 12 },
        arm: { E: P(124, 213), W: P(150, 215), ha: 2, hk: 'flat' }, arm2: { E: P(118, 212), W: P(144, 214), ha: 2, hk: 'flat' } },
    kade: (g) => g === 'm'
      ? { H: P(100, 190), N: P(104, 133), ha: 18, leg: { K: P(150, 210), A: P(104, 213), fa: 182 }, leg2: { K: P(142, 208), A: P(94, 198), fa: 76 },
        arm: { W: P(138, 194), bend: 1, ha: 12, hk: 'flat' } }
      : { H: P(98, 206), N: P(101, 149), ha: 18, sit: true, leg: { K: P(148, 206), A: P(102, 212), fa: 182 }, leg2: { K: P(140, 206), A: P(66, 212), fa: 178 },
        arm: { W: P(134, 192), bend: 1, ha: 12, hk: 'flat' } },
  };

  function rug() {
    return `<g><rect x="16" y="222" width="208" height="10" rx="3" fill="#A93434"/><rect x="24" y="224.5" width="192" height="5" rx="2" fill="none" stroke="#E8B04B" stroke-width="1.4"/>
      ${[40, 70, 100, 130, 160, 190].map((x) => `<path d="M${x} 227 l4 -2 l4 2 l-4 2 Z" fill="#E8B04B"/>`).join('')}
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M${16 - 1} ${223.5 + i * 2} h-4 M${224 + 1} ${223.5 + i * 2} h4" stroke="#E8B04B" stroke-width="1"/>`).join('')}</g>`;
  }

  /** Dışa açık: duruş çizimi. pose: niyet|tekbir|kiyam|ruku|kavme|secde|kade|selamR|selamL; g: 'm'|'f' */
  function poseSvg(pose, opts = {}) {
    const g = opts.gender || (K.Store && K.Store.s.settings.namazGender) || 'm';
    let body;
    if (pose === 'selamR' || pose === 'selamL') body = frontSeated(g, pose === 'selamR' ? -1 : 1);
    else body = sideFigure((POSES[pose] || POSES.kavme)(g), g);
    const vb = opts.tight ? '20 10 210 225' : '0 0 240 240';
    return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img">${opts.noRug ? '' : rug()}${body}</svg>`;
  }

  // ------------------------------------------------------------ abdest (önden, belden yukarı)
  /** Dirseği gövdeden dışa doğru seçer (side: -1 sol taraf, +1 sağ taraf). */
  function ikOut(A, B, l1, l2, side) {
    const e1 = ik(A, B, l1, l2, 1), e2 = ik(A, B, l1, l2, -1);
    return (e1.x - e2.x) * side > 0 ? e1 : e2;
  }
  function faucet(cx, y = 8) {
    return `<g><rect x="${cx - 40}" y="${y}" width="80" height="12" rx="5" fill="#B8C4CF" stroke="#7B8794" stroke-width="2"/>
      <path d="M${cx - 6} ${y + 12} v14 q0 6 6 6 q6 0 6 -6 v-14 z" fill="#C9D3DC" stroke="#7B8794" stroke-width="2"/>
      <rect x="${cx - 12}" y="${y - 6}" width="24" height="7" rx="3" fill="#9AA7B3"/></g>`;
  }
  function water(x1, y1, x2, y2, w = 7) {
    return `<path d="M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}" fill="none" stroke="#6FC3F2" stroke-width="${w}" stroke-linecap="round" opacity=".75"/>
      <path d="M${x1 - 1} ${y1} C${x1 - 1} ${(y1 + y2) / 2} ${x2 - 1} ${(y1 + y2) / 2} ${x2 - 1} ${y2}" fill="none" stroke="#D8F1FF" stroke-width="2" stroke-linecap="round" opacity=".9"/>`;
  }
  function splash(x, y) {
    return [[-14, -4], [12, -6], [-6, 6], [16, 4], [0, -10]].map(([dx, dy], i) => `<path d="M${x + dx} ${y + dy} q2 -5 4 0 a2.4 2.4 0 1 1 -4 0 z" fill="#6FC3F2" opacity="${0.6 + (i % 2) * 0.3}"/>`).join('');
  }
  function bustHand(W, angle, c, kind, mirror) {
    const u = dir(angle), n = perp(u);
    const parts = [];
    if (kind === 'cup' || kind === 'open') {
      parts.push({ ...ellipse(add(W, mul(u, 12)), 14, kind === 'cup' ? 9 : 8, angle), f: c.skin, o: c.skinO });
      parts.push({ ...ellipse(add(add(W, mul(u, 7)), mul(n, (mirror ? -1 : 1) * 9)), 7, 3.6, angle - (mirror ? -40 : 40)), f: c.skin, o: c.skinO });
    } else if (kind === 'point') {
      parts.push({ ...ellipse(add(W, mul(u, 8)), 9, 8, angle), f: c.skin, o: c.skinO });
      parts.push({ d: limb(add(W, mul(u, 12)), add(W, mul(u, 30)), 6, 5), f: c.skin, o: c.skinO });
    } else {
      parts.push({ ...ellipse(add(W, mul(u, 11)), 13, 8.5, angle), f: c.skin, o: c.skinO });
    }
    return parts;
  }
  /** Abdest adımı: hedef el konumlarıyla önden figür. */
  const ABD = [
    { r: { W: P(100, 206), a: -100, k: 'open' }, l: { W: P(140, 206), a: -80, k: 'open' } },                       // niyet
    { r: { W: P(106, 210), a: -10, k: 'cup' }, l: { W: P(134, 210), a: 190, k: 'cup' }, tap: true, stream: [120, 172, 120, 204] },   // eller
    { r: { W: P(104, 134), a: -40, k: 'cup' }, l: { W: P(150, 230), a: -90, k: 'flat' }, drops: [116, 124] },          // ağız
    { r: { W: P(106, 120), a: -50, k: 'cup' }, l: { W: P(150, 230), a: -90, k: 'flat' }, drops: [119, 112] },          // burun
    { r: { W: P(86, 104), a: -80, k: 'flat' }, l: { W: P(154, 104), a: -100, k: 'flat' }, drops: [120, 96] },          // yüz
    { r: { W: P(150, 196), a: -12, k: 'flat' }, rE: P(84, 214), l: { W: P(110, 186), a: 200, k: 'cup' }, tap: true, stream: [136, 160, 136, 188] }, // sağ kol
    { r: { W: P(130, 186), a: -20, k: 'cup' }, l: { W: P(90, 196), a: 192, k: 'flat' }, lE: P(156, 214), tap: true, stream: [104, 160, 104, 188] },  // sol kol
    { r: { W: P(106, 60), a: 10, k: 'flat' }, rE: P(50, 104), l: { W: P(134, 60), a: 170, k: 'flat' }, lE: P(190, 104) }, // baş mesh
    { r: { W: P(84, 102), a: -70, k: 'point' }, l: { W: P(156, 102), a: -110, k: 'point' } },                          // kulak
    { r: { W: P(94, 140), a: -60, k: 'flat' }, l: { W: P(146, 140), a: -120, k: 'flat' } },                            // boyun
    { foot: 1 }, { foot: -1 },                                                                                         // ayaklar
    { r: { W: P(100, 206), a: -100, k: 'open' }, l: { W: P(140, 206), a: -80, k: 'open' }, look: -6 },                 // şehadet
  ];
  function abdestSvg(i, g) {
    g = g || (K.Store && K.Store.s.settings.namazGender) || 'm';
    const c = PAL[g], fem = g === 'f';
    const st = ABD[i] || ABD[0];
    const out = [];
    if (st.foot) {
      const s = st.foot;
      const fx = s > 0 ? 70 : 170;
      out.push(`<rect x="20" y="196" width="200" height="26" rx="10" fill="#DDEFF8" stroke="#9CC9E0" stroke-width="2"/>`);
      out.push(faucet(120));
      out.push(water(120, 40, 120, 150, 8));
      out.push(layer([{ d: limb(P(fx - s * 6, 40), P(fx + s * 4, 140), fem ? 48 : 34, fem ? 46 : 30), f: c.bot, o: c.botO }]));
      out.push(`<g transform="translate(${fx} 150) scale(${s * 4.2} 4.2)">${layer([{ d: 'M-5 -2 C-5 -6 -1 -8 3 -7 C9 -6 15 -3 21 -1 C24 0 24 4 21 5 L-3 5 C-7 5 -7 1 -5 -2 Z', f: c.skin, o: c.skinO }], 0.6)}</g>`);
      out.push(layer([...bustHand(P(120 - s * 10, 108), s > 0 ? 40 : 140, c, 'flat', s < 0)]));
      out.push(splash(120, 160) + splash(150, 176));
      return `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
    }
    const cx = 120, hy = 92;
    // gövde
    out.push(layer([{ d: smooth([P(52, 240), P(58, 176), P(78, 156), P(120, 150), P(162, 156), P(182, 176), P(188, 240)]), f: c.top, o: c.topO }]));
    if (!fem) out.push(line('M120 152 L120 196', c.fold, 1.4, 0.6));
    // boyun ve baş
    const look = st.look || 0;
    if (!fem) {
      out.push(layer([{ d: limb(P(cx, 160), P(cx, 128), 26, 24), f: c.skin, o: c.skinO }]));
      out.push(layer([{ ...ellipse(P(cx - 31, hy + 2), 5, 8, 0), f: c.skinS, o: c.skinO }, { ...ellipse(P(cx + 31, hy + 2), 5, 8, 0), f: c.skinS, o: c.skinO },
        { d: smooth([P(cx - 30, hy - 6), P(cx, hy - 36), P(cx + 30, hy - 6), P(cx + 25, hy + 22), P(cx, hy + 36), P(cx - 25, hy + 22)]), f: c.skin, o: c.skinO }]));
      out.push(`<path d="M${cx - 30} ${hy - 6} C${cx - 30} ${hy - 30} ${cx - 14} ${hy - 37} ${cx} ${hy - 37} C${cx + 14} ${hy - 37} ${cx + 30} ${hy - 30} ${cx + 30} ${hy - 6} C${cx + 22} ${hy - 20} ${cx - 22} ${hy - 22} ${cx - 30} ${hy - 6} Z" fill="${c.hair}"/>`);
    } else {
      out.push(layer([{ d: smooth([P(cx - 52, 168), P(cx - 34, 140), P(cx, 128), P(cx + 34, 140), P(cx + 52, 168), P(cx + 22, 196), P(cx, 204), P(cx - 22, 196)]), f: c.scarf, o: c.scarfO }]));
      out.push(layer([{ d: smooth([P(cx - 38, hy), P(cx - 26, hy - 40), P(cx + 26, hy - 40), P(cx + 38, hy), P(cx + 30, hy + 38), P(cx, hy + 52), P(cx - 30, hy + 38)]), f: c.scarf, o: c.scarfO }]));
      out.push(layer([{ d: smooth([P(cx - 25, hy - 2), P(cx, hy - 30), P(cx + 25, hy - 2), P(cx + 20, hy + 22), P(cx, hy + 34), P(cx - 20, hy + 22)]), f: c.skin, o: c.skinO }], 2));
    }
    const ey = hy - 2 + look;
    out.push(`<ellipse cx="${cx - 11}" cy="${ey}" rx="2.6" ry="3.2" fill="#2E2420"/><ellipse cx="${cx + 11}" cy="${ey}" rx="2.6" ry="3.2" fill="#2E2420"/>
      <circle cx="${cx - 10}" cy="${ey - 1.2}" r=".9" fill="#fff"/><circle cx="${cx + 12}" cy="${ey - 1.2}" r=".9" fill="#fff"/>
      <path d="M${cx - 17} ${ey - 9} Q${cx - 11} ${ey - 12} ${cx - 5} ${ey - 9} M${cx + 5} ${ey - 9} Q${cx + 11} ${ey - 12} ${cx + 17} ${ey - 9}" fill="none" stroke="#5A4033" stroke-width="2" stroke-linecap="round"/>
      <path d="M${cx} ${hy + 2} L${cx + 3} ${hy + 12} L${cx - 2} ${hy + 13}" fill="none" stroke="${c.skinO}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M${cx - 7} ${hy + 21} Q${cx} ${hy + 25} ${cx + 7} ${hy + 21}" fill="none" stroke="#A55B4B" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="${cx - 17}" cy="${hy + 11}" rx="5" ry="3" fill="#F2A1A1" opacity=".35"/><ellipse cx="${cx + 17}" cy="${hy + 11}" rx="5" ry="3" fill="#F2A1A1" opacity=".35"/>`);
    // kollar
    const SR = P(78, 166), SL = P(162, 166);
    const ER = st.rE || ikOut(SR, st.r.W, 54, 48, -1), EL = st.lE || ikOut(SL, st.l.W, 54, 48, 1);
    const arms = [
      { d: limb(SR, ER, 19, 16), f: c.top, o: c.topO }, { d: limb(ER, st.r.W, 16, 13), f: c.top, o: c.topO },
      { d: limb(SL, EL, 19, 16), f: c.top, o: c.topO }, { d: limb(EL, st.l.W, 16, 13), f: c.top, o: c.topO },
      ...bustHand(st.r.W, st.r.a, c, st.r.k, false), ...bustHand(st.l.W, st.l.a, c, st.l.k, true),
    ];
    out.push(layer(arms));
    if (st.tap) out.push(faucet(st.stream[0], st.stream[1] - 32) + water(st.stream[0], st.stream[1], st.stream[2], st.stream[3]) + splash(st.stream[2], st.stream[3] + 10));
    if (st.drops) out.push(splash(st.drops[0], st.drops[1]));
    return `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`;
  }

  K.Fig = { abdestSvg, poseSvg, sideFigure, frontSeated, PAL, POSES, ik, limb, smooth, layer, ellipse, P, add, sub, mul, norm, perp, lerp, dir, pt, headSvg };
})();
