// Controles touch (coordenadas no espaço do jogo 800x450).
// Padrão dos jogos de ação para celular: tiro automático + gestos em áreas grandes, sem botões pequenos.
export const STICK = {
  zoneMaxX: 0.5,      // metade esquerda da tela: direcional flutuante (nasce onde o polegar toca)
  radius: 50,
  knob: 22,
  deadX: 14,          // folga horizontal antes de andar
  crouchY: 26,        // arrastar para baixo = agachar
  jumpY: -34,         // empurrar para cima = pular
  hint: { x: 70, y: 392, r: 34 }
};

// Metade direita: área de gestos
export const GESTURE = {
  tapMs: 230,         // toque rápido = pular
  holdMs: 230,        // segurar parado = atirar (enquanto segurar)
  swipeUp: 38,        // arrastar para cima (px lógicos) = bomba
  moveTol: 16         // quanto o dedo pode mexer e ainda contar como toque/segurar
};

// Tiro automático: atira sozinho quando há alvo à frente
export const AUTO_FIRE = {
  rangeX: 430,        // alcance horizontal (px lógicos)
  rangeY: 95,         // diferença de altura tolerada entre a arma e o alvo
  storageKey: 'ibamaman.autoFire'
};

// Botão AUTO (liga/desliga o tiro automático), abaixo da HUD da direita
export const AUTO_BTN = { x: 742, y: 62, w: 92, h: 22 };
