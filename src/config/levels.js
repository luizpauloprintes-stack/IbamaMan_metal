// Layout de cada fase jogável. A GameScene monta a fase a partir daqui (sem números mágicos na cena).
// Unidades lógicas (800x450). Os inimigos/props usam GROUND_Y como chão.
import { GROUND_Y } from './constants.js';

export const LEVELS = {
  // --------------------------------------------------------------------------
  // Missão 1 — Desmatamento: floresta, madeireiros com motosserra, Barão do Garimpo
  // --------------------------------------------------------------------------
  1: {
    levelW: 4200,
    bg: 'bg_m1',
    intro: 'Pare a derrubada e liberte os animais!',
    terrain: [['mud', 0, 1500], ['water', 1500, 1700], ['mud', 1700, 4200]],
    platforms: [[520, 320], [940, 300], [1180, 250], [1600, 320], [2240, 310], [2480, 250], [2900, 320]],
    raft: null,
    supplies: [[530, 280, 2], [1190, 210, 0], [2490, 210, 1], [2910, 280, 2]], // F logo cedo: bom contra motosserra
    cages: [[760, GROUND_Y, 0], [1980, GROUND_Y, 2], [2700, GROUND_Y, 1]],
    barrels: [[1380, 1], [3120, 0]],
    decor: [['prop_logs', 350], ['prop_logs', 1080], ['prop_sandbags', 1460], ['prop_logs', 2050], ['prop_logs', 2620], ['prop_sandbags', 3250]],
    enemies: [
      ['logger', 680, GROUND_Y], ['logger', 1250, GROUND_Y], ['miner', 950, 280],
      ['logger', 1850, GROUND_Y], ['logger', 2300, GROUND_Y], ['miner', 2490, 230], ['logger', 3050, GROUND_Y]
    ],
    waves: [
      { at: 300, n: 2, side: 'right', type: 'logger' }, { at: 1000, n: 3, side: 'right', type: 'logger' },
      { at: 1600, n: 2, side: 'both', type: 'miner' }, { at: 2200, n: 3, side: 'right', type: 'logger' },
      { at: 2800, n: 4, side: 'both', type: 'logger' }
    ],
    heliAt: 2000,
    boss: {
      type: 'baron', name: 'BARÃO DO GARIMPO',
      alert: 'ALERTA! BARÃO DO GARIMPO', alertSub: 'O mandante da derrubada chegou!',
      defeatText: 'BARÃO AUTUADO! +10000'
    },
    victory: { key: 'bg_m1', caption: 'A FLORESTA FICA DE PÉ' }
  },

  // --------------------------------------------------------------------------
  // Missão 2 — Garimpo Amador: igapó destruído, garimpeiros, muitos tambores de Hg; acampamento com ondas
  // --------------------------------------------------------------------------
  2: {
    levelW: 4000,
    bg: 'bg_m2',
    intro: 'Desmonte o garimpo no igarapé!',
    terrain: [
      ['mud', 0, 600], ['water', 600, 1100], ['mud', 1100, 1500], ['water', 1500, 2300],
      ['mud', 2300, 2700], ['water', 2700, 3100], ['mud', 3100, 4000]
    ],
    platforms: [[460, 320], [820, 300], [1300, 320], [1650, 300], [2450, 310], [2880, 300]],
    raft: { x: 1950, y: 335, minX: 1800, maxX: 2200, speed: 55 },
    supplies: [[830, 260, 0], [1660, 260, 2], [2890, 260, 1]],
    cages: [[1000, GROUND_Y, 2], [1380, GROUND_Y, 0], [2640, GROUND_Y, 3]],
    // garimpo amador: tambores por toda parte (atire para explodir em cadeia)
    barrels: [[520, 0], [548, 1], [1220, 0], [1250, 1], [2380, 0], [2408, 1], [2436, 0], [3020, 1],
      [3560, 0], [3590, 1], [3860, 0], [3888, 1]],
    decor: [['prop_sandbags', 380], ['prop_logs', 1160], ['prop_sandbags', 2560], ['prop_logs', 3300],
      ['prop_sandbags', 3640], ['prop_logs', 3780]],
    enemies: [
      ['miner', 700, GROUND_Y], ['miner', 830, 280], ['miner', 1300, 300], ['miner', 1450, GROUND_Y],
      ['miner', 1900, GROUND_Y], ['miner', 2460, 290], ['miner', 2600, GROUND_Y], ['miner', 2890, 280]
    ],
    waves: [
      { at: 300, n: 3, side: 'right', type: 'miner' }, { at: 1100, n: 3, side: 'both', type: 'miner' },
      { at: 1800, n: 4, side: 'right', type: 'miner' }, { at: 2500, n: 3, side: 'both', type: 'miner' }
    ],
    heliAt: 1750,
    boss: {
      type: 'camp', name: 'GARIMPEIROS', waves: [4, 5, 6],
      alert: 'ACAMPAMENTO DO GARIMPO!', alertSub: 'Contenha os garimpeiros — depois o acampamento é embargado',
      defeatText: 'ACAMPAMENTO DESMONTADO! +10000'
    },
    victory: { key: 'bg_restored', caption: 'O IGARAPÉ VAI SE RECUPERAR' }
  },

  // --------------------------------------------------------------------------
  // Missão 3 — Garimpo com Dragas: rio barrento, garimpeiros, Mega Draga
  // --------------------------------------------------------------------------
  3: {
    levelW: 4200,
    bg: 'bg_sky',
    intro: 'Liberte os animais e embargue a Mega Draga!',
    // trechos visuais do chão: 'mud' (barranco) ou 'water' (rio raso, o jogador vadeia)
    terrain: [
      ['mud', 0, 700], ['water', 700, 1000], ['mud', 1000, 1700], ['water', 1700, 2100],
      ['mud', 2100, 2800], ['water', 2800, 3000], ['mud', 3000, 3700], ['water', 3700, 4200]
    ],
    platforms: [[460, 320], [860, 300], [1300, 320], [1520, 250], [2300, 310], [2560, 250], [3150, 320]],
    raft: { x: 1820, y: 335, minX: 1760, maxX: 2060, speed: 60 },
    // caixas de suprimentos: frame de powerups_hrf (0=H, 1=R, 2=F)
    supplies: [[470, 280, 0], [1530, 210, 1], [2570, 210, 2], [3160, 280, 0]],
    cages: [[1120, GROUND_Y, 0], [1600, GROUND_Y, 1], [2420, GROUND_Y, 2], [2920, GROUND_Y, 3]],
    // tambores de Hg explosivos [x, cor 0=verde 1=azul] e cobertura decorativa
    barrels: [[600, 0], [1240, 1], [1270, 0], [2200, 1], [2460, 0], [3260, 1]],
    decor: [['prop_sandbags', 560], ['prop_logs', 1180], ['prop_sandbags', 2280], ['prop_logs', 3080]],
    enemies: [
      ['miner', 650, GROUND_Y], ['miner', 1310, 300], ['miner', 1480, GROUND_Y],
      ['miner', 2350, GROUND_Y], ['miner', 2570, 230], ['miner', 3220, GROUND_Y]
    ],
    waves: [
      { at: 350, n: 2, side: 'right', type: 'miner' }, { at: 1050, n: 3, side: 'right', type: 'miner' },
      { at: 1650, n: 2, side: 'both', type: 'miner' }, { at: 2350, n: 3, side: 'right', type: 'miner' },
      { at: 2850, n: 4, side: 'both', type: 'miner' }
    ],
    heliAt: 2150,
    boss: {
      type: 'draga', name: 'MEGA DRAGA',
      alert: 'ALERTA! MEGA DRAGA', alertSub: 'Garimpo ilegal no rio — destrua a draga!',
      defeatText: 'DRAGA DESTRUÍDA! +10000'
    },
    victory: { key: 'bg_restored', caption: 'O RIO VOLTOU A RESPIRAR' }
  }
};

