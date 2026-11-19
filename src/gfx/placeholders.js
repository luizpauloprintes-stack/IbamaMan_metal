// Gera TODAS as texturas placeholder em pixel art via this.make.graphics().
// Cada key respeita o formato de src/config/assets.js (KEYS), para que um PNG real
// carregado com load.spritesheet(key, file, { frameWidth, frameHeight }) substitua o placeholder sem mudar código.
import { KEYS } from '../config/assets.js';

// ---------- utilitários ----------
function toGrid(rows) { return rows.map((r) => r.split('')); }
function fromGrid(g) { return g.map((r) => r.join('')); }
function setPx(grid, x, y, ch) { if (grid[y] && x >= 0 && x < grid[y].length) grid[y][x] = ch; }

function drawMap(g, rows, pal, ox, oy, px) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ' || pal[ch] === undefined) continue;
      g.fillStyle(pal[ch], 1);
      g.fillRect(ox + x * px, oy + y * px, px, px);
    }
  });
}

// Cria uma textura com N quadros lado a lado e registra frames numéricos 0..N-1 (igual a um spritesheet).
function makeSheet(scene, key, frames, drawFrame) {
  if (scene.textures.exists(key)) return; // PNG real já carregado
  const { w, h } = KEYS[key];
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let i = 0; i < frames; i++) drawFrame(g, i, i * w, 0, w, h);
  g.generateTexture(key, w * frames, h);
  g.destroy();
  const tex = scene.textures.get(key);
  for (let i = 0; i < frames; i++) tex.add(i, 0, i * w, 0, w, h);
}

// círculo "pixelado" (blocos de 4px) com cor por distância
function blockyBurst(g, cx, cy, r, colorAt, step = 4) {
  for (let y = -r; y <= r; y += step) {
    for (let x = -r; x <= r; x += step) {
      const d = Math.sqrt(x * x + y * y) + (Math.random() * 6 - 3);
      if (d > r) continue;
      const c = colorAt(d / r);
      if (c === null) continue;
      g.fillStyle(c, 1);
      g.fillRect(Math.round(cx + x), Math.round(cy + y), step, step);
    }
  }
}

const FONT = {
  H: ['X...X', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  R: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'],
  F: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'X....'],
  G: ['.XXX.', 'X...X', 'X....', 'X.XXX', 'X...X', 'X...X', '.XXX.'],
  E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
  g: ['XXX', 'X..', 'X.X', 'XXX'] // "Hg" minúsculo (usado só no balde)
};
function drawLetter(g, ch, ox, oy, px, color) { drawMap(g, FONT[ch], { X: color }, ox, oy, px); }

// ---------- protagonista IbamaMan (16x16 @ 4px = 64x64) ----------
const PAL_P = {
  H: 0x4b5320, L: 0x2f74c0, S: 0xd9a066, E: 0x1a1a1a, G: 0x5b6e33, V: 0x34421e,
  W: 0xf2f2f2, K: 0x3c424b, B: 0x5a3a1a, P: 0x4f5d2f, Y: 0xffe14d, O: 0xff8a1f, D: 0x222222, M: 0x7a1f1f
};
const P_BODY = [
  '......HHHH......',
  '.....HHLLHH.....',
  '...HHHHHHHHHH...',
  '......SSSSE.....',
  '......SSSSS.....',
  '.......SSS......',
  '.....GGVVGG.....',
  '....GVVWWVKKKKK.',
  '....SVVVVVSKK...',
  '.....VVVVVG.....',
  '.....BBBBB......',
  '.....PPPPP......'
];
const P_LEGS = {
  stand: ['.....PP.PP......', '.....PP.PP......', '.....PP.PP......', '....BBB.BBB.....'],
  r0: ['....PP...PP.....', '...PP.....PP....', '..PP.......PP...', '.BB.........BB..'],
  r1: ['.....PPPP.......', '......PPP.......', '......P.PP......', '.....BB..BB.....'],
  r2: ['......PP.P......', '.....PP..PP.....', '....PP....PP....', '...BB......BB...'],
  r3: ['.....PPPP.......', '.....PP.PP......', '....PP...PP.....', '....BB...BB.....'],
  r4: ['......PPP.......', '......PP........', '.....PPPP.......', '.....BB.BB......'],
  jump: ['....PPPPPP......', '....P....PP.....', '...BB.....BB....', '................']
};
const RUN = ['r0', 'r1', 'r2', 'r3', 'r4'];

