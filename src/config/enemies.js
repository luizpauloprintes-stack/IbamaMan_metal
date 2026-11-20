// Balanceamento dos inimigos e chefes.
export const MINER = { hp: 30, score: 100 };

export const LOGGER = {
  hp: 50, score: 150,
  speedMin: 70, speedMax: 95,
  reach: 46,          // distância (lógica) para começar o golpe
  hitReach: 54,       // alcance real da lâmina no momento do golpe
  windup: 260,        // ms com a lâmina erguida antes de acertar
  cooldown: 1300      // ms entre golpes
};

export const BARON = {
  hp: 700, score: 10000, scale: 1.35,
  enragedAt: 0.5,                 // fração do HP que ativa a fase enfurecida
  idle: [950, 520],               // pausa entre ataques (normal, enfurecido)
  dashSpeed: [380, 500],          // investida com a motosserra
  telegraph: [480, 320],          // aviso (pisca vermelho) antes da investida
  bucketSpeed: [170, 240],        // baldes de Hg rolando
  summon: [2, 3],                 // madeireiros chamados por vez
  maxMinions: 4
};

// Missão 2: acampamento defendido por ondas (o "HP" é o número de garimpeiros restantes)
export const CAMP = { width: 320, height: 90, firstDelay: 1600, spawnEvery: 650, maxAlive: 6 };

// Missão 4: Balsa-Fortaleza (Mega Draga blindada) e a revanche do Barão
export const FORTRESS = { hp: 1300, tint: 0xa9b2c4, riderScale: 1.0 };
export const BARON_FINAL = { hp: 520 };

// Movimento orgânico (src/gfx/Organic.js) e ritmo das animações de passada
export const ORGANIC = {
  breathRate: [0.0032, 0.0048],  // rad/ms (≈ 0.5–0.75 respirações por segundo)
  breathAmp: 0.025,
  leanMax: 0.03,                 // rad (~2°): a arte da corrida já vem inclinada
  leanSpeed: 140,                // velocidade em que a inclinação chega ao máximo
  leanEase: 140,                 // ms para acompanhar a inclinação
  landSquash: 0.14,
  walkFps: 10,                   // passada base (ajustada pela velocidade de cada inimigo)
  stagger: 160                   // ms de tranco ao levar dano
};
