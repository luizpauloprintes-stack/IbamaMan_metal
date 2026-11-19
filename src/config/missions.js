// Campanha de 4 missões. Apenas a missão marcada com playable=true tem fase implementada (demo).
export const MISSIONS = [
  { id: 1, title: 'DESMATAMENTO', theme: 'Floresta com tratores e pilhas de toras', enemies: ['enemy_logger', 'enemy_miner_hose'], boss: 'Barão do Garimpo (motosserra)', playable: false },
  { id: 2, title: 'GARIMPO AMADOR', theme: 'Córrego barrento, acampamentos e tambores de Hg', enemies: ['enemy_miner_hose'], boss: null, playable: false },
  { id: 3, title: 'GARIMPO COM DRAGAS', theme: 'Rio barrento com balsas e dragas', enemies: ['enemy_miner_hose'], boss: 'boss_mega_draga', playable: true },
  { id: 4, title: 'CHEFÃO DO GARIMPO', theme: 'Balsa-Fortaleza e Barão do Garimpo', enemies: ['enemy_miner_hose', 'enemy_logger'], boss: 'Barão do Garimpo + Balsa-Fortaleza', playable: false }
];

export const DEMO_MISSION = MISSIONS.find((m) => m.playable);