function playerGrid(legs) { return toGrid([...P_BODY, ...P_LEGS[legs]]); }

function generatePlayer(scene) {
  makeSheet(scene, 'player_run', 5, (g, i, ox) => drawMap(g, P_BODY.concat(P_LEGS[RUN[i]]), PAL_P, ox, 0, 4));

  makeSheet(scene, 'player_shoot', 5, (g, i, ox) => {
    const grid = playerGrid(RUN[i]);
    // recuo + clarão na ponta do cano nos quadros ímpares
    if (i % 2 === 1) { setPx(grid, 15, 7, 'Y'); setPx(grid, 15, 6, 'O'); setPx(grid, 15, 8, 'O'); }
    drawMap(g, fromGrid(grid), PAL_P, ox, 0, 4);
  });

  makeSheet(scene, 'player_bomb_win', 10, (g, i, ox) => {
    let grid; let oy = 0;
    if (i < 5) {
      grid = playerGrid(i === 2 || i === 3 ? 'r2' : 'stand');
      if (i === 1 || i === 2) { // braço para trás/alto com a carga
        setPx(grid, 4, 8, '.'); setPx(grid, 3, 7, 'S'); setPx(grid, 3, 6, 'S'); setPx(grid, 3, 5, 'S');
        setPx(grid, 2, 4, 'D'); setPx(grid, 3, 4, 'D'); setPx(grid, 2, 3, 'D'); setPx(grid, 3, 3, 'D');
        setPx(grid, 1, 2, i === 2 ? 'Y' : 'O');
      }
      if (i === 3) { setPx(grid, 4, 8, '.'); for (let x = 10; x <= 13; x++) setPx(grid, x, 6, 'S'); }
    } else {
      grid = playerGrid('stand');
      for (let x = 10; x <= 15; x++) { setPx(grid, x, 7, x === 10 ? 'V' : '.'); setPx(grid, x, 8, '.'); }
      setPx(grid, 11, 6, 'S'); setPx(grid, 12, 5, 'S'); setPx(grid, 12, 4, 'S'); setPx(grid, 12, 3, 'S'); setPx(grid, 12, 2, 'S');
      setPx(grid, 4, 8, 'S'); setPx(grid, 9, 4, 'M');
      if (i % 2 === 0) { setPx(grid, 12, 1, 'S'); setPx(grid, 13, 1, 'S'); setPx(grid, 13, 2, 'S'); }
    }
    drawMap(g, fromGrid(grid), PAL_P, ox, oy, 4);
  });

  makeSheet(scene, 'player_pose', 4, (g, i, ox) => {
    if (i === 0) drawMap(g, P_BODY.concat(P_LEGS.stand), PAL_P, ox, 0, 4);
    if (i === 1) drawMap(g, P_BODY.concat(['...BBPPPPPBB....']), PAL_P, ox, 12, 4); // agachado
    if (i === 2) drawMap(g, P_BODY.concat(P_LEGS.jump), PAL_P, ox, 0, 4);
    if (i === 3) { // dano
      const pal = { ...PAL_P, S: 0xff6b6b, G: 0xffffff, V: 0xdddddd, P: 0xffffff };
      drawMap(g, P_BODY.concat(P_LEGS.r2), pal, ox, 0, 4);
    }
  });
}

