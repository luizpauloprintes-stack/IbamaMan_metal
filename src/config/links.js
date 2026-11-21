// Links externos mostrados no jogo.
// PEC 13/2022 (Senado): define Ibama e ICMBio como instituições permanentes de Estado.
export const PEC = {
  title: 'POR QUE APOIAR A PEC 13/2022?',
  // texto padrão; cada missão tem o seu em levels.js -> victory.pec
  body: 'A PEC 13/2022 transforma o Ibama e o ICMBio em instituições permanentes de Estado. Ela tramita no Senado.',
  button: 'APOIAR A PEC 13/2022 ›',
  hint: 'abre a consulta pública oficial do Senado (e-Cidadania)',
  url: 'https://www12.senado.leg.br/ecidadania/visualizacaomateria?id=153397',
  info: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/153397'
};

// Abre um link fora do jogo: no APK (Capacitor) a navegação para outro site vai para o navegador do celular.
export function openExternal(url) {
  const native = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  if (native) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}
