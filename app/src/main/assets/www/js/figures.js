/* Namaz ve abdest çizimleri (v3): gerçek insan oranlarında, ışık-gölgeli, kas hatlı vektör figürler.
   Duruşlar Diyanet İşleri Başkanlığı Din İşleri Yüksek Kurulu açıklamalarına (Hanefî) göredir:
   - Tekbir: erkek avuçlar kıbleye, başparmaklar kulak yumuşağı hizasında; kadın eller omuz hizasında.
   - Kıyam: erkek sağ el sol elin üstünde, başparmak ve serçe parmakla sol bilek kavranır, göbek altında;
            kadın sağ el sol elin üstünde, kavramadan göğüs üzerinde. Ayaklar arası dört parmak, bakış secde yerine.
   - Rükû: erkek sırt ve baş düz, dizler dik (bükülmez), parmaklar açık dizleri kavrar;
           kadın daha az eğilir, dizler hafif bükük, parmaklar bitişik eller dizlerin üzerinde.
   - Secde: alın ve burun yerde, baş iki elin arasında, ayak parmakları yerde; erkek kollar yanlardan ve yerden uzak,
            karın uyluklardan ayrı; kadın kollar yanlara bitişik, karın uyluklara yakın.
   - Oturuş: erkek sol ayağı yatırıp üzerine oturur, sağ ayak parmakları kıbleye dik; kadın ayaklarını sağ taraftan
             çıkararak yere oturur. Eller uylukların üzerinde, parmak uçları diz hizasında.
   - Selam: baş önce sağ omza, sonra sol omza çevrilir. */
