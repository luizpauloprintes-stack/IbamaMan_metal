// Tabela de armas. ammo = -1 significa munição infinita.
export const WEAPONS = {
  PISTOL: { id: 'PISTOL', label: 'PISTOL', ammo: -1, damage: 10, cooldown: 250, speed: 700, spread: 0, texture: 'proj_bullet', kind: 'bullet' },
  H: { id: 'H', label: 'H • HEAVY MG', ammo: 150, damage: 12, cooldown: 90, speed: 760, spread: 5, texture: 'proj_hmg', kind: 'bullet' },
  R: { id: 'R', label: 'R • ROCKET', ammo: 30, damage: 60, cooldown: 500, speed: 460, spread: 0, texture: 'proj_rocket', kind: 'rocket', radius: 70 },
  F: { id: 'F', label: 'F • FLAME', ammo: 80, damage: 35, cooldown: 150, speed: 380, spread: 0, texture: 'proj_flame', kind: 'flame', lifespan: 320 }
};

// Tambor de mercúrio atingido: explode e pode detonar outros tambores próximos
export const HG_BARREL = { hp: 20, damage: 50, radius: 64, score: 100 };

// Carga de Demolição (botão BOMB)
export const BOMB = { damage: 80, radius: 80, vx: 280, vy: -380, texture: 'proj_bomb' };
