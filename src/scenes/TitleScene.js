import Phaser from 'phaser';
import { GAME_W, GAME_H, RENDER_ZOOM } from '../config/constants.js';
import { MISSIONS } from '../config/missions.js';
import { ts } from '../config/assets.js';
import { Sfx, Music, unlockAudio } from '../audio/Sfx.js';
import { DISCLAIMER } from '../config/links.js';

const TXT = { fontFamily: 'monospace', fontStyle: 'bold', stroke: '#141812', strokeThickness: 4, resolution: RENDER_ZOOM };

// Capa do jogo: arte gerada por tools/build_icons.py (title_cover). Qualquer toque/tecla abre o mapa de missões.
export default class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    this.cameras.main.setZoom(RENDER_ZOOM).centerOn(GAME_W / 2, GAME_H / 2);
    const cover = this.add.image(GAME_W / 2, GAME_H / 2, 'title_cover').setScale(ts('title_cover'));
    if (cover.displayWidth < GAME_W) cover.setDisplaySize(GAME_W, GAME_H);

    const touch = this.sys.game.device.input.touch;
    const start = this.add.text(GAME_W * 0.62, GAME_H * 0.9, touch ? 'TOQUE PARA COMEÇAR' : 'APERTE QUALQUER TECLA',
      { ...TXT, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
    this.add.text(GAME_W * 0.62, GAME_H * 0.42, `${MISSIONS.length} MISSÕES • RESGATE OS ANIMAIS • EMBARGUE O GARIMPO`,
      { ...TXT, fontSize: '11px', color: '#9cff57', strokeThickness: 3 }).setOrigin(0.5);

    // eslint-disable-next-line no-undef
    this.add.text(GAME_W - 6, GAME_H - 4, `versão build ${typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev'}`,
      { ...TXT, fontSize: '9px', color: '#ffffff', strokeThickness: 2 }).setOrigin(1, 1).setAlpha(0.7);

    this.add.text(6, GAME_H - 4, DISCLAIMER, { ...TXT, fontSize: '9px', color: '#ffffff', strokeThickness: 2 }).setOrigin(0, 1).setAlpha(0.7);
    Music.play('title');

    this.started = false;
    const go = () => {
      if (this.started) return;
      this.started = true;
      unlockAudio();
      Sfx.pickup();
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MapScene'));
    };
    this.time.delayedCall(250, () => {          // evita que o toque que abriu o app já comece o jogo
      this.input.on('pointerdown', go);
      this.input.keyboard.on('keydown', go);
    });
  }
}