// ---------- garimpeiro com mangueira (enemy_miner_hose) ----------
const PAL_M = { T: 0xd8b45a, t: 0x9c7c2c, S: 0xc68b59, E: 0x1a1a1a, C: 0xcbb48a, c: 0x8f7a55, J: 0x3d5a8a, F: 0x4a2f16, N: 0x5a5a5a, M: 0x7a5a2a, m: 0xa58a52, Q: 0xb7c3c9 };
const M_BODY = [
  '....TTTTTT......',
  '...TtTTTTtT.....',
  '..TTTTTTTTTT....',
  '......SSSE......',
  '......SSSS......',
  '.......SS.......',
  '.....CCcCCC.....',
  '....CCCCcCCNNN..',
  '....SCcCCCSN....',
  '.....CCCcC.N....',
  '.....JJJJJ.N....',
  '.....JJJJJ.NN...'
];
const M_LEGS = {
  stand: ['.....JJ.JJ..N...', '.....JJ.JJ..N...', '.....JJ.JJ.NN...', '....FFF.FFF.....'],
  run: ['....JJ...JJ.....', '...JJ.....JJ....', '..JJ.......JJ...', '.FF.........FF..']
};
function generateMiner(scene) {
  makeSheet(scene, 'enemy_miner_hose', 4, (g, i, ox) => {
    const grid = toGrid(M_BODY.concat(i === 3 ? M_LEGS.run : M_LEGS.stand));
    if (i === 1 || i === 2) { // jato de lama/rejeito saindo da mangueira
      const pts = i === 1 ? [[14, 6], [15, 5], [15, 7], [14, 8]] : [[14, 7], [15, 6], [15, 8], [13, 5]];
      pts.forEach(([x, y], k) => setPx(grid, x, y, k % 2 ? 'm' : 'M'));
      setPx(grid, 9, 4, 'E');
    }
    if (i === 3) { // fuga em pânico: braços para cima, mangueira largada
      [[11, 7], [12, 7], [13, 7], [11, 8], [11, 9], [11, 10], [11, 11], [12, 11]].forEach(([x, y]) => setPx(grid, x, y, '.'));
      setPx(grid, 4, 8, '.'); setPx(grid, 3, 6, 'S'); setPx(grid, 3, 5, 'S'); setPx(grid, 11, 6, 'S'); setPx(grid, 12, 5, 'S');
      setPx(grid, 9, 4, 'E'); setPx(grid, 8, 4, 'E');
    }
    drawMap(g, fromGrid(grid), PAL_M, ox, 0, 4);
  });
}

// ---------- madeireiro com motosserra (enemy_logger) ----------
const PAL_L = { A: 0x5b3a1e, S: 0xd19a6a, E: 0x1a1a1a, R: 0xa83232, r: 0x5c1515, J: 0x34507a, F: 0x3a2412, O: 0xe08a1e, Q: 0xb8c0c6, q: 0x6d757b };
function generateLogger(scene) {
  const body = [
    '.....AAAAA......', '....AAAAAAA.....', '.....SSSSE......', '.....SSSSS......', '.....AAAA.......',
    '....RrRrRr......', '...RrRrRrRr.....', '...SRrRrRrOOQQQQ', '....rRrRrROOq...', '....RrRrRr......',
    '....JJJJJJ......', '....JJJJJJ......'
  ];
  const legs = ['....JJ..JJ......', '...JJ....JJ.....', '...JJ....JJ.....', '..FFF....FFF....'];
  makeSheet(scene, 'enemy_logger', 4, (g, i, ox) => {
    const grid = toGrid(body.concat(legs));
    if (i === 1) { // golpe: lâmina para cima
      for (let x = 12; x <= 15; x++) setPx(grid, x, 7, '.');
      [[12, 6], [13, 5], [14, 4], [15, 3]].forEach(([x, y]) => setPx(grid, x, y, 'Q'));
    }
    let pal = PAL_L;
    if (i === 2) pal = { ...PAL_L, S: 0xff8080 };            // reação a dano
    if (i === 3) pal = { ...PAL_L, R: 0x6a3a3a, r: 0x3a1a1a, J: 0x2a3a52, S: 0x9a7a5a }; // derrotado
    drawMap(g, fromGrid(grid), pal, ox, 0, 4);
  });
}

// ---------- animais em gaiolas (wildlife_cages: preso/solto x4) ----------
const ANIMALS = [
  { pal: { R: 0xd32020, B: 0x1f5fd1, Y: 0xf6d02f, W: 0xffffff, K: 0x111111 }, map: [
    '....RRR.....', '...RRWKR....', '..YRRRRRR...', '...RRRRRRR..', '...RRRRRRB..', '....RRYYBB..', '.....RBBBB..', '......BBBBB.', '.......B..B.'] },
  { pal: { O: 0xe3a23b, K: 0x2a1a0a, E: 0x111111, W: 0xf3e2c0 }, map: [
    '..........O.', 'O......OOOOO', '.O.OOOOOKOOE', '..OOKOOKOOOW', '..OOOOOOOOW.', '..OKOOOKOO..', '..O.O..O.O..', '..K.K..K.K..'] },
  { pal: { N: 0x7a4a24, F: 0xd9a77a, K: 0x111111 }, map: [
    '....NNNN....', '...NFFFFN...', '...NFKFKN...', '...NFFFFN...', '..NNNNNNNN..', '.N.NNNNNN.N.', 'N..NN..NN..N', '...NN..NN...'] },
  { pal: { G: 0x8a9aa6, g: 0x6b7a85, K: 0x111111, W: 0xc9d3da }, map: [
    '............', '...GGGGGG...', '..GGGGGGGGG.', '.GGGGGGGGKG.', 'GGWWWWWGGGGG', '.GGgggggGGG.', 'G..GGGGGG...', 'GG..........'] }
];
function generateCages(scene) {
  makeSheet(scene, 'wildlife_cages', 8, (g, i, ox) => {
    const a = ANIMALS[Math.floor(i / 2)];
    const caged = i % 2 === 0;
    drawMap(g, a.map, a.pal, ox + 8, caged ? 22 : 18, 4);
    if (caged) {
      g.fillStyle(0x5a3a1a, 1);
      g.fillRect(ox + 2, 10, 60, 6); g.fillRect(ox + 2, 56, 60, 6);
      for (let x = 2; x <= 58; x += 9) g.fillRect(ox + x, 10, 4, 52);
      g.fillStyle(0x8a5a2a, 1);
      g.fillRect(ox + 2, 10, 60, 2); g.fillRect(ox + 2, 56, 60, 2);
      g.fillStyle(0x9a9a9a, 1); g.fillRect(ox + 30, 2, 4, 8); // gancho
    }
  });
}

