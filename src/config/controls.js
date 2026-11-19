// Layout e sensibilidade dos controles touch (coordenadas no espaço do jogo 800x450).
export const STICK = {
  zoneMaxX: 0.5,      // metade esquerda da tela ativa o direcional flutuante
  radius: 50,         // raio da base do direcional que aparece sob o polegar
  knob: 22,
  deadX: 14,          // folga horizontal antes de andar
  crouchY: 24,        // arrastar para baixo além disso = agachar
  hint: { x: 70, y: 392, r: 34 } // anel discreto mostrando onde tocar (some durante o uso)
};

export const BUTTONS = [
  { id: 'fire', label: 'FIRE', x: 752, y: 404, r: 38, color: 0xc0392b },
  { id: 'jump', label: 'JUMP', x: 668, y: 420, r: 30, color: 0x2f74c0 },
  { id: 'bomb', label: 'BOMB', x: 758, y: 326, r: 26, color: 0xe67e22 }
];

export const CONTROL_ALPHA = {
  idle: 0.22,         // botões soltos: bem transparentes
  pressed: 0.6,
  behindPlayer: 0.08, // quando o IbamaMan passa por trás de um botão, ele quase some
  hitScale: 1.6       // área de toque maior que o desenho do botão
};
