/* Kısa efekt sesleri (WebAudio ile sentezlenir; müzik yoktur). */
window.K = window.K || {};
(function () {
  let ctx = null;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const enabled = () => !K.Store || K.Store.s.settings.sfx !== false;

  function tone(freq, dur, type = 'sine', vol = 0.18, when = 0, slideTo = null) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.2, when = 0, hp = 1200) {
    const c = ac(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(c.currentTime + when);
  }
  const S = {
    unlock() { ac(); },
    tap() { if (enabled()) tone(660, 0.06, 'triangle', 0.08); },
    pop() { if (!enabled()) return; noise(0.12, 0.35, 0, 900); tone(900, 0.08, 'square', 0.05, 0, 300); },
    ok() { if (!enabled()) return; tone(784, 0.12, 'triangle', 0.16); tone(1175, 0.22, 'triangle', 0.16, 0.1); },
    soft() { if (!enabled()) return; tone(330, 0.18, 'sine', 0.12, 0, 250); },
    flip() { if (enabled()) tone(520, 0.07, 'sine', 0.08, 0, 700); },
    star() { if (!enabled()) return; [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.08)); },
    tada() { if (!enabled()) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, i * 0.11)); tone(1047, 0.6, 'sine', 0.1, 0.48); },
    whoosh() { if (enabled()) noise(0.3, 0.12, 0, 2500); },
    unlock2() { if (!enabled()) return; tone(440, 0.1, 'sine', 0.12); tone(880, 0.25, 'sine', 0.12, 0.1); },
    recOn() { if (enabled()) tone(880, 0.1, 'sine', 0.12); },
    recOff() { if (enabled()) tone(440, 0.12, 'sine', 0.12); },
  };
  K.Sfx = S;
})();
