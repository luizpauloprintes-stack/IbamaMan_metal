// Links externos e textos da campanha pela PEC 13/2022 (mostrados em vários pontos do jogo).
// PEC 13/2022 (Senado): define Ibama e ICMBio como instituições permanentes de Estado.
// Situação conferida em nov/2026 no site do Senado: em tramitação, na CCJ, "aguardando designação do relator" desde 2022.
export const PEC = {
  title: 'APOIE A PEC 13/2022',
  // gancho curto e verdadeiro usado no cartão de vitória, no mapa e na pausa
  status: 'A PEC que protege o Ibama está parada no Senado desde 2022.',
  call: 'Vote SIM na consulta pública oficial. Leva 1 minuto.',
  howTo: 'No site do Senado, toque em SIM em "Você apoia essa proposição?"',
  body: 'A PEC 13/2022 transforma o Ibama e o ICMBio em instituições permanentes de Estado.',
  button: 'VOTAR SIM NA PEC 13 ›',
  shortButton: 'APOIE A PEC 13 ›',
  url: 'https://www12.senado.leg.br/ecidadania/visualizacaomateria?id=153397',
  info: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/153397'
};

// onde baixar o jogo (vai junto na mensagem de compartilhar)
export const GAME_LINK = 'https://github.com/luizpauloprintes-stack/IbamaMan_metal/releases/latest';

// aviso mostrado na capa, no mapa e na pausa
export const DISCLAIMER = 'Iniciativa pessoal e independente. Não é material oficial do Ibama.';

// Abre um link fora do jogo: no APK (Capacitor) a navegação para outro site vai para o navegador do celular.
export function openExternal(url) {
  const native = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  if (native) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}
