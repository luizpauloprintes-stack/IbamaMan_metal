// Sprites reais (recortados das 8 folhas de arte por tools/build_sheets.py) em public/assets/sprites/.
// O BootScene carrega cada entrada do manifest e NÃO gera o placeholder da mesma key.
// Para voltar aos placeholders procedurais de uma key, remova-a do manifest.json.
import manifest from '../../public/assets/sprites/manifest.json';

export const SPRITE_MANIFEST = manifest;
// bg_sky "full" = cenário completo pintado (dispensa as camadas bg_forest/bg_river procedurais)
export const FULL_BACKGROUND = manifest.some((s) => s.key === 'bg_sky' && s.full);
/** Keys que têm arte real (vinda do manifest). Cenários reais são desenhados como painel único com parallax. */
export const REAL_KEYS = new Set(manifest.map((s) => s.key));

// Resolução de cada textura em relação às unidades lógicas (res 2 = desenhada em dobro).
const RES = Object.fromEntries(manifest.map((s) => [s.key, s.res || 1]));
/** Escala para exibir a textura no tamanho lógico (1 para placeholders, 0.5 para sheets 2x). */
export const ts = (key) => 1 / (RES[key] || 1);
/** Define o corpo Arcade em unidades lógicas, independente da escala/resolução da textura. */
export function setBodyLogical(go, w, h, ox, oy) {
  const s = Math.abs(go.scaleX) || 1;
  go.body.setSize(w / s, h / s, false).setOffset(ox / s, oy / s);
}

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
  fx_smoke: { frames: 1, w: 12, h: 12 },  // baforada (rastro do míssil, poeira) — usar com setTint
  fx_spark: { frames: 1, w: 4, h: 4 },
  fx_shell: { frames: 1, w: 5, h: 3 },    // cápsula ejetada
  fx_debris: { frames: 1, w: 6, h: 5 },   // estilhaço (madeira/metal) — usar com setTint
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
  // extras (arte real em public/assets/sprites; placeholders genéricos se faltarem)
  boss_baron: { frames: 2, w: 96, h: 84 },       // Barão do Garimpo: normal, enfurecido (Missões 1 e 4)
  ally_gef_agent: { frames: 2, w: 96, h: 64 },   // agente GEF: atirando, atingido
  prop_hg_barrels: { frames: 2, w: 32, h: 40 },  // tambores de Hg verde/azul (explodem)
  prop_logs: { frames: 1, w: 64, h: 40 },
  prop_sandbags: { frames: 1, w: 56, h: 40 },
  bg_m1: { frames: 1, w: 800, h: 450 },
  bg_m2: { frames: 1, w: 800, h: 450 },
  bg_m4: { frames: 1, w: 800, h: 450 },
  bg_restored: { frames: 1, w: 512, h: 135 },
  title_cover: { frames: 1, w: 800, h: 450 },     // capa da tela de título (tools/build_icons.py)
  bg_forest: { frames: 1, w: 800, h: 180 },
  bg_river: { frames: 1, w: 800, h: 90 }
};
