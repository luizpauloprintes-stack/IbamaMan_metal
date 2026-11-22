// Efeitos sonoros 100% sintetizados com Web Audio API (sem arquivos de áudio).
let ctx = null;
let master = null;
let noiseBuf = null;
let musicBus = null;
let sfxOn = true;
const last = {};

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = seq.on ? 0.11 : 0;
    musicBus.connect(ctx.destination);
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

function tone({ type = 'square', from = 440, to = from, dur = 0.1, vol = 0.3, delay = 0, at = null, out = null }) {
  const c = ac(); if (!c || c.state !== 'running') return;
  if (!out && !sfxOn) return;
  const t = at !== null ? at : c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(out || master); o.start(t); o.stop(t + dur + 0.02);
}

function noise({ dur = 0.3, vol = 0.5, freq = 1200, q = 0.7, delay = 0, sweepTo = 200, at = null, out = null }) {
  const c = ac(); if (!c || c.state !== 'running') return;
  if (!out && !sfxOn) return;
  const t = at !== null ? at : c.currentTime + delay;
  const s = c.createBufferSource(); s.buffer = noiseBuf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(out || master); s.start(t); s.stop(t + dur + 0.02);
}

export function setSfxEnabled(on) { sfxOn = on; }

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
  stamp() { tone({ type: 'square', from: 180, to: 90, dur: 0.08, vol: 0.2 }); noise({ dur: 0.06, vol: 0.2, freq: 2500, sweepTo: 600 }); },
  star() { [880, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.12, vol: 0.2, delay: i * 0.05 })); },
  click() { tone({ type: 'square', from: 700, to: 900, dur: 0.05, vol: 0.12 }); },
  combo(n) { tone({ type: 'square', from: 500 + n * 120, to: 700 + n * 140, dur: 0.08, vol: 0.13 }); },
  victory() {
    const notes = [523, 659, 784, 1046, 784, 1046, 1318, 1568];
    notes.forEach((f, i) => tone({ type: 'square', from: f, dur: i === notes.length - 1 ? 0.6 : 0.14, vol: 0.2, delay: i * 0.15 }));
    [262, 330, 392].forEach((f) => tone({ type: 'triangle', from: f, dur: 1.2, vol: 0.15, delay: 1.05 }));
  }
};

// ---------------------------------------------------------------- música
// Sequenciador chiptune simples (16 passos por compasso): baixo em triângulo, arpejo em onda quadrada
// e chimbal em ruído. Cada trilha = andamento + progressão de acordes (MIDI) + desenho da melodia.
const MOTIF = [0, -1, 1, 2, -1, 2, 1, -1, 0, 1, -1, 2, 1, -1, 0, -1]; // índice da nota do acorde (-1 = pausa)
const MOTIF_B = [2, -1, 1, 0, 1, -1, 2, 3, -1, 2, 1, -1, 0, -1, 1, -1];
const TRACKS = {
  title: { bpm: 96, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], hat: false },
  level: { bpm: 116, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], hat: true },
  boss: { bpm: 142, chords: [[50, 53, 57], [46, 50, 53], [45, 49, 52], [50, 53, 57]], hat: true, drive: true }
};
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const seq = { timer: null, track: null, step: 0, next: 0, shift: 0, on: true };

function scheduleStep(T, step, at) {
  const bar = Math.floor(step / 16) % T.chords.length;
  const i = step % 16;
  const chord = T.chords[bar].map((n) => n + seq.shift);
  const phrase = Math.floor(step / (16 * T.chords.length)) % 2;
  const stepDur = 60 / T.bpm / 4;
  // baixo: tônica nos tempos, oitava nos contratempos
  if (i % 2 === 0) tone({ type: 'triangle', from: midi(chord[0] - 24 + (i % 4 === 2 ? 12 : 0)), dur: stepDur * 1.8, vol: 0.55, at, out: musicBus });
  // melodia/arpejo
  const m = (phrase ? MOTIF_B : MOTIF)[i];
  if (m >= 0) {
    const note = m >= chord.length ? chord[0] + 12 : chord[m];
    tone({ type: 'square', from: midi(note + 12), dur: stepDur * 0.9, vol: T.drive ? 0.2 : 0.16, at, out: musicBus });
  }
  if (T.drive && i % 4 === 0) noise({ dur: 0.09, vol: 0.35, freq: 180, sweepTo: 60, at, out: musicBus });   // bumbo
  if (T.hat && i % 2 === 1) noise({ dur: 0.03, vol: 0.12, freq: 9000, sweepTo: 6000, at, out: musicBus });
}

export const Music = {
  // trilha: 'title' | 'level' | 'boss'; shift = transposição em semitons (varia por missão)
  play(name, shift = 0) {
    const c = ac(); if (!c) return;
    if (seq.track === TRACKS[name] && seq.shift === shift && seq.timer) return;
    this.stop();
    seq.track = TRACKS[name]; seq.shift = shift; seq.step = 0; seq.next = c.currentTime + 0.1;
    seq.timer = setInterval(() => {
      if (!seq.on || c.state !== 'running') { seq.next = c.currentTime + 0.1; return; }
      const T = seq.track; const stepDur = 60 / T.bpm / 4;
      while (seq.next < c.currentTime + 0.15) { scheduleStep(T, seq.step, seq.next); seq.step += 1; seq.next += stepDur; }
    }, 30);
  },
  stop() { if (seq.timer) clearInterval(seq.timer); seq.timer = null; seq.track = null; },
  setEnabled(on) { seq.on = on; if (musicBus) musicBus.gain.value = on ? 0.11 : 0; },
  pause() { if (musicBus && ctx) musicBus.gain.setTargetAtTime(0.03, ctx.currentTime, 0.1); },
  resume() { if (musicBus && ctx && seq.on) musicBus.gain.setTargetAtTime(0.11, ctx.currentTime, 0.1); }
};