// ---------- power-ups (H, R, F, medkit, açaí, abacaxi) ----------
function crate(g, ox, base, edge, glow, letter, letterColor) {
  g.fillStyle(glow, 0.35); g.fillRect(ox, 0, 32, 32);
  g.fillStyle(edge, 1); g.fillRect(ox + 2, 3, 28, 27);
  g.fillStyle(base, 1); g.fillRect(ox + 4, 5, 24, 23);
  g.fillStyle(0x000000, 0.25); g.fillRect(ox + 4, 24, 24, 4);
  drawLetter(g, letter, ox + 9, 7, 3, letterColor);
}
function generatePowerups(scene) {
  makeSheet(scene, 'powerups_hrf', 6, (g, i, ox) => {
    if (i === 0) crate(g, ox, 0x2e5d2e, 0x1b3a1b, 0x6cff6c, 'H', 0x9cff57);
    if (i === 1) crate(g, ox, 0x6b2424, 0x3a1010, 0xff5050, 'R', 0xff8a8a);
    if (i === 2) crate(g, ox, 0x6a4214, 0x3a2408, 0xffa040, 'F', 0xffc060);
    if (i === 3) { // medkit
      g.fillStyle(0x3a3a3a, 1); g.fillRect(ox + 11, 4, 10, 4);
      g.fillStyle(0x9aa58a, 1); g.fillRect(ox + 3, 8, 26, 20);
      g.fillStyle(0xffffff, 1); g.fillRect(ox + 10, 11, 12, 14);
      g.fillStyle(0xd02020, 1); g.fillRect(ox + 14, 12, 4, 12); g.fillRect(ox + 11, 16, 10, 4);
    }
    if (i === 4) { // açaí
      g.fillStyle(0xf0f0f0, 1); g.fillRect(ox + 4, 16, 24, 10); g.fillRect(ox + 8, 26, 16, 3);
      g.fillStyle(0x4b1650, 1); g.fillRect(ox + 5, 12, 22, 6);
      g.fillStyle(0x7c2a86, 1); g.fillRect(ox + 8, 10, 6, 4); g.fillRect(ox + 16, 10, 6, 4);
      g.fillStyle(0x2c3fa0, 1); g.fillRect(ox + 22, 24, 6, 6);
    }
    if (i === 5) { // abacaxi
      g.fillStyle(0x2f8a2f, 1); g.fillRect(ox + 14, 1, 4, 9); g.fillRect(ox + 10, 3, 4, 6); g.fillRect(ox + 18, 3, 4, 6);
      g.fillStyle(0xd9a521, 1); g.fillRect(ox + 9, 10, 14, 20);
      g.fillStyle(0x9a6a12, 1);
      for (let y = 12; y < 28; y += 5) for (let x = 11; x < 21; x += 5) g.fillRect(ox + x, y, 2, 2);
    }
  });
}

