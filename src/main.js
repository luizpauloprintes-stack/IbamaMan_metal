import Phaser from 'phaser';
import { GAME_W, GAME_H, GRAVITY_Y } from './config/constants.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#1b1408',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: GRAVITY_Y }, debug: false }
  },
  input: { activePointers: 3 },
  scene: [BootScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);
// Gancho para testes automatizados/depuração no navegador.
window.__IBAMAMAN__ = game;
