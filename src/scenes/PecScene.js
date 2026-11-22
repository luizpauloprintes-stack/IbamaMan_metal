import Phaser from 'phaser';
import { GAME_W, GAME_H, RENDER_ZOOM } from '../config/constants.js';
import { PEC, DISCLAIMER, openExternal } from '../config/links.js';
import { openPec } from '../systems/Pec.js';
import { TXT, makeButton } from '../ui/widgets.js';

// Tela "O QUE É A PEC 13/2022?" aberta por cima de qualquer cena (mapa, pausa, resultado, game over).
// Explica a proposta e o passo a passo ANTES de mandar o jogador para a consulta pública do Senado.
export default class PecScene extends Phaser.Scene {
  constructor() { super('PecScene'); }

  create() {
    this.cameras.main.setZoom(RENDER_ZOOM).centerOn(GAME_W / 2, GAME_H / 2);
    this.scene.bringToTop();
    // fundo que bloqueia os toques nas cenas de baixo
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x06100a, 0.96).setInteractive();

    this.add.text(GAME_W / 2, 30, PEC.info_title, { ...TXT, fontSize: '24px', color: '#ffd23f', strokeThickness: 5 }).setOrigin(0.5);

    // o que é
    const L = { x: 214, w: 380, top: 56, h: 262 };
    this.add.rectangle(L.x, L.top + L.h / 2, L.w, L.h, 0x0e2412, 0.95).setStrokeStyle(2, 0x9cff57);
    let y = L.top + 12;
    PEC.points.forEach((p, i) => {
      const last = i === PEC.points.length - 1;
      const t = this.add.text(L.x - L.w / 2 + 16, y, `• ${p}`, {
        ...TXT, fontSize: '12px', color: last ? '#ff9f1a' : '#ffffff', strokeThickness: 3, wordWrap: { width: L.w - 30 }, lineSpacing: 2
      });
      y += t.height + 9;
    });

    // como apoiar
    const R = { x: 596, w: 360, top: 56, h: 262 };
    this.add.rectangle(R.x, R.top + R.h / 2, R.w, R.h, 0x14200f, 0.95).setStrokeStyle(2, 0xffd23f);
    this.add.text(R.x, R.top + 16, 'COMO APOIAR (1 MINUTO)', { ...TXT, fontSize: '14px', color: '#ffd23f' }).setOrigin(0.5);
    y = R.top + 36;
    PEC.steps.forEach((s, i) => {
      this.add.circle(R.x - R.w / 2 + 24, y + 9, 11, 0x2e8b3a).setStrokeStyle(2, 0xffffff);
      this.add.text(R.x - R.w / 2 + 24, y + 9, String(i + 1), { ...TXT, fontSize: '12px', color: '#ffffff', strokeThickness: 2 }).setOrigin(0.5);
      const t = this.add.text(R.x - R.w / 2 + 44, y, s, { ...TXT, fontSize: '12px', color: '#ffffff', strokeThickness: 3, wordWrap: { width: R.w - 60 }, lineSpacing: 2 });
      y += Math.max(26, t.height + 12);
    });
    this.add.text(R.x, R.top + R.h - 12, PEC.note, { ...TXT, fontSize: '10px', color: '#a0b0a0', strokeThickness: 2, align: 'center', wordWrap: { width: R.w - 24 } }).setOrigin(0.5, 1);

    // ações
    makeButton(this, 250, 352, 360, 46, 'IR PARA A VOTAÇÃO ›', 0x2e8b3a, () => openPec(), { size: 18, pulse: true });
    makeButton(this, 524, 352, 150, 38, 'SAIBA MAIS', 0x2f74c0, () => openExternal(PEC.info), { size: 13 });
    makeButton(this, 690, 352, 160, 38, 'VOLTAR AO JOGO', 0x3a4a3a, () => this.close(), { size: 12 });
    this.add.text(524, 378, 'página da PEC no Senado', { ...TXT, fontSize: '9px', color: '#bbbbbb', strokeThickness: 2 }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 438, DISCLAIMER, { ...TXT, fontSize: '9px', color: '#888888', strokeThickness: 2 }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-ENTER', () => openPec());
    this.cameras.main.fadeIn(180, 0, 0, 0);
  }

  close() { this.scene.stop(); }
}

// Abre a tela da PEC por cima da cena atual (se já estiver aberta, não faz nada).
export function showPecInfo(scene) {
  if (scene.scene.isActive('PecScene')) return;
  scene.scene.launch('PecScene');
}