// ---------- efeitos ----------
function generateFx(scene) {
  const radii = [6, 12, 18, 24, 28, 28, 26, 22, 18, 14];
  makeSheet(scene, 'fx_explosion', 10, (g, i, ox) => {
    const r = radii[i];
    const smoke = i >= 6;
    blockyBurst(g, ox + 30, 30, r, (t) => {
      if (smoke) return t < 0.5 ? 0x6e6e6e : (i > 7 && t > 0.8 ? null : 0x4a4a4a);
      if (t < 0.3) return 0xfff6c8;
      if (t < 0.55) return 0xffd23f;
      if (t < 0.8) return 0xff8a1f;
      return 0xc23a12;
    });
    if (i >= 4 && i <= 7) { // labaredas/fumaça subindo
      blockyBurst(g, ox + 30, 30 - r * 0.6, Math.round(r * 0.5), (t) => (t < 0.6 ? (smoke ? 0x5a5a5a : 0xffb03a) : 0x3a3a3a));
    }
  });
  makeSheet(scene, 'fx_smoke', 1, (g) => {
    g.fillStyle(0xffffff, 0.9); g.fillRect(3, 0, 6, 12); g.fillRect(0, 3, 12, 6); g.fillRect(1, 1, 10, 10);
    g.fillStyle(0xd0d0d0, 1); g.fillRect(3, 7, 6, 3);
  });
  makeSheet(scene, 'fx_spark', 1, (g) => { g.fillStyle(0xffe14d, 1); g.fillRect(0, 0, 4, 4); g.fillStyle(0xffffff, 1); g.fillRect(1, 1, 2, 2); });
  makeSheet(scene, 'fx_shell', 1, (g) => { g.fillStyle(0xd9a521, 1); g.fillRect(0, 0, 5, 3); g.fillStyle(0xffe08a, 1); g.fillRect(0, 0, 5, 1); });
  makeSheet(scene, 'fx_debris', 1, (g) => { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 6, 5); g.fillStyle(0xbbbbbb, 1); g.fillRect(0, 3, 6, 2); });
  makeSheet(scene, 'fx_muzzle', 1, (g, i, ox) => {
    drawMap(g, ['..Y.', 'YWYO', '.YY.', 'O..Y'], { Y: 0xffe14d, W: 0xffffff, O: 0xff8a1f }, ox, 0, 4);
  });
}

// ---------- projéteis e perigos ----------
function generateProjectiles(scene) {
  makeSheet(scene, 'proj_bullet', 1, (g) => { g.fillStyle(0xffe14d, 1); g.fillRect(0, 0, 10, 4); g.fillStyle(0xffffff, 1); g.fillRect(6, 1, 4, 2); });
  makeSheet(scene, 'proj_hmg', 1, (g) => { g.fillStyle(0xff9a2a, 1); g.fillRect(0, 0, 14, 4); g.fillStyle(0xfff0a0, 1); g.fillRect(8, 1, 6, 2); });
  makeSheet(scene, 'proj_rocket', 1, (g) => {
    g.fillStyle(0xff6a00, 1); g.fillRect(0, 2, 4, 4);
    g.fillStyle(0x6b7a3a, 1); g.fillRect(4, 1, 12, 6);
    g.fillStyle(0xc0c0c0, 1); g.fillRect(16, 2, 4, 4);
    g.fillStyle(0x3a4520, 1); g.fillRect(4, 0, 3, 8);
  });
  makeSheet(scene, 'proj_flame', 1, (g) => {
    blockyBurst(g, 10, 10, 10, (t) => (t < 0.35 ? 0xfff2a0 : t < 0.7 ? 0xffa52a : 0xe0451a), 3);
  });
  makeSheet(scene, 'proj_bomb', 1, (g) => {
    g.fillStyle(0x222222, 1); g.fillRect(2, 4, 10, 10); g.fillRect(4, 2, 6, 12); g.fillRect(0, 6, 14, 6);
    g.fillStyle(0x555555, 1); g.fillRect(4, 5, 3, 3);
    g.fillStyle(0xffd23f, 1); g.fillRect(10, 0, 3, 3);
  });
  makeSheet(scene, 'proj_mud', 1, (g) => {
    g.fillStyle(0x6b4a22, 1); g.fillRect(2, 2, 10, 10); g.fillRect(0, 4, 14, 6);
    g.fillStyle(0xa07a42, 1); g.fillRect(4, 3, 4, 3);
    g.fillStyle(0x9fb0b8, 1); g.fillRect(9, 8, 3, 3); // gota de mercúrio
  });
  makeSheet(scene, 'hazard_hg_bucket', 1, (g) => {
    g.fillStyle(0x8a9399, 1); g.fillRect(3, 4, 18, 18);
    g.fillStyle(0x5f676c, 1); g.fillRect(3, 4, 18, 3); g.fillRect(3, 19, 18, 3);
    g.fillStyle(0x4cff4c, 1); g.fillRect(4, 1, 6, 3); g.fillRect(6, 22, 3, 2);
    drawLetter(g, 'H', 5, 9, 1.6, 0x1a3a1a); drawLetter(g, 'g', 14, 12, 1.6, 0x1a3a1a);
  });
}