window.K = window.K || {};
(function () {
  // ------------------------------------------------------------ vektör
  const P = (x, y) => ({ x, y });
  const add = (a, b) => P(a.x + b.x, a.y + b.y), sub = (a, b) => P(a.x - b.x, a.y - b.y), mul = (a, k) => P(a.x * k, a.y * k);
  const len = (a) => Math.hypot(a.x, a.y), norm = (a) => { const l = len(a) || 1; return P(a.x / l, a.y / l); };
  const lerp = (a, b, t) => P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  const rot = (u, d) => { const r = d * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return P(u.x * c - u.y * s, u.x * s + u.y * c); };
  const front = (u) => P(u.y, -u.x);           // yöne göre "ön" normal (yüz sağa bakar)
  const dir = (d) => P(Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180));
  const ang = (u) => Math.atan2(u.y, u.x) * 180 / Math.PI;
  const f1 = (n) => Math.round(n * 100) / 100;
  const pt = (p) => `${f1(p.x)} ${f1(p.y)}`;
  let UID = 0;
  const uid = (p) => p + (++UID) + Math.random().toString(36).slice(2, 6);

  function ik(A, B, l1, l2, bend) {
    const d = sub(B, A);
    let dist = Math.min(Math.max(len(d), Math.abs(l1 - l2) + 0.1), l1 + l2 - 0.05);
    const u = norm(d);
    const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return add(add(A, mul(u, a)), mul(P(-u.y, u.x), h * bend));
  }
  function smooth(pts, closed = true, k = 0.17) {
    const n = pts.length;
    const g = (i) => pts[((i % n) + n) % n];
    let d = `M${pt(pts[0])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = closed ? g(i - 1) : pts[Math.max(0, i - 1)], p1 = g(i), p2 = g(i + 1), p3 = closed ? g(i + 2) : pts[Math.min(n - 1, i + 2)];
      d += ` C${pt(add(p1, mul(sub(p2, p0), k)))} ${pt(sub(p2, mul(sub(p3, p1), k)))} ${pt(p2)}`;
    }
    return d + (closed ? ' Z' : '');
  }
  /** Eklem zinciri boyunca kas profilli dış hat. prof(s) → [ön, arka] yarı genişlik. */
  function sweep(chain, prof, opts = {}) {
    const segs = [];
    let total = 0;
    for (let i = 0; i < chain.length - 1; i++) { const l = len(sub(chain[i + 1], chain[i])); segs.push(l); total += l; }
    const A = [], B = [];
    let acc = 0;
    const N = opts.n || 7;
    for (let i = 0; i < segs.length; i++) {
      const a = chain[i], b = chain[i + 1], u = norm(sub(b, a));
      for (let k = 0; k <= N; k++) {
        if (i > 0 && k === 0) continue;
        const t = k / N;
        const p = lerp(a, b, t);
        let nrm = front(u);
        // eklemlerde normalleri yumuşat
        if (k === N && i < segs.length - 1) nrm = norm(add(front(u), front(norm(sub(chain[i + 2], chain[i + 1])))));
        if (k === 0 && i === 0 && opts.startN) nrm = opts.startN;
        const s = (acc + segs[i] * t) / total;
        const [wf, wb] = prof(s);
        A.push(add(p, mul(nrm, wf)));
        B.push(sub(p, mul(nrm, wb)));
      }
      acc += segs[i];
    }
    // uç kapakları
    const endU = norm(sub(chain[chain.length - 1], chain[chain.length - 2]));
    const [ef, eb] = prof(1);
    const endCap = opts.flatEnd ? [] : [add(chain[chain.length - 1], mul(endU, Math.min(ef, eb) * 0.6))];
    const stU = norm(sub(chain[1], chain[0]));
    const [sf, sb] = prof(0);
    const stCap = opts.flatStart ? [] : [sub(chain[0], mul(stU, Math.min(sf, sb) * 0.55))];
    return smooth([...A, ...endCap, ...B.reverse(), ...stCap]);
  }
  const prof = (stops) => (s) => {
    for (let i = 0; i < stops.length - 1; i++) {
      const [s0, f0, b0] = stops[i], [s1, f2, b2] = stops[i + 1];
      if (s >= s0 && s <= s1) { const t = (s - s0) / (s1 - s0 || 1); const e = t * t * (3 - 2 * t); return [f0 + (f2 - f0) * e, b0 + (b2 - b0) * e]; }
    }
    const l = stops[stops.length - 1]; return [l[1], l[2]];
  };
  /** Yerel koordinatlı noktaları bir çerçeveye taşır: o=orijin, u=yukarı ekseni, f=ön ekseni. */
  const frame = (o, up) => { const u = norm(up), f = front(P(-u.x, -u.y)); return (a, b) => add(add(o, mul(u, a)), mul(f, b)); };

  // ------------------------------------------------------------ boyama (ışık-gölge)
  const LIGHT = P(-3, -4);
  /** Gölgeli şekil: taban + gölge kenarı + ışık kenarı + ince kontur. c: {b, d, l, o} */
  function shade(d, c, o = {}) {
    const id = uid('k');
    const rim = o.rim || 9, lw = o.lw == null ? 0.9 : o.lw;
    const tr = o.tr ? ` transform="${o.tr}"` : '';
    return `<g${tr}><clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${c.b}"/>
      <g clip-path="url(#${id})"><path d="${d}" fill="none" stroke="${c.d}" stroke-width="${rim}" filter="url(#fb4)" transform="translate(${LIGHT.x} ${LIGHT.y})" opacity="${o.dop || 0.9}"/>
      <path d="${d}" fill="none" stroke="${c.l}" stroke-width="${rim * 0.55}" filter="url(#fb3)" transform="translate(${-LIGHT.x * 0.7} ${-LIGHT.y * 0.7})" opacity="${o.lop || 0.75}"/>${o.inner || ''}</g>
      ${lw ? `<path d="${d}" fill="none" stroke="${c.o}" stroke-width="${lw}" stroke-linejoin="round" opacity=".85"/>` : ''}</g>`;
  }
  const crease = (d, c, w = 1.2, op = 0.55) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${op}" filter="url(#fb05)"/>`;
  const dropShadow = (d, dx = 2.5, dy = 3, op = 0.25) => `<path d="${d}" fill="#3a2a20" opacity="${op}" filter="url(#fb3)" transform="translate(${dx} ${dy})"/>`;
  const DEFS = `<defs>
    <filter id="fb05" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".5"/></filter>
    <filter id="fb3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="fb4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.4"/></filter>
    <filter id="fb8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <radialGradient id="gBg" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#FFFDF8"/><stop offset="1" stop-color="#F3EBDD"/></radialGradient>
  </defs>`;

  // ------------------------------------------------------------ renkler
  const SKIN = { b: '#E3B08E', d: '#B97E5C', l: '#F6D2B6', o: '#8E5A3E' };
  const SKIN_FAR = { b: '#CF9C7B', d: '#A76D4E', l: '#E6BE9F', o: '#7E4E34' };
  const C = {
    m: {
      top: { b: '#EEEAE1', d: '#B9B2A3', l: '#FFFFFF', o: '#7D766A' }, topFar: { b: '#D9D3C7', d: '#A7A091', l: '#EDE9E1', o: '#6E675C' },
      bot: { b: '#4B5568', d: '#2E3544', l: '#6D7891', o: '#20252F' }, botFar: { b: '#3E4757', d: '#262C38', l: '#58627A', o: '#1A1E26' },
      cap: { b: '#FBFBF8', d: '#D2CFC6', l: '#FFFFFF', o: '#9B978D' }, hair: '#2A1F18', beard: '#33261D',
    },
    f: {
      top: { b: '#C9D3E2', d: '#8E9CB5', l: '#EAF0F7', o: '#5B6884' }, topFar: { b: '#B3BFD1', d: '#7D8AA3', l: '#D3DCE8', o: '#4F5B74' },
      bot: { b: '#C9D3E2', d: '#8E9CB5', l: '#EAF0F7', o: '#5B6884' }, botFar: { b: '#B3BFD1', d: '#7D8AA3', l: '#D3DCE8', o: '#4F5B74' },
      hair: '#2A1F18',
    },
  };

  // ------------------------------------------------------------ baş (yandan, yüz +x yönüne; yerel ölçek ~28px)
  const HEAD_M = 'M-1 -15 C6 -15.5 10.6 -12 11.5 -7.2 C11.8 -5.6 11.7 -4.6 12.3 -3.6 C12.8 -2.4 13 -0.8 13.8 1.2 C14.4 2.6 14.8 3.5 14.1 4.2 C13.5 4.8 12.7 4.6 12.1 5 C12.5 5.8 12.7 6.4 12.3 7 C12.7 7.6 12.5 8.4 11.9 8.8 C11.4 9.4 11.8 10.6 11.4 11.6 C10.6 13.2 8.6 13.6 6.4 13 C3.5 12.4 1 11 -1.5 8.5 C-3 7 -5 7.6 -8 7.6 C-11.5 6 -13 1 -12.6 -4 C-12.2 -10 -7.4 -15 -1 -15 Z';
  const HEAD_F = 'M-1 -14.6 C6 -15 10.2 -11.8 11.2 -7.2 C11.5 -5.6 11.4 -4.6 12 -3.6 C12.5 -2.4 12.6 -0.9 13.3 1 C13.8 2.3 14.1 3.2 13.5 3.9 C13 4.4 12.3 4.3 11.8 4.7 C12.3 5.5 12.6 6.2 12.2 6.9 C12.7 7.6 12.4 8.5 11.8 8.9 C11.2 9.5 11.5 10.5 11 11.4 C10 12.9 8.2 13.1 6.2 12.6 C3.4 11.9 1 10.6 -1.4 8.3 C-3 7 -5 7.4 -8 7.4 C-11.3 5.8 -12.6 1 -12.2 -4 C-11.8 -9.8 -7.2 -14.6 -1 -14.6 Z';
  function faceDetails(g) {
    const brow = g === 'm' ? '#3A2A20' : '#4A3428';
    return `<path d="M4.8 -2.3 Q6.7 -3.6 8.6 -2.5 Q7 -1.2 4.8 -2.3 Z" fill="#FFFFFF" opacity=".9"/>
      <circle cx="7.4" cy="-2.35" r="0.95" fill="#2A1C14"/>
      <path d="M4.7 -2.4 Q6.7 -3.9 8.8 -2.6" fill="none" stroke="#3A2418" stroke-width=".9" stroke-linecap="round"/>
      ${g === 'f' ? '<path d="M8.4 -2.8 l1 -0.8 M8.7 -2.4 l1.1 -0.5" stroke="#3A2418" stroke-width=".5"/>' : ''}
      <path d="M4 -5.2 Q7.2 -6.8 10.8 -5.4" fill="none" stroke="${brow}" stroke-width="${g === 'm' ? 1.5 : 1.1}" stroke-linecap="round"/>
      <path d="M11.6 3.4 Q12.6 4.6 13.4 4" fill="none" stroke="#9A5E44" stroke-width=".8" stroke-linecap="round"/>
      <path d="M11.4 7 L12.6 7.05" stroke="#9C5546" stroke-width=".8" stroke-linecap="round"/>
      <path d="M11.9 7.2 Q12.3 8 11.8 8.6" fill="none" stroke="#C47A6A" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>
      <ellipse cx="6.5" cy="3.5" rx="3.4" ry="2.2" fill="#E88F80" opacity="${g === 'f' ? 0.28 : 0.15}" filter="url(#fb05)"/>`;
  }
  /** Yandan baş: C merkez, a açı (0: yüz sağa), g cinsiyet, s ölçek. */
  function headSide(Cp, a, g, s = 1, o = {}) {
    const tr = `translate(${f1(Cp.x)} ${f1(Cp.y)}) rotate(${f1(a)}) scale(${s})`;
    const c = C[g];
    if (g === 'm') {
      const hair = o.noCap
        ? 'M9 -10.4 C7.6 -15.4 1 -17.6 -5 -16.4 C-10.6 -15.2 -13.8 -10 -13.4 -4 C-13.2 0.6 -11.8 3.6 -9.6 5.6 L-6.8 5.8 C-8 1.6 -7.8 -2.6 -5.6 -5 L-1.2 -5.6 L-0.4 1.4 L1.2 1.2 L1.4 -5.6 C3.6 -7.6 6.4 -9 9 -10.4 Z'
        : 'M7.4 -11.4 C2 -14 -6.4 -14 -10.4 -9.6 C-13 -5.6 -13 0.6 -9.6 5.4 L-6.8 5.8 C-8 1.6 -7.8 -2.6 -5.6 -5 L-1.2 -5.6 L-0.4 1.4 L1.2 1.2 L1.4 -5.6 C3.4 -8.2 5.4 -9.8 7.4 -11.4 Z';
      const beard = 'M1 0.6 C1.8 4.2 3.8 6.8 6.6 7.8 C8.4 8.4 10 8.4 11.2 9.2 C11.9 10.6 11.6 12.2 10.8 13.1 C9 14.8 5.8 15 2.8 14.1 C-0.6 13 -3.2 10.6 -4.5 7.6 C-4.9 5.2 -4.7 3.2 -3.9 1.8 Z';
      const mus = 'M11.6 5.3 C12.6 5.5 12.9 6.3 12.4 6.9 C11.3 6.7 10.4 6.5 9.4 6.7 C9.7 5.8 10.5 5.3 11.6 5.3 Z';
      return `<g transform="${tr}">
        ${shade(HEAD_M, SKIN, { rim: 7, lw: 0.7 })}
        <path d="${hair}" fill="${c.hair}"/>
        <path d="${beard}" fill="${c.beard}" opacity=".92"/><path d="${beard}" fill="none" stroke="#120c08" stroke-width=".4" opacity=".5"/>
        ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${-2 + i * 2.2} ${10 + (i % 2)} l0.6 1.6" stroke="#5a4332" stroke-width=".35" opacity=".7"/>`).join('')}
        <path d="${mus}" fill="${c.beard}"/>
        ${shade('M-1.4 -2.8 C-4.6 -3.8 -6.8 -1.2 -6.2 2 C-5.8 4.6 -4.2 5.8 -2.4 5.2 C-1.8 3.2 -1.4 0.2 -1.4 -2.8 Z', SKIN, { rim: 3, lw: 0.6 })}
        <path d="M-2.6 -1 C-4.4 -1.4 -4.8 1 -3.9 2.6" fill="none" stroke="#9A6247" stroke-width=".6"/>
        ${faceDetails('m')}
        ${o.noCap ? `<path d="M-9 -12 Q-2 -16.4 6 -13.6 M-11 -7 Q-6 -13 2 -14.2" fill="none" stroke="#4a382c" stroke-width=".5" opacity=".7"/>` : shade('M-12.8 -6 C-13.2 -13 -6.2 -17.6 1 -17.2 C7.8 -16.8 11.8 -12.6 12 -8.4 C4 -9.6 -4.2 -8.8 -12.8 -6 Z', c.cap, { rim: 5, lw: 0.7 })}
        ${o.noCap ? '' : [0, 1, 2].map((r) => `<path d="M${-11 + r} ${-8.6 - r * 2.6} Q0 ${-11.6 - r * 3.2} ${10.6 - r * 1.4} ${-10.4 - r * 2.2}" fill="none" stroke="#C9C5BB" stroke-width=".5" stroke-dasharray=".8 .9"/>`).join('')}
      </g>`;
    }
    const top = c.top;
    const hood = 'M11.8 -7.4 C11.6 -14.6 4.6 -19.8 -3.2 -19.4 C-11.6 -19 -16.2 -11.6 -16 -3.4 C-15.8 4.6 -13 10.6 -9 14.6 L-2 20 L9.6 17.2 C11.2 15.6 11.8 14.4 11.6 13.2 C9.6 12.6 7.4 11.8 5.6 10.2 C3 7.6 2 3.6 2.4 -0.4 C2.8 -4 5 -6.6 8.2 -7.4 Z';
    const faceClip = 'M8.4 -7.6 C9.6 -7.7 10.6 -7.6 11.2 -7.2 C11.5 -5.6 11.4 -4.6 12 -3.6 C12.5 -2.4 12.6 -0.9 13.3 1 C13.8 2.3 14.1 3.2 13.5 3.9 C13 4.4 12.3 4.3 11.8 4.7 C12.3 5.5 12.6 6.2 12.2 6.9 C12.7 7.6 12.4 8.5 11.8 8.9 C11.2 9.5 11.5 10.5 11 11.4 C10.2 12.6 9 13 7.6 12.8 C5 11.6 3 8.6 2.6 4.4 C2.3 0 4.2 -5.6 8.4 -7.6 Z';
    return `<g transform="${tr}">
      ${shade(hood, top, { rim: 8, lw: 0.8 })}
      ${shade(faceClip, SKIN, { rim: 5, lw: 0.7 })}
      ${faceDetails('f')}
      <path d="M8.2 -7.6 C4.6 -6.2 2.6 -2 2.6 2.6 C2.8 7.4 5.4 10.8 8.6 12.6" fill="none" stroke="${top.l}" stroke-width="1.4" opacity=".9"/>
      ${crease('M-8 -14 C-12.6 -8 -13 2 -9.4 10', top.d, 1, 0.5)}${crease('M-2 -16.4 C-7 -12 -8 -2 -5 8', top.d, 0.8, 0.35)}
    </g>`;
  }

  // ------------------------------------------------------------ eller (yerel: bilek orijinde, parmaklar +x yönünde, avuç +y)
  const HANDS = {
    // gevşek sarkan el (yandan)
    relax: 'M-1 -3.6 C3 -4.6 7 -4.4 10.6 -3.2 C13.4 -2.2 16.6 -1.4 18.4 0.4 C19.2 1.4 18.6 2.6 17.2 2.6 C15.4 2.6 13.6 2.2 12 2.4 C10.6 3.6 8.4 4.6 6 4.4 C3.2 4.2 0.4 3.4 -1.2 2.6 Z',
    // düz el (yerde / dizde, parmaklar bitişik)
    flat: 'M-1 -2.6 C3.4 -3.6 8.4 -3.4 12.6 -2.8 C15.4 -2.4 18.4 -1.8 20.6 -0.6 C21.6 0 21.4 1.2 20.2 1.4 C16 1.8 11 2.4 6.4 2.6 C3.6 2.8 1 2.6 -1.2 2.2 Z',
    // açık el, avuç önde (önden görünüş için ayrı çizilir)
    grip: 'M-1 -3.8 C3 -4.8 7.4 -4.6 10.8 -3 C13.4 -1.8 14.8 0.6 15.6 3.4 C16 5.2 15.2 6.6 13.8 6 C12.8 5.6 12.4 4.4 11.8 3.2 C10.6 3.8 9 4.6 6.8 4.6 C3.8 4.6 1 3.8 -1 2.8 Z',
  };
  HANDS.cup = 'M-1 -3.4 C3 -4.6 7.6 -4.4 11 -3.4 C14.2 -2.4 16.6 -3.6 18.2 -5.2 C19.4 -6.2 20.8 -5.4 20.2 -3.8 C19 -0.6 16.4 2.6 12.4 3.8 C8.6 4.8 3.6 4.4 -1.2 2.8 Z';
  HANDS.point = 'M-1 -3 C3 -4.4 7 -4.4 9.6 -3.6 L19.4 -2.8 C21 -2.6 21 -0.8 19.4 -0.6 L10.8 -0.2 C11.8 1.4 11.6 3.6 9.8 4.2 C6.6 5 2.6 4.4 -1 3 Z';
  const HAND_LINES = {
    cup: 'M10.6 -1.6 Q14 -1.4 17 -3.4 M9.6 0.6 Q13 0.8 16 -1',
    point: 'M10.2 1.2 Q8 1.8 6.2 1.6 M9.4 2.8 Q7.6 3.4 5.8 3.2',
    relax: 'M11 -1.6 Q14 -0.6 16.4 0.6 M10.2 0 Q13 0.8 15.2 1.6',
    flat: 'M12 -1.2 L19 -0.2 M11 0.4 L18.6 0.9',
    grip: 'M10.8 -1.4 Q13 0.4 14 3.4 M9.6 0.6 Q11.6 2 12.4 4.2 M8 1.8 Q9.6 3.2 10 4.6',
  };
  function hand(W, a, kind, far, s = 1) {
    const sk = far ? SKIN_FAR : SKIN;
    const tr = `translate(${f1(W.x)} ${f1(W.y)}) rotate(${f1(a)}) scale(${s})`;
    const thumb = kind === 'flat' ? '' : shade('M1.8 -3 C4.4 -6.2 8 -7.2 9.6 -6 C10.2 -5.2 9.4 -4.4 8.2 -4 C6.6 -3.4 5 -2.4 3.6 -1.4 Z', sk, { rim: 2, lw: 0.5 });
    return `<g transform="${tr}">${shade(HANDS[kind], sk, { rim: 3.2, lw: 0.6 })}${thumb}<path d="${HAND_LINES[kind]}" fill="none" stroke="${sk.o}" stroke-width=".45" opacity=".7"/></g>`;
  }

  // ------------------------------------------------------------ ayaklar (yerel: ayak bileği orijinde, parmaklar +x)
  const FOOT = 'M-7.4 -1.4 C-7.6 -5.6 -4.6 -8.2 -0.6 -8 C2.6 -7.8 5 -6 8 -4.4 C12 -2.4 17 -1.6 21 -0.6 C23.6 0 24.4 2.2 23.4 3.6 C22.2 4.6 19 4.6 15 4.2 C10 3.8 5 3.6 0 4.2 C-3.6 4.6 -6.8 3.4 -7.4 -1.4 Z';
  const TOES = 'M18 -0.8 C19.4 -1.6 21.6 -1.2 23.2 0.2 M16.6 0.4 Q18 1.4 18.4 3.6 M19.4 1 Q20.6 2 20.8 4';
  function foot(Ap, a, far, mode) {
    const sk = far ? SKIN_FAR : SKIN;
    if (mode === 'back') a = 180; // yatırılmış ayak: üstü yerde, taban yukarıda, parmaklar geriye
    if (mode === 'toes') { // topuk yukarıda, parmaklar yerde kıbleye doğru bükük
      return `<g transform="translate(${f1(Ap.x)} ${f1(Ap.y)}) rotate(${f1(a)})">${shade('M-6.4 -2.4 C-6.4 -6.4 -3.4 -8.4 0.4 -8 C4 -7.6 7 -5.4 11 -4.2 C14 -3.4 16.4 -3 18 -2.2 L18.6 4 C14 3.6 9 3.8 4 4.4 C0 4.8 -5.6 4 -6.4 -2.4 Z', sk, { rim: 3.5, lw: 0.6 })}
        <g transform="translate(18 1) rotate(${f1(-a)})">${shade('M-3 -3.4 C1.4 -3.6 5.4 -2.8 7.6 -1 C8.4 0 8 1.4 6.6 1.6 L-3 2.4 Z', sk, { rim: 2.2, lw: 0.6 })}</g></g>`;
    }
    return `<g transform="translate(${f1(Ap.x)} ${f1(Ap.y)}) rotate(${f1(a)})">${shade(FOOT, sk, { rim: 4, lw: 0.6 })}<path d="${TOES}" fill="none" stroke="${sk.o}" stroke-width=".45" opacity=".7"/></g>`;
  }

  // ------------------------------------------------------------ yandan figür
  const LEN = { TH: 50, SH: 44, UA: 35, FA: 30, SP: 56 };
  const LEG_M = prof([[0, 12, 13.5], [0.25, 11, 11.6], [0.5, 8.6, 8.6], [0.66, 8, 10.4], [0.86, 7.2, 8], [1, 7, 7.4]]);
  const LEG_M_FAR = prof([[0, 11.4, 13], [0.25, 10.6, 11], [0.5, 8.2, 8.2], [0.66, 7.6, 9.8], [0.86, 6.8, 7.6], [1, 6.6, 7]]);
  const ARM = prof([[0, 8.2, 8], [0.22, 7.3, 7.1], [0.52, 5.7, 5.7], [0.7, 5.9, 5.3], [1, 4.3, 4.1]]);
  const ARM_F = prof([[0, 9, 8.8], [0.22, 8.2, 7.8], [0.52, 6.8, 6.8], [0.7, 6.8, 6.2], [1, 5.2, 5]]);

  /** q: {H, N, ha, legs:[{K?,A,fa,mode}], arms:[{E?,W,ha,hk}], view} — legs[0]/arms[0] yakın taraf (sol) */
  function sideFigure(q, g) {
    const col = C[g];
    const fem = g === 'f';
    const up = norm(sub(q.N, q.H));
    const F = frame(q.H, up);
    const fr = front(P(-up.x, -up.y));
    const Cp = q.C || add(q.N, mul(dir(q.ha - 90), 17.5));
    const S = F(LEN.SP - 7, -1);
    const out = [];
    const legJ = (L, hip) => {
      const K = L.K || ik(hip, L.A, LEN.TH, LEN.SH, L.bend == null ? -1 : L.bend);
      const A = L.K ? L.A : add(K, mul(norm(sub(L.A, K)), LEN.SH));
      return { K, A };
    };
    const armJ = (Aa, sh) => {
      const E = Aa.E || ik(sh, Aa.W, LEN.UA, LEN.FA, Aa.bend == null ? 1 : Aa.bend);
      const W = Aa.E ? Aa.W : add(E, mul(norm(sub(Aa.W, E)), LEN.FA));
      return { E, W };
    };
    const H2 = add(q.H, mul(fr, -2));
    const l0 = legJ(q.legs[0], q.H), l1 = legJ(q.legs[1], H2);
    const S2 = add(S, mul(fr, -2));
    const a0 = armJ(q.arms[0], S), a1 = armJ(q.arms[1] || { ...q.arms[0], W: add(q.arms[0].W, P(-3, -2)) }, S2);
    const arm1spec = q.arms[1] || q.arms[0];

    // zemin gölgesi
    const contacts = [l0.A, l1.A, q.groundExtra].filter(Boolean);
    const xs = contacts.map((p) => p.x).concat(q.shadowX || []);
    out.push(`<ellipse cx="${f1((Math.min(...xs) + Math.max(...xs)) / 2 + 6)}" cy="224" rx="${f1((Math.max(...xs) - Math.min(...xs)) / 2 + 34)}" ry="5" fill="#5a4630" opacity=".28" filter="url(#fb4)"/>`);

    // uzak bacak + ayak
    out.push(foot(l1.A, q.legs[1].fa || 0, true, q.legs[1].mode));
    if (!fem) out.push(shade(sweep([H2, l1.K, l1.A], LEG_M_FAR), col.botFar, { rim: 8 }));
    // uzak kol
    const armFarD = sweep([S2, a1.E, a1.W], fem ? ARM_F : ARM);
    out.push(shade(armFarD, col.topFar, { rim: 7 }));
    out.push(hand(a1.W, arm1spec.ha, arm1spec.hk, true));

    // gövde
    const T = (u, f) => F(u * LEN.SP, f);
    const torsoPts = fem
      ? [T(1.02, 6), T(0.9, 12.5), T(0.72, 15), T(0.5, 12), T(0.25, 13.5), T(0.04, 13), T(-0.02, 9), T(-0.04, -9), T(0, -17), T(0.25, -13.5), T(0.5, -9.5), T(0.72, -11), T(0.9, -12), T(1.02, -6)]
      : [T(1.02, 6), T(0.9, 12), T(0.72, 13.5), T(0.5, 11), T(0.25, 12), T(0.04, 11), T(-0.02, 8), T(-0.04, -8), T(0, -15), T(0.25, -12), T(0.5, -9), T(0.72, -11), T(0.9, -12), T(1.02, -6)];
    // yakın bacak / etek
    if (!fem) {
      out.push(foot(l0.A, q.legs[0].fa || 0, false, q.legs[0].mode));
      const legD = sweep([q.H, l0.K, l0.A], LEG_M);
      out.push(shade(legD, col.bot, { rim: 9 }));
      // pantolon kıvrımları
      const kn = l0.K, ku = norm(sub(l0.A, l0.K)), tu = norm(sub(l0.K, q.H));
      const bendAng = Math.abs(ang(ku) - ang(tu));
      if (bendAng > 25) {
        const fk = front(ku);
        out.push(crease(`M${pt(add(kn, mul(fk, -6)))} Q${pt(add(add(kn, mul(fk, -2)), mul(ku, 6)))} ${pt(add(add(kn, mul(fk, -8)), mul(ku, 10)))}`, col.bot.o, 1.1, 0.6));
      }
      out.push(crease(`M${pt(add(lerp(q.H, kn, 0.3), mul(front(tu), 5)))} Q${pt(add(lerp(q.H, kn, 0.6), mul(front(tu), 2)))} ${pt(add(lerp(q.H, kn, 0.85), mul(front(tu), 6)))}`, col.bot.l, 1, 0.4));
      // gömlek
      const hemU = norm(sub(l0.K, q.H));
      const hl = q.hem == null ? 22 : q.hem;
      const shirt = smooth([...torsoPts.slice(0, 6).map((p, i) => add(p, mul(fr, i === 0 ? 0 : 2))),
        add(add(q.H, mul(hemU, hl)), mul(front(hemU), 14)), add(add(q.H, mul(hemU, hl + 3)), mul(front(hemU), 1)), add(add(q.H, mul(hemU, hl)), mul(front(hemU), -15)),
        ...torsoPts.slice(8).map((p) => add(p, mul(fr, -2)))]);
      out.push(shade(shirt, col.top, { rim: 12 }));
      out.push(crease(`M${pt(T(0.45, 12))} Q${pt(T(0.3, 4))} ${pt(T(0.12, 10))}`, col.top.d, 1.1, 0.6));
      out.push(crease(`M${pt(T(0.95, 6))} L${pt(T(0.55, 8))}`, col.top.d, 0.9, 0.5));
      // yaka
      out.push(shade(smooth([T(1.04, 6), T(1.0, 9.5), T(0.93, 8), T(0.95, -6), T(1.03, -7.5)]), col.top, { rim: 3 }));
    } else {
      out.push(foot(l0.A, q.legs[0].fa || 0, false, q.legs[0].mode));
      out.push(shade(q.skirt(q, { F, l0, l1, fr, up }), col.bot, { rim: 14 }));
      (q.skirtFolds || []).forEach((d) => out.push(crease(d(q, { F, l0, l1 }), col.bot.d, 1.2, 0.55)));
      out.push(shade(smooth(torsoPts), col.top, { rim: 12 }));
    }
    // baş ve boyun
    if (!fem) out.push(shade(sweep([T(0.96, 0), Cp], prof([[0, 7, 7], [1, 6, 6]]), { flatStart: true }), SKIN, { rim: 5 }));
    // kadın: örtü (pelerin) gövde üzerinde
    if (fem) {
      const cape = smooth([add(Cp, mul(dir(q.ha + 70), 13)), T(1.0, 12), T(0.78, 20.5), T(0.5, 19), T(0.3, 18), T(0.28, -14), T(0.6, -15.5), T(0.95, -16), add(Cp, mul(dir(q.ha + 160), 14))]);
      out.push(shade(cape, col.top, { rim: 14 }));
      out.push(crease(`M${pt(T(0.95, 8))} Q${pt(T(0.6, 12))} ${pt(T(0.32, 15))}`, col.top.d, 1.2, 0.5));
      out.push(crease(`M${pt(T(0.9, -6))} Q${pt(T(0.6, -10))} ${pt(T(0.32, -12))}`, col.top.d, 1.1, 0.45));
    }
    out.push(headSide(Cp, q.ha, g, 1));
    // yakın kol (gövdeye gölge düşürür)
    const armD = sweep([S, a0.E, a0.W], fem ? ARM_F : ARM);
    out.push(dropShadow(armD, 2.4, 2.8, 0.22));
    out.push(shade(armD, col.top, { rim: 8 }));
    const eu = norm(sub(a0.W, a0.E));
    out.push(crease(`M${pt(add(a0.E, mul(front(eu), -3)))} Q${pt(add(lerp(a0.E, a0.W, 0.3), mul(front(eu), -1)))} ${pt(add(lerp(a0.E, a0.W, 0.55), mul(front(eu), -4)))}`, col.top.d, 1, 0.5));
    out.push(`<path d="M${pt(add(a0.W, mul(front(eu), 5.2)))} L${pt(add(a0.W, mul(front(eu), -5)))}" stroke="${col.top.d}" stroke-width="1.6" opacity=".6"/>`);
    out.push(hand(a0.W, q.arms[0].ha, q.arms[0].hk, false));
    return out.join('');
  }

  // ------------------------------------------------------------ önden figür (ayakta / oturarak)
  function headFront(cx, cy, g, turn = 0, s = 1) {
    const c = C[g];
    const t = turn; // -1 figürün sağına (izleyenin soluna), +1 soluna
    const fx = cx + t * 4.6;
    const eyes = [-1, 1].map((k) => {
      const ex = fx + k * 5.2 + t * (k === t ? -0.8 : 0.4);
      const w = k === -t ? 2.4 : 3;
      return `<path d="M${ex - w} -1.2 Q${ex} ${-3} ${ex + w} -1.2 Q${ex} 0.2 ${ex - w} -1.2 Z" fill="#fff" transform="translate(0 ${cy})"/>
        <circle cx="${ex + t * 1.1}" cy="${cy - 1.3}" r="1.05" fill="#2A1C14"/>
        <path d="M${ex - w} ${cy - 1.3} Q${ex} ${cy - 3.3} ${ex + w} ${cy - 1.3}" fill="none" stroke="#3A2418" stroke-width=".8"/>
        <path d="M${ex - 3.2} ${cy - 4.8} Q${ex} ${cy - 6.2} ${ex + 3.2} ${cy - 4.8}" fill="none" stroke="#3A2A20" stroke-width="${g === 'm' ? 1.4 : 1}" stroke-linecap="round"/>`;
    }).join('');
    const nose = `<path d="M${fx + t * 1.4} ${cy - 1} Q${fx + t * 3.4} ${cy + 4} ${fx + t * 2.2} ${cy + 5.2} Q${fx} ${cy + 6} ${fx - t * 1.6} ${cy + 5}" fill="none" stroke="#A56A4C" stroke-width=".9" stroke-linecap="round"/>`;
    const mouth = `<path d="M${fx - 3.4 + t} ${cy + 9.4} Q${fx + t * 0.6} ${cy + 10.6} ${fx + 3.4 + t} ${cy + 9.4}" fill="none" stroke="#A4574A" stroke-width="1.1" stroke-linecap="round"/>`;
    const faceShape = smooth([P(cx - 10.6, cy - 4), P(cx - 9.4, cy - 12), P(cx, cy - 15.6), P(cx + 9.4, cy - 12), P(cx + 10.6, cy - 4), P(cx + 9.6, cy + 6), P(cx + 6, cy + 12.6), P(cx + t * 1.4, cy + 15), P(cx - 6, cy + 12.6), P(cx - 9.6, cy + 6)]);
    const cheeks = `<ellipse cx="${fx - 6}" cy="${cy + 4.6}" rx="3" ry="1.9" fill="#E88F80" opacity="${g === 'f' ? 0.3 : 0.14}" filter="url(#fb05)"/><ellipse cx="${fx + 6}" cy="${cy + 4.6}" rx="3" ry="1.9" fill="#E88F80" opacity="${g === 'f' ? 0.3 : 0.14}" filter="url(#fb05)"/>`;
    if (g === 'm') {
      const ears = [-1, 1].map((k) => shade(`M${cx + k * 10} ${cy - 3} C${cx + k * 13.6} ${cy - 5} ${cx + k * 14} ${cy + 3} ${cx + k * 10.4} ${cy + 4} Z`, SKIN, { rim: 2.5, lw: 0.6 })).join('');
      const hair = `M${cx - 10.8} ${cy - 2} C${cx - 11.4} ${cy - 11} ${cx - 6} ${cy - 16.6} ${cx} ${cy - 16.6} C${cx + 6} ${cy - 16.6} ${cx + 11.4} ${cy - 11} ${cx + 10.8} ${cy - 2} L${cx + 9.6} ${cy - 2} C${cx + 9} ${cy - 8} ${cx + 5} ${cy - 11.4} ${cx} ${cy - 11.4} C${cx - 5} ${cy - 11.4} ${cx - 9} ${cy - 8} ${cx - 9.6} ${cy - 2} Z`;
      const beard = `M${cx - 10.4} ${cy + 0.5} C${cx - 10} ${cy + 8} ${cx - 6.8} ${cy + 14.6} ${cx + t * 1.4} ${cy + 16.6} C${cx + 6.8} ${cy + 14.6} ${cx + 10} ${cy + 8} ${cx + 10.4} ${cy + 0.5} C${cx + 8.6} ${cy + 6} ${cx + 6} ${cy + 8.4} ${fx + 4.6} ${cy + 8.2} C${fx + 2} ${cy + 7.2} ${fx - 2} ${cy + 7.2} ${fx - 4.6} ${cy + 8.2} C${cx - 6} ${cy + 8.4} ${cx - 8.6} ${cy + 6} ${cx - 10.4} ${cy + 0.5} Z`;
      return `<g transform="rotate(${t * 4} ${cx} ${cy}) scale(1)">${ears}${shade(faceShape, SKIN, { rim: 7, lw: 0.7 })}
        <path d="${hair}" fill="${c.hair}"/>${cheeks}
        <path d="${beard}" fill="${c.beard}" opacity=".93"/>${mouth}${eyes}${nose}
        <path d="M${fx - 4.4} ${cy + 8.2} Q${fx} ${cy + 6.6} ${fx + 4.4} ${cy + 8.2}" fill="none" stroke="${c.beard}" stroke-width="2"/>
        ${shade(`M${cx - 11.4} ${cy - 7} C${cx - 11.4} ${cy - 15} ${cx - 6} ${cy - 19.4} ${cx} ${cy - 19.4} C${cx + 6} ${cy - 19.4} ${cx + 11.4} ${cy - 15} ${cx + 11.4} ${cy - 7} C${cx + 4} ${cy - 9} ${cx - 4} ${cy - 9} ${cx - 11.4} ${cy - 7} Z`, c.cap, { rim: 4, lw: 0.7 })}
        ${[0, 1, 2].map((r) => `<path d="M${cx - 10.4 + r} ${cy - 9.4 - r * 2.8} Q${cx} ${cy - 12 - r * 3} ${cx + 10.4 - r} ${cy - 9.4 - r * 2.8}" fill="none" stroke="#C9C5BB" stroke-width=".5" stroke-dasharray=".8 .9"/>`).join('')}
      </g>`;
    }
    const hood = smooth([P(cx - 15, cy + 2), P(cx - 13.6, cy - 13), P(cx, cy - 21), P(cx + 13.6, cy - 13), P(cx + 15, cy + 2), P(cx + 12, cy + 16), P(cx, cy + 22), P(cx - 12, cy + 16)]);
    const opening = smooth([P(cx - 9.6, cy - 3), P(cx - 7.6, cy - 11.6), P(cx, cy - 13.6), P(cx + 7.6, cy - 11.6), P(cx + 9.6, cy - 3), P(cx + 8.6, cy + 6.4), P(cx + 5.4, cy + 12), P(cx + t * 1.2, cy + 14), P(cx - 5.4, cy + 12), P(cx - 8.6, cy + 6.4)]);
    return `<g transform="rotate(${t * 4} ${cx} ${cy})">${shade(hood, c.top, { rim: 8, lw: 0.8 })}${shade(opening, SKIN, { rim: 5, lw: 0.6 })}${cheeks}${mouth}${eyes}${nose}
      <path d="${opening}" fill="none" stroke="${c.top.l}" stroke-width="1.4"/></g>`;
  }
  // önden kol: omuz→dirsek→bilek
  const ARMF_FRONT = prof([[0, 8.6, 8.6], [0.25, 7.6, 7.6], [0.52, 6.2, 6.2], [0.72, 6.4, 6.2], [1, 4.8, 4.8]]);
  // avuç kıbleye dönük açık el (önden), bilek orijinde, parmaklar -y (yukarı) yönünde; side: -1 figürün sağ eli (izleyenin solu)
  function palmFront(W, side, far, s = 1, a = 0) {
    const sk = far ? SKIN_FAR : SKIN;
    const m = side; // ayna
    const pal = `M${-4.6 * m} 0 C${-5.4 * m} -4 ${-5.2 * m} -8 ${-4.4 * m} -10 L${-4.6 * m} -16 C${-4.6 * m} -17.6 ${-2.6 * m} -17.6 ${-2.4 * m} -16 L${-2.2 * m} -11 L${-2 * m} -18.6 C${-2 * m} -20.4 ${0.2 * m} -20.4 ${0.2 * m} -18.6 L${0.4 * m} -11 L${0.8 * m} -18 C${0.8 * m} -19.6 ${3 * m} -19.6 ${3 * m} -18 L${2.8 * m} -10.6 L${3.6 * m} -15.4 C${3.8 * m} -16.8 ${5.6 * m} -16.6 ${5.6 * m} -15.2 L${4.8 * m} -8 C${6.6 * m} -9.4 ${8.6 * m} -9.6 ${9 * m} -8.4 C${9.2 * m} -7.4 ${7 * m} -5.6 ${5.4 * m} -2 C${4.4 * m} 0 ${2 * m} 1.4 ${-1 * m} 1.4 C${-3 * m} 1.4 ${-4.2 * m} 1 ${-4.6 * m} 0 Z`;
    return `<g transform="translate(${f1(W.x)} ${f1(W.y)}) rotate(${a}) scale(${s})">${shade(pal, sk, { rim: 3, lw: 0.6 })}<path d="M${-2 * m} -4 Q${0} -2.6 ${2.6 * m} -4.4" fill="none" stroke="${sk.o}" stroke-width=".5" opacity=".6"/></g>`;
  }
  // önden gevşek/bağlı el (avuç gövdeye dönük, parmaklar aşağı ya da yana)
  function handFrontBlob(W, a, far, s = 1, wide = 1) {
    const sk = far ? SKIN_FAR : SKIN;
    return `<g transform="translate(${f1(W.x)} ${f1(W.y)}) rotate(${f1(a)}) scale(${s})">${shade(`M-4.4 0 C-4.8 4 -4.4 9 -3 14 C-2 16.4 0.2 16.6 1.2 14.6 L2.4 10 C3.8 12 5.6 11.6 5.4 9.6 C${4.4 * wide} 5 4.6 2 4 -0.4 C2 -1.6 -2.4 -1.6 -4.4 0 Z`, sk, { rim: 3, lw: 0.6 })}
      <path d="M-1.4 6 L-1 13 M1 6 L1.6 12" stroke="${sk.o}" stroke-width=".45" opacity=".6"/></g>`;
  }

  function frontStanding(g, pose) {
    const col = C[g], fem = g === 'f';
    const cx = 120, out = [];
    out.push(`<ellipse cx="${cx}" cy="224" rx="44" ry="5" fill="#5a4630" opacity=".28" filter="url(#fb4)"/>`);
    const hipY = 118, shY = 66, headY = 40;
    // bacaklar
    const legs = [-1, 1].map((k) => sweep([P(cx + k * 9.5, hipY), P(cx + k * 9, 168), P(cx + k * 8.4, 212)], prof([[0, 12, 12], [0.5, 9, 9], [0.66, 9.6, 9.6], [1, 7.6, 7.6]])));
    // ayaklar (önden): ayakların arası dört parmak
    [-1, 1].forEach((k) => out.push(shade(`M${cx + k * 8.4 - 6} 212 C${cx + k * 8.4 - 7} 218 ${cx + k * 8.4 - 6} 224 ${cx + k * 8.4} 224.4 C${cx + k * 8.4 + 6} 224 ${cx + k * 8.4 + 7} 218 ${cx + k * 8.4 + 6} 212 Z`, SKIN, { rim: 3, lw: 0.6 })));
    if (!fem) legs.forEach((d, i) => { out.push(shade(d, i ? col.bot : col.botFar, { rim: 9 })); });
    else {
      out.push(shade(smooth([P(cx - 22, 100), P(cx + 22, 100), P(cx + 30, 160), P(cx + 36, 213), P(cx, 216), P(cx - 36, 213), P(cx - 30, 160)]), col.bot, { rim: 14 }));
      [-18, -6, 8, 20].forEach((x, i) => out.push(crease(`M${cx + x * 0.6} ${118 + i * 2} Q${cx + x * 0.9} 170 ${cx + x * 1.3} 210`, col.bot.d, 1.1, 0.5)));
    }
    // gövde
    const torso = smooth([P(cx - 8, shY - 6), P(cx - 23, shY - 2), P(cx - 25, shY + 10), P(cx - 21, 96), P(cx - 18, 112), P(cx - 21, 128), P(cx, 132), P(cx + 21, 128), P(cx + 18, 112), P(cx + 21, 96), P(cx + 25, shY + 10), P(cx + 23, shY - 2), P(cx + 8, shY - 6)]);
    if (!fem) {
      out.push(shade(torso, col.top, { rim: 14 }));
      out.push(crease(`M${cx} ${shY - 4} L${cx} 126`, col.top.d, 0.9, 0.55));
      [0, 1, 2, 3].forEach((i) => out.push(`<circle cx="${cx + 1.6}" cy="${shY + 4 + i * 14}" r="1" fill="${col.top.d}"/>`));
      out.push(shade(`M${cx - 8} ${shY - 6} L${cx} ${shY + 3} L${cx + 8} ${shY - 6} L${cx + 5} ${shY - 8} L${cx} ${shY - 2} L${cx - 5} ${shY - 8} Z`, col.top, { rim: 2 }));
      out.push(shade(`M${cx - 5.6} ${shY - 16} L${cx + 5.6} ${shY - 16} L${cx + 6} ${shY - 6} L${cx} ${shY + 0.5} L${cx - 6} ${shY - 6} Z`, SKIN, { rim: 3, lw: 0.6 }));
    }
    // kollar
    const sh = [P(cx - 22, shY + 2), P(cx + 22, shY + 2)];
    let W, E, handFn;
    if (pose === 'tekbir') {
      // erkek: başparmaklar kulak yumuşağı hizasında, avuçlar kıbleye; kadın: eller omuz hizasında
      W = fem ? [P(cx - 26, shY + 6), P(cx + 26, shY + 6)] : [P(cx - 17, headY + 12), P(cx + 17, headY + 12)];
      E = fem ? [P(cx - 34, shY + 28), P(cx + 34, shY + 28)] : [P(cx - 32, shY + 22), P(cx + 32, shY + 22)];
      handFn = (k) => palmFront(W[k], k ? 1 : -1, false, 1, k ? -6 : 6);
    } else if (pose === 'kiyam') {
      if (!fem) { W = [P(cx - 4, 112), P(cx + 6, 113)]; E = [P(cx - 30, 104), P(cx + 30, 104)]; }
      else { W = [P(cx - 6, 86), P(cx + 6, 88)]; E = [P(cx - 26, 96), P(cx + 26, 96)]; }
      handFn = null;
    } else {
      W = [P(cx - 27, 140), P(cx + 27, 140)]; E = [P(cx - 28, 104), P(cx + 28, 104)];
      handFn = (k) => handFrontBlob(W[k], k ? -6 : 6, false, 1);
    }
    const armsD = [0, 1].map((k) => sweep([sh[k], E[k], W[k]], fem ? ARM_F : ARMF_FRONT));
    if (fem) {
      // namaz örtüsü (pelerin) önden
      out.push(shade(smooth([P(cx - 13, headY + 10), P(cx - 30, shY + 6), P(cx - 34, shY + 40), P(cx - 30, 124), P(cx, 132), P(cx + 30, 124), P(cx + 34, shY + 40), P(cx + 30, shY + 6), P(cx + 13, headY + 10)]), col.top, { rim: 16 }));
      [-14, 0, 14].forEach((x) => out.push(crease(`M${cx + x * 0.7} ${shY + 4} Q${cx + x} ${shY + 40} ${cx + x * 1.3} 128`, col.top.d, 1, 0.45)));
    }
    out.push(headFront(cx, headY, g, 0));
    // kıyamda eller: sağ el sol elin üzerinde
    if (pose === 'kiyam') {
      armsD.forEach((d) => { out.push(dropShadow(d, 2, 2.5, 0.2)); out.push(shade(d, col.top, { rim: 8 })); });
      const hy = W[0].y;
      // sol el (alttaki): parmaklar izleyenin soluna doğru
      out.push(shade(`M${cx + 8} ${hy - 4} C${cx + 2} ${hy - 6} ${cx - 8} ${hy - 6} ${cx - 13} ${hy - 3} C${cx - 15} ${hy - 1} ${cx - 14} ${hy + 3} ${cx - 11} ${hy + 3.4} C${cx - 4} ${hy + 4} ${cx + 3} ${hy + 4} ${cx + 8} ${hy + 3} Z`, SKIN_FAR, { rim: 3, lw: 0.6 }));
      // sağ el (üstteki)
      out.push(shade(`M${cx - 6} ${hy - 6.5} C${cx} ${hy - 8.6} ${cx + 9} ${hy - 8} ${cx + 14} ${hy - 5} C${cx + 16.4} ${hy - 3} ${cx + 15.6} ${hy + 1} ${cx + 12.6} ${hy + 1.6} C${cx + 6} ${hy + 2.4} ${cx} ${hy + 2.4} ${cx - 6} ${hy + 1.4} Z`, SKIN, { rim: 3, lw: 0.6 }));
      out.push(`<path d="M${cx + 2} ${hy - 6} L${cx + 13} ${hy - 4.4} M${cx + 2} ${hy - 2.6} L${cx + 13.6} ${hy - 1.6}" stroke="${SKIN.o}" stroke-width=".5" opacity=".6"/>`);
      if (!fem) { // başparmak ve serçe parmak sol bileği kavrar
        out.push(shade(`M${cx - 6} ${hy - 6} C${cx - 9} ${hy - 6.6} ${cx - 11} ${hy - 4.6} ${cx - 10.6} ${hy - 2.4} C${cx - 9.4} ${hy - 2} ${cx - 7.4} ${hy - 3} ${cx - 6} ${hy - 3.4} Z`, SKIN, { rim: 2, lw: 0.5 }));
        out.push(shade(`M${cx - 5} ${hy + 1} C${cx - 8.6} ${hy + 1.2} ${cx - 10.6} ${hy + 3} ${cx - 10} ${hy + 5} C${cx - 8.4} ${hy + 5.4} ${cx - 6.6} ${hy + 4} ${cx - 5} ${hy + 3.4} Z`, SKIN, { rim: 2, lw: 0.5 }));
      }
    } else {
      armsD.forEach((d, k) => { out.push(dropShadow(d, 2, 2.5, 0.18)); out.push(shade(d, col.top, { rim: 8 })); out.push(handFn(k)); });
    }
    return out.join('');
  }

  // önden oturan figür (selam; kadın oturuşu)
  function frontSitting(g, turn) {
    const col = C[g], fem = g === 'f', cx = 120, out = [];
    out.push(`<ellipse cx="${cx}" cy="224" rx="58" ry="6" fill="#5a4630" opacity=".3" filter="url(#fb4)"/>`);
    const shY = 120, headY = 94;
    if (!fem) {
      // erkek: sol ayak yatık, sağ ayak dik (arkada parmakları görünür) — önden diz çökmüş
      out.push(shade(`M${cx + 14} 214 C${cx + 18} 204 ${cx + 26} 200 ${cx + 30} 206 L${cx + 30} 222 L${cx + 14} 222 Z`, SKIN_FAR, { rim: 3, lw: 0.6 }));
      [-1, 1].forEach((k) => out.push(shade(smooth([P(cx + k * 4, 186), P(cx + k * 20, 180), P(cx + k * 34, 196), P(cx + k * 34, 216), P(cx + k * 22, 222), P(cx + k * 6, 220)]), k < 0 ? col.botFar : col.bot, { rim: 12 })));
      out.push(shade(smooth([P(cx - 8, shY - 6), P(cx - 24, shY - 2), P(cx - 26, shY + 12), P(cx - 22, shY + 40), P(cx - 26, shY + 66), P(cx, shY + 72), P(cx + 26, shY + 66), P(cx + 22, shY + 40), P(cx + 26, shY + 12), P(cx + 24, shY - 2), P(cx + 8, shY - 6)]), col.top, { rim: 14 }));
      out.push(crease(`M${cx} ${shY - 4} L${cx} ${shY + 62}`, col.top.d, 0.9, 0.55));
      out.push(shade(`M${cx - 5.6} ${shY - 16} L${cx + 5.6} ${shY - 16} L${cx + 6} ${shY - 6} L${cx} ${shY + 0.5} L${cx - 6} ${shY - 6} Z`, SKIN, { rim: 3, lw: 0.6 }));
    } else {
      // kadın: ayaklar sağ taraftan (izleyenin solundan) çıkarılmış, yere oturmuş
      out.push(shade(`M${cx - 44} 214 C${cx - 50} 210 ${cx - 62} 212 ${cx - 64} 218 C${cx - 62} 223 ${cx - 50} 223 ${cx - 44} 221 Z`, SKIN, { rim: 3, lw: 0.6 }));
      out.push(shade(`M${cx - 40} 208 C${cx - 46} 203 ${cx - 56} 204 ${cx - 58} 209 C${cx - 56} 214 ${cx - 46} 214 ${cx - 40} 213 Z`, SKIN_FAR, { rim: 3, lw: 0.6 }));
      out.push(shade(smooth([P(cx - 22, shY + 30), P(cx + 22, shY + 30), P(cx + 46, 200), P(cx + 44, 220), P(cx, 223), P(cx - 46, 221), P(cx - 50, 205)]), col.bot, { rim: 14 }));
      out.push(crease(`M${cx - 30} 212 Q${cx} 204 ${cx + 34} 212`, col.bot.d, 1.2, 0.5));
      out.push(shade(smooth([P(cx - 13, headY + 10), P(cx - 30, shY + 4), P(cx - 34, shY + 38), P(cx - 30, shY + 60), P(cx, shY + 66), P(cx + 30, shY + 60), P(cx + 34, shY + 38), P(cx + 30, shY + 4), P(cx + 13, headY + 10)]), col.top, { rim: 16 }));
    }
    // kollar, eller uyluklarda
    [-1, 1].forEach((k) => {
      const d = sweep([P(cx + k * 22, shY + 2), P(cx + k * 30, shY + 36), P(cx + k * 22, shY + 64)], fem ? ARM_F : ARMF_FRONT);
      out.push(dropShadow(d, 2, 2, 0.18)); out.push(shade(d, col.top, { rim: 8 }));
      out.push(handFrontBlob(P(cx + k * 21, shY + 64), k * -70 + (k < 0 ? 180 : 0) + (k < 0 ? -110 : 110) - (k < 0 ? -110 : 110), false, 1));
    });
    out.push(headFront(cx, headY, g, turn));
    if (turn) {
      const ax = cx + turn * 40, ay = headY - 34;
      out.push(`<path d="M${cx - turn * 2} ${ay + 6} Q${cx + turn * 22} ${ay - 10} ${ax} ${ay + 2}" fill="none" stroke="#E0812A" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M${ax - turn * 9} ${ay - 7} L${ax} ${ay + 2} L${ax - turn * 11} ${ay + 7}" fill="none" stroke="#E0812A" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="${cx + turn * 54}" y="${ay - 12}" font-size="13" font-weight="800" fill="#C46A16" text-anchor="middle" font-family="Baloo 2, sans-serif">${turn < 0 ? 'Sağ omuz' : 'Sol omuz'}</text>`);
    }
    return out.join('');
  }

  // ------------------------------------------------------------ duruş tanımları (yandan; yüz sağa = kıble)
  const skirtStand = (q, o) => smooth([o.F(0.46 * LEN.SP, 14), o.F(0.1 * LEN.SP, 17), P(o.l0.A.x + 26, 214), P(o.l0.A.x + 20, 218), P(o.l1.A.x - 16, 218), P(o.l1.A.x - 22, 214), o.F(-0.05 * LEN.SP, -20), o.F(0.46 * LEN.SP, -12)]);
  const foldsStand = [(q, o) => `M${pt(o.F(0.1 * LEN.SP, 6))} Q${pt(P(o.l0.A.x + 8, 170))} ${pt(P(o.l0.A.x + 12, 214))}`, (q, o) => `M${pt(o.F(0, -8))} Q${pt(P(o.l1.A.x - 6, 170))} ${pt(P(o.l1.A.x - 8, 215))}`];
  const SIDE = {
    kavme: (g) => ({ H: P(110, 118), N: P(112, 62), ha: 4,
      legs: [{ A: P(112, 212), fa: 0 }, { A: P(106, 212), fa: 0 }],
      arms: [{ W: P(117, 146), bend: 1, ha: 96, hk: 'relax' }, { W: P(112, 145), bend: 1, ha: 96, hk: 'relax' }],
      skirt: skirtStand, skirtFolds: foldsStand }),
    // Rükû — erkek: sırt ve baş yere paralel, dizler dümdüz, parmaklar açık dizleri kavrar
    ruku_m: () => ({ H: P(92, 118), N: P(148, 116), ha: 88, C: P(166, 117),
      legs: [{ K: P(94, 168), A: P(95, 212), fa: 0 }, { K: P(89, 168), A: P(89, 212), fa: 0 }],
      arms: [{ W: P(101, 156), bend: 1, ha: 92, hk: 'grip' }, { W: P(96, 155), bend: 1, ha: 92, hk: 'grip' }] }),
    // Rükû — kadın: daha az eğilir, dizler hafif bükük, eller (parmaklar bitişik) dizlerde
    ruku_f: () => ({ H: P(92, 124), N: P(142, 100), ha: 64,
      legs: [{ K: P(101, 170), A: P(97, 212), fa: 0 }, { K: P(95, 170), A: P(91, 212), fa: 0 }],
      arms: [{ W: P(106, 160), bend: 1, ha: 84, hk: 'flat' }, { W: P(101, 159), bend: 1, ha: 84, hk: 'flat' }],
      skirt: (q, o) => smooth([o.F(0.5 * LEN.SP, 14), o.F(0.15 * LEN.SP, 15), add(o.l0.K, P(10, -2)), P(o.l0.A.x + 22, 214), P(o.l0.A.x + 16, 218), P(o.l1.A.x - 16, 218), P(o.l1.A.x - 20, 212), o.F(-0.06 * LEN.SP, -20), o.F(0.5 * LEN.SP, -12)]),
      skirtFolds: [(q, o) => `M${pt(add(o.l0.K, P(2, 4)))} Q${pt(P(o.l0.A.x + 8, 196))} ${pt(P(o.l0.A.x + 12, 215))}`] }),
    // Secde — erkek: kollar yanlardan ve yerden uzak, karın uyluklardan ayrı, ayak parmakları yerde bükük
    secde_m: () => ({ H: P(97, 166), N: P(143, 194), ha: 100, C: P(161, 209.5), hem: 6,
      legs: [{ K: P(103, 212), A: P(60, 199), fa: 70, mode: 'toes' }, { K: P(98, 211), A: P(55, 199), fa: 70, mode: 'toes' }],
      arms: [{ E: P(149, 204), W: P(156, 220), ha: 0, hk: 'flat' }, { E: P(145, 203), W: P(151, 219), ha: 0, hk: 'flat' }], shadowX: [56, 180] }),
    // Secde — kadın: kollar yanlara bitişik, karın uyluklara yakın
    secde_f: () => ({ H: P(90, 188), N: P(136, 205), ha: 100, C: P(154, 209.5),
      legs: [{ K: P(114, 214), A: P(70, 210), fa: 70, mode: 'toes' }, { K: P(109, 214), A: P(65, 210), fa: 70, mode: 'toes' }],
      arms: [{ E: P(128, 216), W: P(146, 220), ha: 0, hk: 'flat' }, { E: P(124, 215), W: P(141, 219), ha: 0, hk: 'flat' }], shadowX: [60, 172],
      skirt: (q, o) => smooth([o.F(0.5 * LEN.SP, 16), o.F(0.1 * LEN.SP, 16), add(o.l0.K, P(8, -6)), add(o.l0.K, P(12, 6)), P(o.l1.A.x - 10, 218), P(o.l1.A.x - 14, 210), o.F(-0.1 * LEN.SP, -18), o.F(0.5 * LEN.SP, -13)]) }),
    // Oturuş — erkek: sol ayak yatık ve üzerine oturulur, sağ ayak parmakları kıbleye dik
    kade_m: () => ({ H: P(100, 193), N: P(106, 137), ha: 24, hem: 18,
      legs: [{ K: P(148, 212), A: P(104, 214), fa: 180, mode: 'flatBack' }, { K: P(143, 210), A: P(93, 200), fa: 72, mode: 'toes' }],
      arms: [{ W: P(129, 197), bend: 1, ha: 6, hk: 'flat' }, { W: P(124, 196), bend: 1, ha: 6, hk: 'flat' }], shadowX: [78, 160] }),
  };
  // yatık ayak (sol ayak, üstü yerde, parmaklar geriye)
  const _foot = foot;

  function sidePose(name, g) {
    let q;
    if (name === 'ruku') q = g === 'm' ? SIDE.ruku_m() : SIDE.ruku_f();
    else if (name === 'secde') q = g === 'm' ? SIDE.secde_m() : SIDE.secde_f();
    else if (name === 'kade') q = SIDE.kade_m();
    else q = SIDE.kavme(g);
    if (q.legs.some((l) => l.mode === 'flatBack')) {
      q.legs = q.legs.map((l) => l.mode === 'flatBack' ? { ...l, fa: 0, mode: 'back' } : l);
    }
    return sideFigure(q, g);
  }

  // ------------------------------------------------------------ seccade
  function rug(view) {
    if (view === 'front') {
      return `<g><path d="M44 214 L196 214 L214 232 L26 232 Z" fill="#9E2F2F"/><path d="M52 216 L188 216 L202 230 L38 230 Z" fill="none" stroke="#E2B04E" stroke-width="1.4"/>
        <path d="M120 217 l5 4 l-5 4 l-5 -4 Z" fill="#E2B04E"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${30 + i * 30} 232 v3" stroke="#E2B04E" stroke-width="1.2"/>`).join('')}</g>`;
    }
    return `<g><rect x="14" y="222" width="212" height="9" rx="2" fill="#9E2F2F"/><rect x="20" y="224.2" width="200" height="4.6" rx="1.4" fill="none" stroke="#E2B04E" stroke-width="1.2"/>
      ${[40, 70, 100, 130, 160, 190].map((x) => `<path d="M${x} 226.5 l3.4 -1.8 l3.4 1.8 l-3.4 1.8 Z" fill="#E2B04E"/>`).join('')}
      ${[0, 1, 2, 3].map((i) => `<path d="M13 ${223 + i * 2.4} h-4 M227 ${223 + i * 2.4} h4" stroke="#E2B04E" stroke-width=".9"/>`).join('')}</g>`;
  }

  const VIEW = { niyet: 'front', tekbir: 'front', kiyam: 'front', ruku: 'side', kavme: 'side', secde: 'side', kade: 'side', selamR: 'frontSit', selamL: 'frontSit' };

  /** Dışa açık: duruş çizimi. pose: niyet|tekbir|kiyam|ruku|kavme|secde|kade|selamR|selamL; g: 'm'|'f' */
  function poseSvg(pose, opts = {}) {
    const g = opts.gender || (K.Store && K.Store.s.settings.namazGender) || 'm';
    let view = VIEW[pose] || 'side';
    if (pose === 'kade' && g === 'f') view = 'frontSit';
    let body;
    if (view === 'front') body = frontStanding(g, pose);
    else if (view === 'frontSit') body = frontSitting(g, pose === 'selamR' ? -1 : pose === 'selamL' ? 1 : 0);
    else body = sidePose(pose, g);
    const bg = opts.noRug ? '' : `<rect x="0" y="0" width="240" height="240" fill="url(#gBg)"/>${rug(view === 'side' ? 'side' : 'front')}`;
    const vb = opts.tight ? '10 10 220 225' : '0 0 240 240';
    return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img">${DEFS}${bg}${body}</svg>`;
  }

  K.Fig = { poseSvg, sideFigure, frontStanding, frontSitting, headSide, headFront, hand, foot, palmFront, shade, sweep, prof, smooth, ik, P, add, sub, mul, norm, lerp, dir, front, frame, DEFS, SKIN, SKIN_FAR, C, crease, dropShadow, LEN, ARM, ARM_F, uid, pt, f1 };
})();

