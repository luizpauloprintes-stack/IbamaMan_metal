// Sprites reais (PNG com fundo transparente) em public/assets/sprites/.
// Ao adicionar uma entrada aqui, o BootScene carrega o PNG e NÃO gera o placeholder da mesma key.
// Mantenha os mesmos frames/tamanhos dos placeholders (ver CLAUDE.md) para não quebrar animações/corpos.
//
// Exemplo:
// { key: 'player_run', file: 'player_run.png', frameWidth: 64, frameHeight: 64 },
export const SPRITE_MANIFEST = [];

// Todas as keys usadas pelo jogo (placeholders gerados em src/gfx/placeholders.js)
export const KEYS = {
  player_run: { frames: 5, w: 64, h: 64 },
  player_shoot: { frames: 5, w: 64, h: 64 },
  player_bomb_win: { frames: 10, w: 64, h: 64 },  // 0-4 arremesso, 5-9 vitória
  player_pose: { frames: 4, w: 64, h: 64 },       // 0 parado, 1 agachado, 2 pulo, 3 dano
  enemy_miner_hose: { frames: 4, w: 64, h: 64 },  // 0 parado, 1-2 jato, 3 fuga
  enemy_logger: { frames: 4, w: 64, h: 64 },
  ally_gef_heli: { frames: 1, w: 192, h: 128 },
  slug_boat: { frames: 2, w: 128, h: 80 },
  slug_quad: { frames: 2, w: 128, h: 80 },
  boss_mega_draga: { frames: 2, w: 320, h: 220 }, // 0 HP>50%, 1 HP<=50%
  wildlife_cages: { frames: 8, w: 64, h: 64 },    // pares preso/solto: arara, onça, macaco, peixe-boi
  powerups_hrf: { frames: 6, w: 32, h: 32 },      // H, R, F, medkit, açaí, abacaxi
  fx_explosion: { frames: 10, w: 64, h: 64 },
  fx_muzzle: { frames: 1, w: 16, h: 16 },
  proj_bullet: { frames: 1, w: 10, h: 4 },
  proj_hmg: { frames: 1, w: 14, h: 4 },
  proj_rocket: { frames: 1, w: 20, h: 8 },
  proj_flame: { frames: 1, w: 24, h: 24 },
  proj_bomb: { frames: 1, w: 14, h: 14 },
  proj_mud: { frames: 1, w: 14, h: 14 },
  hazard_hg_bucket: { frames: 1, w: 24, h: 24 },
  plat_wood: { frames: 1, w: 96, h: 16 },
  plat_raft: { frames: 1, w: 128, h: 24 },
  ground_mud: { frames: 1, w: 64, h: 64 },
  water: { frames: 1, w: 64, h: 52 },
  bg_sky: { frames: 1, w: 800, h: 450 },
  bg_forest: { frames: 1, w: 800, h: 180 },
  bg_river: { frames: 1, w: 800, h: 90 }
};
