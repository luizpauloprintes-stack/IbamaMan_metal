// Efeitos sonoros 100% sintetizados com Web Audio API (sem arquivos de áudio).
let ctx = null;
let master = null;
let noiseBuf = null;
const last = {};

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

// Chamar no primeiro toque/tecla (políticas de autoplay do Android/Chrome).
export function unlockAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume();
}

function throttle(name, ms) {
  const now = performance.now();
  if (last[name] && now - last[name] < ms) return true;
  last[name] = now;
  return false;
}

function tone({ type = 'square', from = 440, to = from, dur = 0.1, vol = 0.3, delay = 0 }) {
  const c = ac(); if (!c || c.state !== 'running') return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}

function noise({ dur = 0.3, vol = 0.5, freq = 1200, q = 0.7, delay = 0, sweepTo = 200 }) {
  const c = ac(); if (!c || c.state !== 'running') return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource(); s.buffer = noiseBuf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}

export const Sfx = {
  shoot(kind = 'PISTOL') {
    if (kind === 'H') { if (throttle('hmg', 70)) return; tone({ from: 900, to: 300, dur: 0.05, vol: 0.12 }); noise({ dur: 0.05, vol: 0.15, freq: 4000 }); return; }
    if (kind === 'R') { noise({ dur: 0.35, vol: 0.3, freq: 2500, sweepTo: 300 }); tone({ type: 'sawtooth', from: 200, to: 80, dur: 0.3, vol: 0.12 }); return; }
    if (kind === 'F') { if (throttle('flame', 120)) return; noise({ dur: 0.18, vol: 0.18, freq: 900, sweepTo: 400 }); return; }
    tone({ from: 1200, to: 400, dur: 0.07, vol: 0.14 });
  },
  explosion(big = false) {
    if (throttle('boom', 40)) return;
    noise({ dur: big ? 0.9 : 0.45, vol: big ? 0.7 : 0.45, freq: big ? 900 : 1500, sweepTo: 60 });
    tone({ type: 'sine', from: big ? 120 : 160, to: 30, dur: big ? 0.6 : 0.3, vol: 0.4 });
  },
  hit() { if (throttle('hit', 50)) return; tone({ from: 300, to: 120, dur: 0.06, vol: 0.12 }); },
  bossHit() { if (throttle('bhit', 60)) return; tone({ type: 'triangle', from: 220, to: 90, dur: 0.07, vol: 0.18 }); noise({ dur: 0.05, vol: 0.12, freq: 3000 }); },
  jump() { tone({ from: 300, to: 700, dur: 0.12, vol: 0.12 }); },
  pickup() { [660, 880, 1320].forEach((f, i) => tone({ from: f, dur: 0.08, vol: 0.18, delay: i * 0.06 })); },
  rescue() { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.1, vol: 0.2, delay: i * 0.07 })); },
  hurt() { tone({ type: 'sawtooth', from: 500, to: 60, dur: 0.5, vol: 0.25 }); },
  throwBomb() { tone({ type: 'triangle', from: 500, to: 250, dur: 0.15, vol: 0.12 }); },
  alarm() { for (let i = 0; i < 4; i++) tone({ type: 'square', from: i % 2 ? 520 : 780, dur: 0.22, vol: 0.15, delay: i * 0.24 }); },
  victory() {
    const notes = [523, 659, 784, 1046, 784, 1046, 1318, 1568];
    notes.forEach((f, i) => tone({ type: 'square', from: f, dur: i === notes.length - 1 ? 0.6 : 0.14, vol: 0.2, delay: i * 0.15 }));
    [262, 330, 392].forEach((f) => tone({ type: 'triangle', from: f, dur: 1.2, vol: 0.15, delay: 1.05 }));
  }
};