// ---------- veículos, helicóptero e chefe ----------
function generateVehicles(scene) {
  makeSheet(scene, 'slug_boat', 2, (g, i, ox) => {
    g.fillStyle(0x3f5f2f, 1); g.fillRect(ox + 8, 40, 112, 22); g.fillRect(ox + 16, 62, 96, 6);
    g.fillStyle(0x2c4422, 1); g.fillRect(ox + 20, 46, 18, 8); g.fillRect(ox + 60, 50, 22, 6);
    g.fillStyle(0x56704a, 1); g.fillRect(ox + 40, 22, 40, 18);
    g.fillStyle(0x9ad0e0, 1); g.fillRect(ox + 46, 26, 12, 6); g.fillRect(ox + 62, 26, 12, 6);
    g.fillStyle(0x333a40, 1); g.fillRect(ox + 82, 26, 30, 5); g.fillRect(ox + 2, 36, 12, 18);
    g.fillStyle(0x8a6a3a, 1); g.fillRect(ox + 4, 68 + (i ? 2 : 0), 120, 4);
    if (i) { g.fillStyle(0xffd23f, 1); g.fillRect(ox + 112, 25, 8, 7); }
  });
  makeSheet(scene, 'slug_quad', 2, (g, i, ox) => {
    g.fillStyle(0x4a5a2a, 1); g.fillRect(ox + 24, 34, 80, 16); g.fillRect(ox + 34, 26, 56, 10);
    g.fillStyle(0x222222, 1);
    [[30, 52], [96, 52]].forEach(([x, y]) => { g.fillRect(ox + x - 14, y + (i ? 1 : 0), 28, 24); });
    g.fillStyle(0x666666, 1); [[30, 52], [96, 52]].forEach(([x, y]) => g.fillRect(ox + x - 5, y + 8, 10, 8));
    g.fillStyle(0x333a40, 1); g.fillRect(ox + 86, 22, 30, 4);
  });
  makeSheet(scene, 'ally_gef_heli', 1, (g) => {
    g.fillStyle(0x3c4248, 1); g.fillRect(40, 40, 90, 40); g.fillRect(30, 50, 14, 26); g.fillRect(130, 52, 54, 10); g.fillRect(176, 36, 8, 26);
    g.fillStyle(0x9ad0e0, 1); g.fillRect(32, 52, 12, 12);
    g.fillStyle(0x1e2226, 1); g.fillRect(60, 48, 26, 24);
    g.fillStyle(0x2a2e33, 1); g.fillRect(4, 26, 184, 4); g.fillRect(80, 30, 6, 10);
    g.fillStyle(0x44ff66, 1); g.fillRect(56, 42, 10, 3);
    g.fillStyle(0x2a2e33, 1); g.fillRect(44, 84, 80, 4); g.fillRect(54, 80, 4, 6); g.fillRect(110, 80, 4, 6);
    drawLetter(g, 'G', 92, 52, 2, 0xe8e8e8); drawLetter(g, 'E', 106, 52, 2, 0xe8e8e8); drawLetter(g, 'F', 120, 52, 2, 0xe8e8e8);
    g.fillStyle(0x8a6a3a, 1); g.fillRect(70, 88, 2, 30); g.fillRect(100, 88, 2, 30);
    g.fillStyle(0x15181b, 1); g.fillRect(64, 104, 12, 16); g.fillRect(94, 100, 12, 16);
  });
}