/* ------------------------------------------------------------ abdest (v3) */
(function () {
  const F_ = K.Fig;
  const { P, add, sub, mul, norm, lerp, dir, front, shade, sweep, prof, smooth, ik, SKIN, SKIN_FAR, C, crease, dropShadow, hand, foot, headSide, pt, f1, uid } = F_;
  const SLEEVE_UP = prof([[0, 8.6, 8.4], [0.5, 7.6, 7.4], [1, 7, 7]]);
  const FOREARM = prof([[0, 5.6, 5.6], [0.3, 6, 5.4], [1, 4.2, 4]]);
  const LEG = prof([[0, 12, 13.5], [0.25, 11, 11.6], [0.5, 8.6, 8.6], [0.66, 8, 10.4], [0.86, 7.2, 8], [1, 6.4, 6.8]]);
  const SHIN_SKIN = prof([[0, 6, 7], [1, 4.4, 4.6]]);
  const WATER = '#7CC7EE';
  const DRESS = { b: '#D9C7DE', d: '#A58FB0', l: '#F3EAF5', o: '#6E5A7A' };
  const DRESS_FAR = { b: '#C7B4CD', d: '#957F9F', l: '#E2D6E6', o: '#5F4C6A' };
  const BONE = { b: '#F1E3D3', d: '#C7B29A', l: '#FFFFFF', o: '#9A8670' };

  function stream(x1, y1, x2, y2, w = 5) {
    const id = uid('w');
    return `<g><path d="M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}" fill="none" stroke="${WATER}" stroke-width="${w}" stroke-linecap="round" opacity=".7"/>
      <path d="M${x1 - w * 0.2} ${y1} C${x1 - w * 0.2} ${(y1 + y2) / 2} ${x2 - w * 0.2} ${(y1 + y2) / 2} ${x2 - w * 0.2} ${y2}" fill="none" stroke="#E6F6FF" stroke-width="${w * 0.3}" stroke-linecap="round" opacity=".9"/></g>`;
  }
  function splash(x, y, n = 6) {
    let o = '';
    for (let i = 0; i < n; i++) {
      const a = -160 + (i * 140) / (n - 1), r = 6 + (i % 3) * 3;
      const p = add(P(x, y), mul(dir(a), r));
      o += `<path d="M${f1(p.x)} ${f1(p.y - 2)} q1.4 2 0 3.2 a1.7 1.7 0 1 1 0 -3.2 z" fill="${WATER}" opacity=".85"/>`;
    }
    return o;
  }
  function headBone(Cp, a) {
    const tr = `translate(${f1(Cp.x)} ${f1(Cp.y)}) rotate(${f1(a)})`;
    const HEAD_F = 'M-1 -14.6 C6 -15 10.2 -11.8 11.2 -7.2 C11.5 -5.6 11.4 -4.6 12 -3.6 C12.5 -2.4 12.6 -0.9 13.3 1 C13.8 2.3 14.1 3.2 13.5 3.9 C13 4.4 12.3 4.3 11.8 4.7 C12.3 5.5 12.6 6.2 12.2 6.9 C12.7 7.6 12.4 8.5 11.8 8.9 C11.2 9.5 11.5 10.5 11 11.4 C10 12.9 8.2 13.1 6.2 12.6 C3.4 11.9 1 10.6 -1.4 8.3 C-3 7 -5 7.4 -8 7.4 C-11.3 5.8 -12.6 1 -12.2 -4 C-11.8 -9.8 -7.2 -14.6 -1 -14.6 Z';
    return `<g transform="${tr}">${shade(HEAD_F, SKIN, { rim: 7, lw: 0.7 })}
      ${shade('M-1.4 -2.8 C-4.6 -3.8 -6.8 -1.2 -6.2 2 C-5.8 4.6 -4.2 5.8 -2.4 5.2 C-1.8 3.2 -1.4 0.2 -1.4 -2.8 Z', SKIN, { rim: 3, lw: 0.6 })}
      ${shade('M9.4 -9.4 C8.6 -16 1 -18.4 -5 -17.2 C-11.6 -15.8 -14.8 -9.6 -14 -2.8 C-13.4 2 -11.6 6 -9.2 9.2 L-4.6 8.6 C-6.2 5.6 -6.8 2.6 -6.4 -0.6 C-5.8 -4.4 -2 -6.4 2.6 -7.4 C5.2 -8 7.4 -8.4 9.4 -9.4 Z', BONE, { rim: 5, lw: 0.7 })}
      <path d="M4.8 -2.3 Q6.7 -3.6 8.6 -2.5 Q7 -1.2 4.8 -2.3 Z" fill="#fff"/><circle cx="7.4" cy="-2.35" r=".95" fill="#2A1C14"/>
      <path d="M4.7 -2.4 Q6.7 -3.9 8.8 -2.6" fill="none" stroke="#3A2418" stroke-width=".9"/><path d="M4.4 -5.2 Q7.2 -6.6 10.6 -5.4" fill="none" stroke="#4A3428" stroke-width="1.1" stroke-linecap="round"/>
      <path d="M11.4 7 L12.6 7.05" stroke="#9C5546" stroke-width=".8"/><ellipse cx="6.5" cy="3.5" rx="3.4" ry="2.2" fill="#E88F80" opacity=".28" filter="url(#fb05)"/></g>`;
  }
  function headBare(Cp, a) {
    // erkek: takkesiz (abdestte baş mesh edilir)
    const svg = headSide(Cp, a, 'm', 1);
    return svg.replace(/<g transform="[^"]*">\s*<clipPath[\s\S]*$/, svg).replace(/\$\{[^}]*\}/g, '');
  }

  /** Oturan figür (yüz sağa); sonra aynalanarak sağ taraf öne alınır. q: {arms:[near,far], legs:[near,far], ha, tilt} */
  function seated(q, g) {
    const fem = g === 'f';
    const col = C[g];
    const top = fem ? DRESS : col.top, topFar = fem ? DRESS_FAR : col.topFar;
    const H = P(84, 166), N = add(H, mul(norm(P(q.tilt || 0.08, -1)), 56));
    const up = norm(sub(N, H)), fr = P(up.y * -1 * -1, 0) && front(P(-up.x, -up.y));
    const T = (u, f) => add(add(H, mul(up, u * 56)), mul(fr, f));
    const Cp = add(N, mul(dir((q.ha || 0) - 90), 17.5));
    const S = T(0.88, -1), S2 = add(S, mul(fr, -2));
    const out = [];
    const legJ = (L) => ({ K: L.K, A: L.A });
    const l0 = legJ(q.legs[0]), l1 = legJ(q.legs[1]);
    const armJ = (A, sh) => { const E = A.E || ik(sh, A.W, 35, 30, A.bend == null ? 1 : A.bend); const W = A.E ? A.W : add(E, mul(norm(sub(A.W, E)), 30)); return { E, W }; };
    const a0 = armJ(q.arms[0], S), a1 = armJ(q.arms[1], S2);
    // tabure
    out.push(`<g><rect x="60" y="168" width="50" height="7" rx="2.5" fill="#9C6B3F" stroke="#6B4524" stroke-width=".8"/><path d="M66 175 L62 222 M104 175 L108 222 M70 175 L72 222 M100 175 L98 222" stroke="#7A5030" stroke-width="3.2" stroke-linecap="round"/></g>`);
    // uzak bacak
    out.push(foot(l1.A, q.legs[1].fa || 0, true, q.legs[1].mode));
    if (!fem) {
      out.push(shade(sweep([add(H, P(-2, 0)), l1.K, lerp(l1.K, l1.A, q.legs[1].roll ? 0.7 : 1)], LEG), col.botFar, { rim: 8 }));
      if (q.legs[1].roll) out.push(shade(sweep([lerp(l1.K, l1.A, 0.68), l1.A], SHIN_SKIN), SKIN_FAR, { rim: 4 }));
    } else {
      if (q.legs[1].bare) out.push(shade(sweep([lerp(l1.K, l1.A, 0.4), l1.A], SHIN_SKIN), SKIN_FAR, { rim: 4 }));
      // uzak bacağı örten etek
      const hem1 = q.legs[1].bare ? lerp(l1.K, l1.A, 0.42) : add(l1.A, P(0, -6));
      out.push(shade(sweep([add(H, P(-2, 0)), l1.K, hem1], prof([[0, 15, 15], [0.5, 12, 12], [1, 12, 12]]), { flatEnd: true }), DRESS_FAR, { rim: 10 }));
    }
    // uzak kol
    const upFar = sweep([S2, a1.E], SLEEVE_UP), foFar = sweep([a1.E, a1.W], FOREARM);
    out.push(shade(foFar, SKIN_FAR, { rim: 4 }));
    out.push(shade(upFar, topFar, { rim: 6 }));
    out.push(hand(a1.W, q.arms[1].ha, q.arms[1].hk, true));
    // gövde
    const torso = smooth([T(1.02, 6), T(0.9, fem ? 12.5 : 12), T(0.72, fem ? 15 : 13.5), T(0.5, 12), T(0.25, 13), T(0.04, 12), add(H, mul(norm(sub(l0.K, H)), 20)), add(add(H, mul(norm(sub(l0.K, H)), 22)), P(0, 12)), T(-0.12, -14), T(0.1, -16), T(0.4, -10), T(0.72, -11), T(0.9, -12), T(1.02, -6)]);
    // yakın bacak
    if (!fem) {
      out.push(foot(l0.A, q.legs[0].fa || 0, false, q.legs[0].mode));
      const lim = q.legs[0].roll ? 0.7 : 1;
      out.push(shade(sweep([H, l0.K, lerp(l0.K, l0.A, lim)], LEG), col.bot, { rim: 9 }));
      if (q.legs[0].roll) {
        out.push(shade(sweep([lerp(l0.K, l0.A, 0.68), l0.A], SHIN_SKIN), SKIN, { rim: 4 }));
        const cu = lerp(l0.K, l0.A, 0.69), u2 = norm(sub(l0.A, l0.K));
        out.push(shade(sweep([add(cu, mul(u2, -3)), add(cu, mul(u2, 3))], prof([[0, 9, 9.6], [1, 9, 9.6]])), col.bot, { rim: 3 }));
      }
      out.push(shade(torso, top, { rim: 12 }));
    } else {
      out.push(foot(l0.A, q.legs[0].fa || 0, false, q.legs[0].mode));
      if (q.legs[0].bare) out.push(shade(sweep([lerp(l0.K, l0.A, 0.4), l0.A], SHIN_SKIN), SKIN, { rim: 4 }));
      // elbise eteği bacakları örter
      const hemA = q.legs[0].bare ? lerp(l0.K, l0.A, 0.42) : add(l0.A, P(0, -6));
      const ku = norm(sub(l0.A, l0.K));
      const skirt = smooth([T(0.4, 12), add(l0.K, add(mul(front(ku), 2), P(4, -14))), add(l0.K, P(14, 2)), add(hemA, mul(front(ku), 11)), add(hemA, mul(front(ku), -12)), add(l0.K, P(-14, 14)), T(-0.1, -16), T(0.4, -11)]);
      out.push(shade(skirt, top, { rim: 14 }));
      out.push(crease(`M${pt(add(l0.K, P(4, 4)))} Q${pt(lerp(l0.K, hemA, 0.6))} ${pt(add(hemA, mul(front(ku), 4)))}`, top.d, 1.1, 0.5));
      out.push(shade(torso, top, { rim: 12 }));
    }
    // boyun + baş
    out.push(shade(sweep([T(0.96, 0), Cp], prof([[0, 7, 7], [1, 6, 6]]), { flatStart: true }), SKIN, { rim: 5 }));
    if (fem) out.push(headBone(Cp, q.ha || 0));
    else out.push(headSide(Cp, q.ha || 0, 'm', 1, { noCap: true }));
    // yakın kol (kıvrılmış kol: dirseğe kadar çıplak)
    const upD = sweep([S, a0.E], SLEEVE_UP), foD = sweep([a0.E, a0.W], FOREARM);
    out.push(dropShadow(upD, 2, 2.5, 0.2));
    out.push(shade(foD, SKIN, { rim: 5 }));
    out.push(shade(upD, top, { rim: 7 }));
    const eu = norm(sub(a0.E, S));
    out.push(crease(`M${pt(add(a0.E, add(mul(eu, -4), mul(front(eu), 7))))} L${pt(add(a0.E, add(mul(eu, -4), mul(front(eu), -7))))}`, top.d, 1.4, 0.6));
    out.push(hand(a0.W, q.arms[0].ha, q.arms[0].hk, false));
    return { svg: out.join(''), Cp, a0, a1, l0, l1 };
  }

  const FAUCET = (x, y) => `<g><rect x="${x + 8}" y="${y - 26}" width="40" height="70" rx="3" fill="#E9E4DA" stroke="#C9C1B2"/>
    <path d="M${x + 12} ${y - 6} h-14 q-6 0 -6 6 v4 h6 v-2 q0 -2 2 -2 h12 z" fill="#B9C3CC" stroke="#7C8792" stroke-width="1"/>
    <circle cx="${x + 18}" cy="${y - 12}" r="4" fill="#9AA6B1" stroke="#6F7A85"/></g>`;
  const BASIN = `<g><path d="M120 214 L232 214 L232 226 L120 226 Z" fill="#D9D2C5" stroke="#B3AA99"/><path d="M126 214 q50 -6 100 0" fill="none" stroke="#C3BAA9"/></g>`;

  // her adım: kollar/bacaklar, su akışı, kadraj
  const SEAT_LEGS = [{ K: P(132, 168), A: P(134, 211), fa: 0 }, { K: P(127, 167), A: P(126, 211), fa: 0 }];
  const STEPS = [
    { arms: [{ W: P(122, 160), ha: 10, hk: 'flat' }, { W: P(117, 159), ha: 10, hk: 'flat' }], ha: 8, vb: [30, 40, 190, 190] },                                   // niyet
    { arms: [{ W: P(140, 144), ha: 6, hk: 'cup' }, { W: P(136, 142), ha: -6, hk: 'cup' }], tap: [160, 132, 154, 146], ha: 12, vb: [40, 50, 170, 170] },             // eller
    { arms: [{ E: P(104, 136), W: P(96, 116), ha: -40, hk: 'cup' }, { W: P(117, 159), ha: 10, hk: 'flat' }], ha: 0, vb: [52, 52, 110, 110], drops: [101, 104] },   // ağız
    { arms: [{ E: P(104, 134), W: P(98, 110), ha: -56, hk: 'cup' }, { W: P(117, 159), ha: 10, hk: 'flat' }], ha: -4, vb: [52, 52, 110, 110], drops: [104, 97] },  // burun
    { arms: [{ E: P(104, 130), W: P(97, 108), ha: -75, hk: 'flat' }, { E: P(100, 130), W: P(94, 108), ha: -75, hk: 'flat' }], ha: 0, vb: [52, 52, 110, 110], drops: [104, 112] }, // yüz
    { arms: [{ E: P(114, 140), W: P(146, 146), ha: 0, hk: 'flat' }, { E: P(104, 132), W: P(126, 136), ha: 20, hk: 'flat' }], tap: [160, 132, 150, 146], ha: 14, vb: [40, 60, 160, 160] }, // sağ kol
    { arms: [{ E: P(104, 134), W: P(126, 140), ha: 14, hk: 'flat' }, { E: P(112, 138), W: P(146, 144), ha: 0, hk: 'flat' }], tap: [160, 132, 150, 144], ha: 14, vb: [40, 60, 160, 160] }, // sol kol
    { arms: [{ E: P(116, 92), W: P(102, 80), ha: 186, hk: 'flat' }, { W: P(117, 159), ha: 10, hk: 'flat' }], ha: 6, vb: [44, 44, 120, 120] },                      // baş
    { arms: [{ E: P(96, 132), W: P(85, 112), ha: -92, hk: 'point' }, { W: P(117, 159), ha: 10, hk: 'flat' }], ha: 0, vb: [46, 52, 110, 110] },                     // kulak
    { arms: [{ E: P(74, 128), W: P(77, 108), ha: -84, hk: 'flat' }, { W: P(117, 159), ha: 10, hk: 'flat' }], ha: 14, vb: [40, 52, 120, 120] },                     // boyun
    { legs: [{ K: P(134, 170), A: P(164, 192), fa: 4, roll: true, bare: true }, SEAT_LEGS[1]], arms: [{ W: P(124, 162), ha: 10, hk: 'flat' }, { E: P(132, 160), W: P(172, 186), ha: 10, hk: 'point' }], tap: [190, 150, 180, 188], ha: 22, tilt: 0.3, vb: [60, 110, 180, 120] }, // sağ ayak
    { legs: [SEAT_LEGS[0], { K: P(130, 170), A: P(160, 191), fa: 4, roll: true, bare: true }], arms: [{ W: P(124, 162), ha: 10, hk: 'flat' }, { E: P(128, 160), W: P(168, 185), ha: 10, hk: 'point' }], tap: [188, 150, 176, 187], ha: 22, tilt: 0.3, vb: [60, 110, 180, 120] }, // sol ayak
    { arms: [{ W: P(122, 160), ha: 10, hk: 'flat' }, { W: P(117, 159), ha: 10, hk: 'flat' }], ha: -12, vb: [30, 40, 190, 190] },                                  // şehadet
  ];

  function abdestSvg(i, g) {
    g = g || (K.Store && K.Store.s.settings.namazGender) || 'm';
    const st = STEPS[i] || STEPS[0];
    const q = { arms: st.arms, legs: st.legs || SEAT_LEGS, ha: st.ha, tilt: st.tilt };
    const fig = seated(q, g);
    const parts = [`<rect x="0" y="0" width="240" height="240" fill="url(#gBg)"/>`, `<rect x="0" y="40" width="240" height="6" fill="#E2D6C2" opacity=".6"/>`,
      `<ellipse cx="110" cy="224" rx="70" ry="5" fill="#5a4630" opacity=".25" filter="url(#fb4)"/>`, BASIN, FAUCET(st.tap ? st.tap[0] : 166, st.tap ? st.tap[1] : 132), fig.svg];
    if (st.tap) parts.push(stream(st.tap[0] - 8, st.tap[1] + 4, st.tap[2], st.tap[3], 4.6) + splash(st.tap[2], st.tap[3] + 3));
    if (st.drops) parts.push(splash(st.drops[0], st.drops[1], 5));
    // aynala: sağ taraf izleyiciye dönük olsun (önce sağ kol, sağ ayak yıkanır)
    const [x, y, w, h] = st.vb;
    const mx = 240 - x - w;
    return `<svg viewBox="${mx} ${y} ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${F_.DEFS}<g transform="translate(240 0) scale(-1 1)">${parts.join('')}</g></svg>`;
  }

  F_.abdestSvg = abdestSvg;
  F_.seated = seated;
})();
