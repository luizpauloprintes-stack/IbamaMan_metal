import Phaser from 'phaser';
import { SPRITE_MANIFEST } from '../config/assets.js';
import { generatePlaceholders } from '../gfx/placeholders.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // PNGs reais (opcionais). Se um arquivo listado não existir, o placeholder procedural é usado.
    this.load.on('loaderror', (file) => console.warn('[Boot] sprite ausente, usando placeholder:', file.key));
    SPRITE_MANIFEST.forEach((s) => {
      const url = `assets/sprites/${s.file}`;
      if (s.frameWidth) this.load.spritesheet(s.key, url, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      else this.load.image(s.key, url);
    });
  }

  create() {
    generatePlaceholders(this);
    this.createAnimations();
    this.scene.start('TitleScene');
  }

  createAnimations() {
    const a = this.anims;
    const range = (key, start, end) => a.generateFrameNumbers(key, { start, end });
    a.create({ key: 'player-run', frames: range('player_run', 0, 4), frameRate: 12, repeat: -1 });
    a.create({ key: 'player-shoot', frames: range('player_shoot', 0, 4), frameRate: 14, repeat: -1 });
    a.create({ key: 'player-throw', frames: range('player_bomb_win', 0, 4), frameRate: 20, repeat: 0 });
    a.create({ key: 'player-win', frames: range('player_bomb_win', 5, 9), frameRate: 6, repeat: -1 });
    // passadas e movimentos gerados por tools/build_motion.py (rig de recorte, 8 quadros por ciclo)
    const cyc = (key, from, n = 8) => a.generateFrameNumbers(key, { start: from, end: from + n - 1 });
    a.create({ key: 'miner-walk', frames: cyc('enemy_miner_walk', 0), frameRate: 12, repeat: -1 });
    a.create({ key: 'logger-walk', frames: cyc('enemy_logger_walk', 0), frameRate: 12, repeat: -1 });
    a.create({ key: 'baron-walk', frames: cyc('boss_baron_walk', 0), frameRate: 11, repeat: -1 });
    a.create({ key: 'baron-walk-rage', frames: cyc('boss_baron_walk', 8), frameRate: 13, repeat: -1 });
    ['free-macaw', 'free-jaguar', 'free-monkey', 'free-manatee'].forEach((k, i) =>
      a.create({ key: k, frames: cyc('animals_free', i * 8), frameRate: [16, 18, 14, 10][i], repeat: -1 }));
    a.create({ key: 'miner-spray', frames: range('enemy_miner_hose', 1, 2), frameRate: 10, repeat: 3 });
    a.create({ key: 'logger-attack', frames: range('enemy_logger', 0, 1), frameRate: 6, repeat: -1 });
    a.create({ key: 'fx-explosion', frames: range('fx_explosion', 0, 9), frameRate: 22, repeat: 0 });
  }
}