function drawDraga(g, ox, damaged) {
  const rust = damaged ? 0x6a2f1e : 0x6b4a2b;
  // esteiras/flutuadores
  g.fillStyle(0x2a2420, 1); g.fillRect(ox + 20, 192, 280, 22);
  g.fillStyle(0x4a403a, 1); for (let x = 30; x < 296; x += 22) g.fillRect(ox + x, 197, 12, 12);
  // casco
  g.fillStyle(rust, 1); g.fillRect(ox + 10, 140, 300, 54);
  g.fillStyle(0x4a3220, 1); for (let x = 16; x < 306; x += 26) g.fillRect(ox + x, 146, 4, 44);
  g.fillStyle(0x8a6a4a, 1); g.fillRect(ox + 10, 140, 300, 5);
  // cabine
  g.fillStyle(damaged ? 0x6a5a5a : 0x7a7a72, 1); g.fillRect(ox + 120, 72, 112, 68);
  g.fillStyle(0x55554e, 1); g.fillRect(ox + 112, 66, 128, 8);
  g.fillStyle(damaged ? 0x000000 : 0x2a3a40, 1); for (let x = 130; x < 225; x += 24) g.fillRect(ox + x, 86, 14, 12);
  g.fillStyle(0x3a2a20, 1); g.fillRect(ox + 200, 106, 18, 34);
  // chaminés
  g.fillStyle(0x2c2c2c, 1); g.fillRect(ox + 150, 16, 18, 52); g.fillRect(ox + 176, 28, 18, 40);
  g.fillStyle(0x8a3a1a, 1); g.fillRect(ox + 150, 16, 18, 5); g.fillRect(ox + 176, 28, 18, 5);
  // guindastes
  g.lineStyle(5, 0x7a4a24, 1);
  g.lineBetween(ox + 70, 140, ox + 100, 30); g.lineBetween(ox + 262, 140, ox + damaged * 10 + 238, 30);
  g.lineStyle(1.5, 0x222222, 1);
  g.lineBetween(ox + 100, 30, ox + 120, 72); g.lineBetween(ox + 100, 30, ox + 96, 96);
  g.lineBetween(ox + 238 + damaged * 10, 30, ox + 232, 72); g.lineBetween(ox + 238 + damaged * 10, 30, ox + 286, 100);
  g.fillStyle(0x3a3a3a, 1); g.fillRect(ox + 90, 96, 12, 10); g.fillRect(ox + 278, 100, 20, 14);
  // mangueiras de rejeito (lado esquerdo = boca de ataque)
  g.fillStyle(0x4a4e52, 1);
  for (let k = 0; k < 7; k++) { g.fillRect(ox + 100 - k * 13, 150 - k * 6, 16, 12); g.fillRect(ox + 100 - k * 13, 170 + k * 2, 16, 12); }
  g.fillStyle(0x6b6f73, 1); g.fillRect(ox + 4, 104, 14, 16); g.fillRect(ox + 4, 180, 14, 16);
  // marcas Hg
  g.fillStyle(0x4cff4c, 1); g.fillRect(ox + 250, 160, 18, 4);
  if (damaged) {
    g.fillStyle(0x111111, 1); g.fillRect(ox + 150, 150, 26, 18); g.fillRect(ox + 230, 100, 20, 16); g.fillRect(ox + 60, 160, 18, 14);
    blockyBurst(g, ox + 165, 150, 14, (t) => (t < 0.4 ? 0xffe14d : t < 0.75 ? 0xff8a1f : 0xc23a12));
    blockyBurst(g, ox + 240, 100, 10, (t) => (t < 0.5 ? 0xffd23f : 0xff6a1a));
  }
}
function generateBoss(scene) {
  makeSheet(scene, 'boss_mega_draga', 2, (g, i, ox) => drawDraga(g, ox, i));
}

