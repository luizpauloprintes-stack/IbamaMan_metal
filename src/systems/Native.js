// Recursos do celular via plugins do Capacitor (vibração, compartilhar, botão Voltar e retorno ao app).
// No navegador (PC) cada função cai num equivalente web ou não faz nada.
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { App } from '@capacitor/app';
import { openExternal } from '../config/links.js';

const native = () => typeof window !== 'undefined' && !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

let lastBuzz = 0;
// força: 'light' (resgate), 'medium' (explosão), 'heavy' (dano)
export function buzz(strength = 'light') {
  const now = performance.now();
  if (now - lastBuzz < 90) return;          // não vibra sem parar em explosões em cadeia
  lastBuzz = now;
  const style = strength === 'heavy' ? ImpactStyle.Heavy : strength === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
  if (native()) { Haptics.impact({ style }).catch(() => {}); return; }
  if (navigator.vibrate) navigator.vibrate(strength === 'heavy' ? 60 : strength === 'medium' ? 30 : 12);
}

// Compartilha o texto (+ imagem do resultado, se houver). Sem plugin: abre o WhatsApp com o texto.
export async function shareResult(text, url, dataUrl) {
  if (native()) {
    try {
      let files;
      if (dataUrl) {
        const base64 = dataUrl.split(',')[1];
        const f = await Filesystem.writeFile({ path: 'ibamaman-resultado.png', data: base64, directory: Directory.Cache });
        files = [f.uri];
      }
      await Share.share({ title: 'IbamaMan: Guardião da Amazônia', text, url, files, dialogTitle: 'Compartilhar' });
      return true;
    } catch (e) {
      if (e && /cancel/i.test(String(e.message || e))) return false;
      try { await Share.share({ text: `${text}\n${url}` }); return true; } catch (e2) { /* cai no WhatsApp */ }
    }
  }
  if (navigator.share) {
    try { await navigator.share({ text, url }); return true; } catch (e) { /* cancelado */ }
  }
  openExternal(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`);
  return true;
}

export function exitApp() { if (native()) App.exitApp().catch(() => {}); }

// Botão Voltar do Android: chama onBack em vez de fechar o app.
export function onBackButton(onBack) {
  if (!native()) return;
  App.addListener('backButton', () => onBack()).catch(() => {});
}

// O app voltou para a frente (ex.: depois de abrir a consulta pública no navegador).
export function onResume(fn) {
  if (native()) { App.addListener('resume', fn).catch(() => {}); return; }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fn(); });
}
