import Phaser from 'phaser';
import { GAME_W, GAME_H, GRAVITY_Y, RENDER_ZOOM } from './config/constants.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import MapScene from './scenes/MapScene.js';
import PecScene from './scenes/PecScene.js';
import { hookPecReturn } from './systems/Pec.js';
import { onBackButton, exitApp } from './systems/Native.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W * RENDER_ZOOM,   // resolução real do canvas (lógica 800x450 x zoom)
  height: GAME_H * RENDER_ZOOM,
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
  scene: [BootScene, TitleScene, MapScene, GameScene, UIScene, PecScene]
};

const game = new Phaser.Game(config);
hookPecReturn(game); // volta do site do Senado -> agradecimento + compartilhar
// botão Voltar do Android: no jogo pausa; no mapa volta à capa; na capa fecha o app
onBackButton(() => {
  const active = (k) => game.scene.isActive(k);
  if (active('PecScene')) game.scene.stop('PecScene');
  else if (active('UIScene')) game.scene.getScene('UIScene').togglePause();
  else if (active('MapScene')) game.scene.getScene('MapScene').scene.start('TitleScene');
  else exitApp();
});
// Gancho para testes automatizados/depuração no navegador.
window.__IBAMAMAN__ = game;
