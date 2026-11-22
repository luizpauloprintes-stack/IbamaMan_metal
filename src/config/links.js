// Links externos e textos da campanha pela PEC 13/2022 (mostrados em vários pontos do jogo).
// PEC 13/2022 (Senado): define Ibama e ICMBio como instituições permanentes de Estado.
// Situação conferida em nov/2026 no site do Senado: em tramitação, na CCJ, "aguardando designação do relator" desde 2022.
export const PEC = {
  title: 'APOIE A PEC 13/2022',
  // gancho curto e verdadeiro usado no cartão de vitória, no mapa e na pausa
  status: 'A PEC que protege o Ibama está parada no Senado desde 2022.',
  body: 'A PEC 13/2022 transforma o Ibama e o ICMBio em instituições permanentes de Estado.',
  // botões espalhados pelo jogo: abrem PRIMEIRO a tela explicativa (PecScene), que leva à votação
  button: 'APOIE A PEC 13 ›',
  howTo: 'Veja o que é e como votar em 1 minuto',
  // tela "O QUE É A PEC 13/2022?" (pontos conforme o texto da proposta)
  info_title: 'O QUE É A PEC 13/2022?',
  points: [
    'Coloca o Ibama e o ICMBio na Constituição como instituições permanentes de Estado.',
    'Garante autonomia técnica, financeira e orçamentária.',
    'Dirigentes escolhidos por critério técnico, com mandato de 4 anos e aprovação do Senado.',
    'Servidores em carreiras típicas de Estado.',
    'Está parada na CCJ do Senado desde 2022, esperando relator.'
  ],
  // passos conferidos no e-Cidadania (nov/2026): pergunta "Você apoia essa proposição?"; login só pelo gov.br
  steps: [
    'Toque em IR PARA A VOTAÇÃO (abre o site oficial do Senado).',
    'Na pergunta "Você apoia essa proposição?", toque em SIM.',
    'Se o site pedir, entre com sua conta gov.br e informe sua cidade.'
  ],
  note: 'Quase 30 mil pessoas já votaram SIM (nov/2026). Cada pessoa vota uma vez.',
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
