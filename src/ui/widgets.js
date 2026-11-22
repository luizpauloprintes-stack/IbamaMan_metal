// Peças de interface compartilhadas pelas cenas (botões, estilo de texto).
import { RENDER_ZOOM } from '../config/constants.js';
import { Sfx } from '../audio/Sfx.js';

export const TXT = { fontFamily: 'monospace', fontStyle: 'bold', stroke: '#000', strokeThickness: 4, resolution: RENDER_ZOOM };

// Botão retangular tocável (aciona ao soltar o dedo, para o toque não "vazar" para a próxima tela).
// Devolve um container com .setEnabled(bool) e .label (texto).
export function makeButton(scene, x, y, w, h, label, color, onTap, opts = {}) {
  const c = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, color, opts.alpha ?? 0.95).setStrokeStyle(2, opts.stroke ?? 0xffffff);
  const t = scene.add.text(0, 0, label, { ...TXT, fontSize: `${opts.size || 13}px`, color: opts.textColor || '#ffffff', strokeThickness: 3, align: 'center' }).setOrigin(0.5);
  c.add([bg, t]);
  c.bg = bg;
  c.label = t;
  c.enabled = true;
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => { if (c.enabled) bg.setFillStyle(color, 0.6); });
  bg.on('pointerout', () => bg.setFillStyle(color, opts.alpha ?? 0.95));
  bg.on('pointerup', () => {
    bg.setFillStyle(color, opts.alpha ?? 0.95);
    if (!c.enabled || !c.visible || (c.parentContainer && !c.parentContainer.visible)) return;
    Sfx.click();
    onTap();
  });
  c.setEnabled = (on) => { c.enabled = on; c.setAlpha(on ? 1 : 0.35); return c; };
  if (opts.pulse) scene.tweens.add({ targets: c, scaleX: 1.04, scaleY: 1.08, duration: 620, yoyo: true, repeat: -1 });
  return c;
}

export function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Agradecimento quando o jogador volta do site do Senado + convite para compartilhar.
export function showThanks(scene, onShare) {
  const t = scene.add.container(400, 196).setDepth(120);
  t.add(scene.add.rectangle(0, 0, 440, 118, 0x0e2412, 0.97).setStrokeStyle(3, 0xffd23f));
  t.add(scene.add.text(0, -38, 'OBRIGADO POR APOIAR O IBAMA!', { ...TXT, fontSize: '16px', color: '#ffd23f' }).setOrigin(0.5));
  t.add(scene.add.text(0, -14, 'Cada voto conta. Chame mais 3 pessoas para votar SIM.', { ...TXT, fontSize: '11px', color: '#ffffff', strokeThickness: 3 }).setOrigin(0.5));
  const close = () => { if (t.active) t.destroy(); };
  t.add(makeButton(scene, -82, 26, 180, 34, 'COMPARTILHAR', 0x2f74c0, onShare, { size: 13 }));
  t.add(makeButton(scene, 112, 26, 120, 34, 'FECHAR', 0x3a4a3a, close, { size: 12 }));
  scene.time.delayedCall(12000, close);
  return t;
}
