// Funil da PEC 13/2022: abrir a consulta pública, saber quando o jogador volta ao jogo e compartilhar o resultado.
import { PEC, GAME_LINK, openExternal } from '../config/links.js';
import { Save } from './Save.js';
import { onResume, shareResult } from './Native.js';

let pending = false;
let hooked = false;

export function openPec() {
  pending = true;
  Save.set({ pecOpened: (Save.get().pecOpened || 0) + 1 });
  openExternal(PEC.url);
}

// Registra uma vez: quando o app volta do navegador depois de abrir a consulta, avisa as cenas ('pec-return').
export function hookPecReturn(game) {
  if (hooked) return;
  hooked = true;
  onResume(() => {
    if (!pending) return;
    pending = false;
    if (game.scene.isActive('PecScene')) game.scene.stop('PecScene'); // fecha a explicação para mostrar o agradecimento
    game.events.emit('pec-return');
  });
}

// Mensagem de compartilhar (WhatsApp etc.), com imagem da tela atual quando der.
export function shareGame(scene, result) {
  const stars = result ? result.stars.filter(Boolean).length : 0;
  const head = result
    ? `Missão ${result.mission} cumprida no IbamaMan: Guardião da Amazônia! ${'⭐'.repeat(stars)} ${result.rescued} animais libertados.`
    : 'Estou jogando IbamaMan: Guardião da Amazônia, o fiscal do Ibama contra o garimpo ilegal!';
  const text = `${head}\n\nA PEC 13/2022, que protege o Ibama, está parada no Senado desde 2022. Vote SIM na consulta pública oficial (1 minuto): ${PEC.url}\n\nBaixe o jogo:`;
  const go = (dataUrl) => shareResult(text, GAME_LINK, dataUrl);
  try {
    scene.game.renderer.snapshot((img) => go(img && img.src));
  } catch (e) { go(null); }
}