// ---------- plataformas, chão, água e cenário ----------
function generateWorld(scene) {
  makeSheet(scene, 'plat_wood', 1, (g) => {
    g.fillStyle(0x7a5230, 1); g.fillRect(0, 0, 96, 16);
    g.fillStyle(0x9a6a3e, 1); g.fillRect(0, 0, 96, 3);
    g.fillStyle(0x4a2f18, 1); for (let x = 0; x < 96; x += 24) g.fillRect(x, 0, 2, 16); g.fillRect(0, 13, 96, 3);
    g.fillStyle(0xb0b0b0, 1); for (let x = 6; x < 96; x += 24) { g.fillRect(x, 5, 2, 2); g.fillRect(x + 12, 5, 2, 2); }
  });
  makeSheet(scene, 'plat_raft', 1, (g) => {
    g.fillStyle(0x6a4a2a, 1); g.fillRect(0, 0, 128, 12);
    g.fillStyle(0x8a6a3a, 1); for (let x = 0; x < 128; x += 16) g.fillRect(x + 1, 1, 14, 3);
    g.fillStyle(0x2f5f9a, 1); g.fillRect(8, 12, 22, 12); g.fillRect(98, 12, 22, 12);
    g.fillStyle(0x1f3f6a, 1); g.fillRect(8, 16, 22, 2); g.fillRect(98, 16, 22, 2);
    g.fillStyle(0x4a3220, 1); g.fillRect(36, 12, 56, 6);
  });
  makeSheet(scene, 'ground_mud', 1, (g) => {
    g.fillStyle(0x5a3e22, 1); g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x7a5a32, 1); g.fillRect(0, 0, 64, 8);
    g.fillStyle(0x3f6a2a, 1); for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 4, 3 + (x % 16 ? 0 : 3));
    g.fillStyle(0x47301a, 1); [[8, 20], [30, 34], [50, 18], [14, 46], [42, 54]].forEach(([x, y]) => g.fillRect(x, y, 6, 4));
    g.fillStyle(0x8a8a80, 1); [[24, 26], [54, 42], [6, 58]].forEach(([x, y]) => g.fillRect(x, y, 4, 3));
  });
  makeSheet(scene, 'water', 1, (g) => {
    g.fillStyle(0x8a6a34, 1); g.fillRect(0, 0, 64, 52);
    g.fillStyle(0xa8854a, 1); g.fillRect(0, 0, 64, 4);
    g.fillStyle(0x6e5228, 1); g.fillRect(6, 14, 18, 3); g.fillRect(36, 26, 22, 3); g.fillRect(14, 38, 16, 3);
    g.fillStyle(0xc0a060, 1); g.fillRect(40, 8, 10, 2); g.fillRect(4, 30, 8, 2);
  });
  makeSheet(scene, 'bg_sky', 1, (g) => {
    const bands = [0x6e7f88, 0x7f8a86, 0x92927e, 0xa89a72, 0xbba06a, 0xc8a464];
    bands.forEach((c, k) => { g.fillStyle(c, 1); g.fillRect(0, k * 60, 800, 60); });
    g.fillStyle(0xc8a464, 1); g.fillRect(0, 360, 800, 90);
    // plumas de fumaça das dragas
    [[140, 230], [460, 210], [690, 240]].forEach(([x, y]) => {
      for (let k = 0; k < 7; k++) { g.fillStyle(k % 2 ? 0x4a4a4a : 0x5c5c5c, 0.9); g.fillRect(x + k * 9, y - k * 26, 26 + k * 4, 24); }
    });
  });
  makeSheet(scene, 'bg_forest', 1, (g) => {
    g.fillStyle(0x1f3a1c, 1); g.fillRect(0, 60, 800, 120);
    for (let x = 0; x < 800; x += 16) {
      const h = 30 + ((x * 37) % 50);
      g.fillStyle((x / 16) % 2 ? 0x2a4a24 : 0x335a2a, 1); g.fillRect(x, 60 - h * 0.6, 16, h + 60);
    }
    g.fillStyle(0x16301a, 1); for (let x = 0; x < 800; x += 40) g.fillRect(x + 10, 120, 6, 60);
  });
  makeSheet(scene, 'bg_river', 1, (g) => {
    g.fillStyle(0xa07c44, 1); g.fillRect(0, 0, 800, 90);
    g.fillStyle(0xb8955a, 1); for (let x = 0; x < 800; x += 50) g.fillRect(x + ((x * 7) % 20), 10 + ((x * 3) % 60), 24, 3);
    // silhuetas de dragas distantes
    g.fillStyle(0x4a3a2a, 1);
    [[120, 18], [520, 26]].forEach(([x, y]) => { g.fillRect(x, y + 10, 70, 14); g.fillRect(x + 20, y - 4, 26, 14); g.fillRect(x + 30, y - 18, 6, 14); });
  });
}

export function generatePlaceholders(scene) {
  generatePlayer(scene);
  generateMiner(scene);
  generateLogger(scene);
  generateCages(scene);
  generatePowerups(scene);
  generateFx(scene);
  generateProjectiles(scene);
  generateVehicles(scene);
  generateBoss(scene);
  generateWorld(scene);
  // fallback: qualquer key de KEYS ainda sem textura vira um bloco colorido com os quadros certos
  Object.entries(KEYS).forEach(([key, k]) => {
    if (scene.textures.exists(key)) return;
    makeSheet(scene, key, k.frames, (g, i, ox, oy, w, h) => {
      g.fillStyle(0x6a5a3a, 1); g.fillRect(ox + 2, 2, w - 4, h - 4);
      g.lineStyle(2, 0x141812, 1); g.strokeRect(ox + 2, 2, w - 4, h - 4);
    });
  });
}
