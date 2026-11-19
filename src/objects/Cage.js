import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';
import { Sfx } from '../audio/Sfx.js';
import { ts, setBodyLogical } from '../config/assets.js';
import FreedAnimal from './FreedAnimal.js';

export const ANIMAL_NAMES = ['ARARA', 'ONÇA', 'MACACO', 'PEIXE-BOI'];
const DROPS = [0, 1, 2, 3, 4, 5]; // frames de powerups_hrf: H, R, F, medkit, açaí, abacaxi

// Gaiola com animal silvestre: ao ser destruída por tiros/bombas, liberta o animal e dropa um bônus.
export default class Cage extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, animal) {
    super(scene, x, y, 'wildlife_cages', animal * 2);
    scene.add.existing(this);
    scene.cages.add(this);
    this.setOrigin(0.5, 1).setDepth(DEPTH.world + 1).setScale(ts('wildlife_cages'));
    this.body.setAllowGravity(false).setImmovable(true);
    setBodyLogical(this, 56, 52, 4, 10);
    this.animal = animal;
    this.hp = 30;
    this.isTarget = true;
  }

  takeDamage(dmg) {
    if (!this.isTarget) return;
    this.hp -= dmg;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    if (this.hp <= 0) this.breakOpen();
  }

  breakOpen() {
    this.isTarget = false;
    const scene = this.scene;
    Sfx.rescue();
    scene.addScore(500, this.x, this.y - 70, `${ANIMAL_NAMES[this.animal]} RESGATADA! +500`);
    scene.spawnExplosion(this.x, this.y - 30, 0.6, false);
    scene.fx.debris(this.x, this.y - 30, 0x8c5a2b, 12);

    new FreedAnimal(scene, this.x, this.y, this.animal); // movimento próprio de cada animal
    scene.spawnPickup(this.x, this.y - 40, Phaser.Utils.Array.GetRandom(DROPS));
    this.destroy();
  }
}
