// Unidades LÓGICAS do jogo: toda a física/posições usam 800x450.
// O canvas é desenhado em (800x450) * RENDER_ZOOM com câmeras em zoom RENDER_ZOOM, para os sprites
// (gerados em 2x por tools/build_sheets.py) aparecerem com o dobro de detalhe no celular.
export const RENDER_ZOOM = 2;
export const GAME_W = 800;
export const GAME_H = 450;
export const GRAVITY_Y = 900;
export const GROUND_Y = 410;          // topo do chão (pés dos personagens)
export const LEVEL_W = 4200;          // largura da fase demonstrativa
export const BOSS_LOCK_X = 3400;      // scroll da câmera travado na arena do chefe
export const BOSS_TRIGGER_X = 3450;   // jogador passa daqui -> trava câmera e ativa a Mega Draga
export const PLAYER_LIVES = 3;
export const PLAYER_BOMBS = 10;
export const DEPTH = { bg: 0, world: 10, enemies: 20, player: 30, shots: 40, water: 45, fx: 50 };
export const CAMERA_LEAD_X = 340;     // posição do jogador na tela (px a partir da esquerda) enquanto avança
export const SCREEN_LEFT_MARGIN = 90; // jogador não encosta na borda esquerda (fica fora do direcional)
// Com zoom centralizado, scrollX da câmera = borda esquerda visível - VIEW_OFF_X (idem Y).
// Objetos com setScrollFactor(0) devem somar VIEW_OFF_X/VIEW_OFF_Y à posição de tela desejada.
export const VIEW_OFF_X = (GAME_W * (RENDER_ZOOM - 1)) / 2;
export const VIEW_OFF_Y = (GAME_H * (RENDER_ZOOM - 1)) / 2;
// O cenário inteiro sobe VIEW_LIFT px na tela: o chão fica mais alto e sobra uma faixa de terra
// embaixo para o direcional e os botões, sem cobrir os personagens.
export const VIEW_LIFT = 72;