// --------------------------------------------------------------------------
// Missão 4 — Chefão do Garimpo: balsas no rio, todos os inimigos; Balsa-Fortaleza + revanche do Barão
// --------------------------------------------------------------------------
LEVELS[4] = {
  levelW: 4400,
  bg: 'bg_m4',
  intro: 'Invada a Balsa-Fortaleza e prenda o Barão!',
  terrain: [
    ['mud', 0, 520], ['water', 520, 900], ['mud', 900, 1400], ['water', 1400, 2000],
    ['mud', 2000, 2500], ['water', 2500, 2900], ['mud', 2900, 3500], ['water', 3500, 4400]
  ],
  platforms: [[420, 320], [700, 300], [1150, 310], [1600, 300], [1800, 250], [2250, 320], [2700, 300], [3100, 310]],
  raft: { x: 2650, y: 335, minX: 2550, maxX: 2850, speed: 65 },
  supplies: [[430, 280, 0], [1810, 210, 1], [2260, 280, 2], [3110, 270, 1]],
  cages: [[1000, GROUND_Y, 0], [1350, GROUND_Y, 2], [2150, GROUND_Y, 1], [2880, GROUND_Y, 3]],
  barrels: [[600, 1], [1250, 0], [1278, 1], [2420, 0], [2448, 1], [3300, 0], [3328, 1]],
  decor: [['prop_sandbags', 300], ['prop_logs', 1100], ['prop_sandbags', 2080], ['prop_logs', 3000], ['prop_sandbags', 3420]],
  enemies: [
    ['miner', 650, GROUND_Y], ['logger', 1050, GROUND_Y], ['miner', 1160, 290], ['miner', 1600, 280],
    ['logger', 2100, GROUND_Y], ['miner', 2260, 300], ['logger', 3000, GROUND_Y], ['miner', 3110, 290]
  ],
  waves: [
    { at: 300, n: 3, side: 'right', type: 'miner' }, { at: 900, n: 2, side: 'right', type: 'logger' },
    { at: 1500, n: 3, side: 'both', type: 'miner' }, { at: 2100, n: 3, side: 'right', type: 'logger' },
    { at: 2700, n: 4, side: 'both', type: 'miner' }
  ],
  heliAt: 2300,
  boss: {
    type: 'fortress', name: 'BALSA-FORTALEZA',
    alert: 'ALERTA! BALSA-FORTALEZA', alertSub: 'O Barão está no convés — derrube a fortaleza!',
    finalName: 'BARÃO DO GARIMPO', finalAlert: 'O BARÃO NÃO DESISTE!', finalSub: 'Revanche: prenda o Barão!',
    defeatText: 'BARÃO PRESO! +10000'
  },
  victory: { key: 'bg_restored', caption: 'A AMAZÔNIA AGRADECE' }
};

// Trava da câmera/arena do chefe a partir da largura da fase
export const bossLockX = (lvl) => lvl.levelW - 800;
export const bossTriggerX = (lvl) => lvl.levelW - 750;
export const BOSS_SCORE = 10000;
