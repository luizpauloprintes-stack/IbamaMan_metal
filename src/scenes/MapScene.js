import Phaser from 'phaser';
import { GAME_W, GAME_H, RENDER_ZOOM } from '../config/constants.js';
import { MISSIONS, CAMPAIGN } from '../config/missions.js';
import { LEVELS } from '../config/levels.js';
import { PEC, DISCLAIMER } from '../config/links.js';
import { Save } from '../systems/Save.js';
import { openPec, shareGame } from '../systems/Pec.js';
import { Music, unlockAudio } from '../audio/Sfx.js';
import { TXT, makeButton, showThanks } from '../ui/widgets.js';

// Mapa de missões: escolhe a missão, mostra estrelas/recordes, liga o modo difícil
// e mantém o convite para apoiar a PEC 13/2022 sempre à vista.
export default class MapScene extends Phaser.Scene {
  constructor() { super('MapScene'); }

  create(data = {}) {
    this.cameras.main.setZoom(RENDER_ZOOM).centerOn(GAME_W / 2, GAME_H / 2);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    Music.play('title');
    this.input.on('pointerdown', () => unlockAudio());
    const S = Save.get();

    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'bg_restored');
    bg.setScale(Math.max(GAME_W / bg.width, GAME_H / bg.height));
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x06100a, 0.72);

    this.add.text(20, 14, 'MAPA DE MISSÕES', { ...TXT, fontSize: '22px', color: '#ffd23f', strokeThickness: 5 });
    const total = CAMPAIGN.length * 3;
    this.add.text(GAME_W - 20, 14, `★ ${Save.totalStars()}/${total}`, { ...TXT, fontSize: '20px', color: '#ffc81a' }).setOrigin(1, 0);
    this.add.text(GAME_W - 20, 38, `RECORDE: ${S.highScore}`, { ...TXT, fontSize: '11px', color: '#ffffff', strokeThickness: 3 }).setOrigin(1, 0);

    // cartões das missões
    const W = 178; const H = 172; const top = 60;
    MISSIONS.forEach((m, i) => {
      const x = 106 + i * 196;
      this.missionCard(m, x, top, W, H, S);
    });

    // modo difícil (liberado ao terminar a campanha)
    if (S.campaignDone) {
      const hb = makeButton(this, 112, 252, 200, 28, '', S.hard ? 0x8a1f1f : 0x3a4a3a, () => {
        Save.set({ hard: !Save.get().hard });
        this.scene.restart();
      }, { size: 12 });
      hb.label.setText(`MODO DIFÍCIL: ${S.hard ? 'ON' : 'OFF'}`);
    }
    makeButton(this, GAME_W - 112, 252, 200, 28, 'COMPARTILHAR O JOGO', 0x2f74c0, () => shareGame(this, null), { size: 12 });

    // convite da PEC
    const lead = data.campaignDone
      ? 'Você protegeu a Amazônia no jogo. Agora proteja o Ibama de verdade:'
      : PEC.status;
    this.add.rectangle(GAME_W / 2, 346, 640, 104, 0x0e2412, 0.94).setStrokeStyle(2, 0x9cff57);
    this.add.text(GAME_W / 2, 310, lead, { ...TXT, fontSize: '13px', color: data.campaignDone ? '#ffd23f' : '#ffffff', strokeThickness: 3 }).setOrigin(0.5);
    makeButton(this, GAME_W / 2, 346, 380, 42, PEC.button, 0x2e8b3a, () => openPec(), { size: 17, pulse: true });
    this.add.text(GAME_W / 2, 380, `${PEC.call} ${PEC.howTo}`, { ...TXT, fontSize: '9px', color: '#bbbbbb', strokeThickness: 2 }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 438, DISCLAIMER, { ...TXT, fontSize: '9px', color: '#999999', strokeThickness: 2 }).setOrigin(0.5);

    if (data.campaignDone) {
      const b = this.add.text(GAME_W / 2, 412, 'CAMPANHA CONCLUÍDA! MODO DIFÍCIL LIBERADO', { ...TXT, fontSize: '14px', color: '#ffd23f' }).setOrigin(0.5);
      this.tweens.add({ targets: b, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    }

    const onPecReturn = () => showThanks(this, () => shareGame(this, null));
    this.game.events.on('pec-return', onPecReturn);
    this.events.once('shutdown', () => this.game.events.off('pec-return', onPecReturn));
    // teclado: 1–4 escolhe a missão liberada
    this.input.keyboard.on('keydown', (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= Save.get().unlocked && LEVELS[n]) this.startMission(n);
      if (e.key === 'p' || e.key === 'P') openPec();
    });
  }

  missionCard(m, x, top, w, h, S) {
    const unlocked = m.playable && m.id <= S.unlocked;
    const c = this.add.container(x, top);
    const frame = this.add.rectangle(0, h / 2, w, h, 0x141812, 0.95).setStrokeStyle(2, unlocked ? 0xffd23f : 0x555555);
    c.add(frame);
    // miniatura do cenário (recorte central)
    const key = LEVELS[m.id] ? LEVELS[m.id].bg : 'bg_m1';
    const img = this.add.image(0, 0, key).setOrigin(0.5, 0);
    const src = this.textures.get(key).getSourceImage();
    const s = 84 / src.height;
    const cw = Math.min(src.width, (w - 8) / s);
    img.setCrop((src.width - cw) / 2, 0, cw, src.height).setScale(s).setPosition(-((src.width - cw) / 2 + cw / 2 - src.width / 2) * s, 4);
    if (!unlocked) img.setTint(0x444444);
    c.add(img);
    c.add(this.add.text(0, 96, `MISSÃO ${m.id}`, { ...TXT, fontSize: '12px', color: unlocked ? '#ffd23f' : '#888888', strokeThickness: 3 }).setOrigin(0.5));
    c.add(this.add.text(0, 112, m.title, { ...TXT, fontSize: '11px', color: unlocked ? '#ffffff' : '#888888', strokeThickness: 3, align: 'center', wordWrap: { width: w - 10 } }).setOrigin(0.5, 0));
    const stars = Save.starsOf(m.id);
    stars.forEach((v, i) => c.add(this.add.text((i - 1) * 24, 138, '★', { ...TXT, fontSize: '18px', color: v ? '#ffc81a' : '#4a4a40', strokeThickness: 3 }).setOrigin(0.5, 0)));
    const best = S.best[m.id];
    c.add(this.add.text(0, h - 2, unlocked ? (best ? `recorde ${best}` : 'toque para jogar') : 'BLOQUEADA', { ...TXT, fontSize: '9px', color: unlocked ? '#cccccc' : '#888888', strokeThickness: 2 }).setOrigin(0.5, 1));
    if (unlocked) {
      frame.setInteractive({ useHandCursor: true });
      frame.on('pointerup', () => this.startMission(m.id));
      if (m.id === S.unlocked && !S.stars[m.id]) {
        // próxima missão a jogar pisca
        this.tweens.add({ targets: frame, alpha: 0.6, duration: 500, yoyo: true, repeat: -1 });
      }
    }
  }

  startMission(id) {
    if (this.starting) return;
    this.starting = true;
    unlockAudio();
    Music.stop();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene', { mission: id }));
  }
}
