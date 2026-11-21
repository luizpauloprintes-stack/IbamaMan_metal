// Controles touch (coordenadas no espaço do jogo 800x450).
// Padrão dos jogos de ação para celular: tiro automático + gestos em áreas grandes, sem botões pequenos.
export const STICK = {
  zoneMaxX: 0.5,      // metade esquerda da tela: direcional flutuante (nasce onde o polegar toca)
  radius: 50,
  knob: 22,
  deadX: 14,          // folga horizontal antes de andar
  crouchY: 26,        // arrastar para baixo = agachar
  jumpY: -46,         // empurrar bem para cima = pular (atalho)
  hint: { x: 70, y: 392, r: 34 }
};

// Botões de ação separados, em arco no canto direito (padrão dos jogos de ação mobile).
// O toque vai para o botão MAIS PRÓXIMO dentro da zona de botões (sem ponto morto entre eles).
export const BUTTONS = [
  { id: 'jump', label: 'PULAR', x: 728, y: 386, r: 42, color: 0x2f74c0 },  // principal: mais perto do polegar
  { id: 'fire', label: 'TIRO', x: 626, y: 408, r: 34, color: 0xc0392b },
  { id: 'bomb', label: 'BOMBA', x: 742, y: 282, r: 30, color: 0xe67e22 }
];
export const BUTTON_ZONE = { minX: 560, minY: 230, maxDist: 95 }; // fora disso o toque não aciona botão
export const BUTTON_ALPHA = { idle: 0.38, pressed: 0.8, behindPlayer: 0.14 };

// Tiro automático: atira sozinho quando há alvo à frente
export const AUTO_FIRE = {
  rangeX: 430,        // alcance horizontal (px lógicos)
  rangeY: 95,         // diferença de altura tolerada entre a arma e o alvo
  storageKey: 'ibamaman.autoFire'
};

// Botão AUTO (liga/desliga o tiro automático), abaixo da HUD da direita
export const AUTO_BTN = { x: 742, y: 62, w: 92, h: 22 };
